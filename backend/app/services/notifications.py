"""
Notification service for SMS and email delivery.

Handles:
- Queueing notifications
- Sending via Twilio (SMS) and SendGrid (Email)
- Failure handling and fallback logic
- Quiet hours checking
- Preference management
"""

import logging
from datetime import datetime, timedelta, time as datetime_time
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.models.notification import NotificationPreferences, NotificationQueue
from app.config import settings

logger = logging.getLogger(__name__)

# Twilio and SendGrid will be imported conditionally to avoid errors if not configured
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio not available - pip install twilio")

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logger.warning("SendGrid not available - pip install sendgrid")


def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreferences:
    """
    Get user's notification preferences or create default ones.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        NotificationPreferences object
    """
    prefs = db.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == user_id
    ).first()

    if not prefs:
        prefs = NotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return prefs


def queue_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    message: str,
    priority: str = 'normal',
    channel: str = 'both',
    subject: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    scheduled_for: Optional[datetime] = None
) -> Optional[NotificationQueue]:
    """
    Queue a notification for delivery.

    Args:
        db: Database session
        user_id: User ID to notify
        notification_type: Type of notification (match_request, match_accepted, etc.)
        message: Notification message
        priority: Priority level ('critical', 'high', 'normal')
        channel: Delivery channel ('sms', 'email', 'both')
        subject: Email subject line (required for email)
        metadata: Additional data (match_id, etc.)
        scheduled_for: When to send (defaults to now)

    Returns:
        NotificationQueue object or None if user has notifications disabled
    """
    # Get user preferences
    prefs = get_or_create_preferences(db, user_id)

    # Check if user wants this type of notification
    should_notify = True
    if notification_type in ['match_request', 'challenge_received']:
        should_notify = prefs.notify_match_requests
    elif notification_type in ['match_accepted', 'match_declined', 'challenge_response']:
        should_notify = prefs.notify_match_responses
    elif notification_type in ['match_reminder_24h', 'match_reminder_2h']:
        should_notify = prefs.notify_reminders
    elif notification_type in ['match_canceled', 'challenge_canceled']:
        should_notify = prefs.notify_cancellations

    if not should_notify:
        logger.info(f"User {user_id} has disabled {notification_type} notifications")
        return None

    # Adjust channel based on user preferences
    if channel == 'both' or channel == 'sms':
        if not prefs.sms_opt_in:
            channel = 'email' if channel == 'both' else None

    if channel == 'both' or channel == 'email':
        if not prefs.email_enabled:
            channel = 'sms' if channel == 'both' else None

    if not channel:
        logger.info(f"User {user_id} has all notification channels disabled")
        return None

    # Default scheduled_for to now
    if not scheduled_for:
        scheduled_for = datetime.now(datetime.now().astimezone().tzinfo)

    # Check quiet hours for non-critical notifications
    if priority != 'critical' and prefs.quiet_hours_enabled:
        scheduled_for = check_and_reschedule_for_quiet_hours(prefs, scheduled_for)

    # Create notification
    notification = NotificationQueue(
        user_id=user_id,
        notification_type=notification_type,
        priority=priority,
        channel=channel,
        subject=subject,
        message=message,
        metadata=metadata,
        scheduled_for=scheduled_for
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(f"Queued {notification_type} notification for user {user_id} (ID: {notification.id})")
    return notification


def check_and_reschedule_for_quiet_hours(
    prefs: NotificationPreferences,
    scheduled_for: datetime
) -> datetime:
    """
    Check if scheduled time falls in quiet hours and reschedule if needed.

    Args:
        prefs: User's notification preferences
        scheduled_for: Original scheduled time

    Returns:
        Adjusted scheduled time (after quiet hours if needed)
    """
    if not prefs.quiet_hours_enabled:
        return scheduled_for

    # Convert to time for comparison
    scheduled_time = scheduled_for.time()
    quiet_start = prefs.quiet_hours_start
    quiet_end = prefs.quiet_hours_end

    # Handle cases where quiet hours span midnight
    if quiet_start > quiet_end:
        # Example: 22:00 - 07:00
        in_quiet_hours = scheduled_time >= quiet_start or scheduled_time < quiet_end
        if in_quiet_hours:
            # Schedule for quiet_end
            scheduled_for = scheduled_for.replace(
                hour=quiet_end.hour,
                minute=quiet_end.minute,
                second=0,
                microsecond=0
            )
            # If that's in the past, add a day
            if scheduled_for < datetime.now(scheduled_for.tzinfo):
                scheduled_for += timedelta(days=1)
    else:
        # Example: 22:00 - 22:00 (disabled) or invalid range
        in_quiet_hours = quiet_start <= scheduled_time < quiet_end
        if in_quiet_hours:
            scheduled_for = scheduled_for.replace(
                hour=quiet_end.hour,
                minute=quiet_end.minute,
                second=0,
                microsecond=0
            )

    return scheduled_for


def send_sms(to_number: str, message: str) -> tuple[bool, Optional[str]]:
    """
    Send SMS via Twilio.

    Args:
        to_number: Phone number to send to (E.164 format)
        message: Message to send

    Returns:
        Tuple of (success: bool, error_message: str | None)
    """
    if not TWILIO_AVAILABLE:
        logger.error("Twilio library not available")
        return False, "Twilio not configured"

    if not hasattr(settings, 'TWILIO_ACCOUNT_SID') or not settings.TWILIO_ACCOUNT_SID:
        logger.error("Twilio credentials not configured")
        return False, "Twilio not configured"

    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        message_obj = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_number
        )

        logger.info(f"SMS sent successfully: {message_obj.sid}")
        return True, None

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send SMS to {to_number}: {error_msg}")
        return False, error_msg


def send_email(to_email: str, subject: str, body: str) -> tuple[bool, Optional[str]]:
    """
    Send email via SendGrid.

    Args:
        to_email: Email address to send to
        subject: Email subject
        body: Email body (plain text)

    Returns:
        Tuple of (success: bool, error_message: str | None)
    """
    if not SENDGRID_AVAILABLE:
        logger.error("SendGrid library not available")
        return False, "SendGrid not configured"

    if not hasattr(settings, 'SENDGRID_API_KEY') or not settings.SENDGRID_API_KEY:
        logger.error("SendGrid API key not configured")
        return False, "SendGrid not configured"

    try:
        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body
        )

        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)

        logger.info(f"Email sent successfully to {to_email}: {response.status_code}")
        return True, None

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email to {to_email}: {error_msg}")
        return False, error_msg


def process_notification_queue(db: Session) -> int:
    """
    Process pending notifications in the queue.

    This function is called by the background job every minute.
    It finds all notifications ready to send and attempts delivery.

    Args:
        db: Database session

    Returns:
        Number of notifications processed
    """
    now = datetime.now(datetime.now().astimezone().tzinfo)

    # Find pending notifications
    pending = db.query(NotificationQueue).filter(
        and_(
            NotificationQueue.scheduled_for <= now,
            NotificationQueue.sent_at.is_(None),
            NotificationQueue.failed_at.is_(None)
        )
    ).all()

    processed_count = 0

    for notification in pending:
        try:
            # Get user
            user = db.query(User).filter(User.id == notification.user_id).first()
            if not user:
                notification.failed_at = now
                notification.failure_reason = "User not found"
                db.commit()
                continue

            # Get preferences
            prefs = get_or_create_preferences(db, user.id)

            success = False
            error_message = None

            # Try SMS first if requested
            if notification.channel in ['sms', 'both']:
                if user.phone and prefs.sms_opt_in:
                    sms_success, sms_error = send_sms(user.phone, notification.message)
                    if sms_success:
                        success = True
                        notification.channel = 'sms'  # Mark which channel succeeded
                    else:
                        error_message = sms_error
                        # Try email fallback if both channels requested
                        if notification.channel == 'both' and prefs.email_enabled:
                            email_success, email_error = send_email(
                                user.email,
                                notification.subject or "Pickleball League Notification",
                                notification.message
                            )
                            if email_success:
                                success = True
                                notification.fallback_sent = True
                                notification.channel = 'email'
                            else:
                                error_message = f"SMS: {sms_error}, Email: {email_error}"

            # Try email if not sent via SMS
            if not success and notification.channel in ['email', 'both']:
                if prefs.email_enabled:
                    email_success, email_error = send_email(
                        user.email,
                        notification.subject or "Pickleball League Notification",
                        notification.message
                    )
                    if email_success:
                        success = True
                        notification.channel = 'email'
                    else:
                        error_message = error_message or email_error

            # Update notification status
            if success:
                notification.sent_at = now
                logger.info(f"Sent notification {notification.id} to user {user.id}")
            else:
                notification.failed_at = now
                notification.failure_reason = error_message
                logger.error(f"Failed to send notification {notification.id}: {error_message}")

                # Handle failures
                if notification.channel in ['sms', 'both'] and 'SMS' in (error_message or ''):
                    handle_sms_failure(db, prefs, error_message)
                if notification.channel in ['email', 'both'] and 'Email' in (error_message or ''):
                    handle_email_failure(db, prefs, error_message)

            processed_count += 1

        except Exception as e:
            logger.error(f"Error processing notification {notification.id}: {e}", exc_info=True)
            notification.failed_at = now
            notification.failure_reason = f"Processing error: {str(e)}"

        db.commit()

    if processed_count > 0:
        logger.info(f"Processed {processed_count} notifications")

    return processed_count


def handle_sms_failure(db: Session, prefs: NotificationPreferences, error_message: str):
    """
    Handle SMS delivery failure.

    Increments failure counter and disables SMS if threshold reached.

    Args:
        db: Database session
        prefs: User's notification preferences
        error_message: Error message from Twilio
    """
    prefs.last_sms_failure_at = datetime.now(datetime.now().astimezone().tzinfo)
    prefs.sms_consecutive_failures += 1

    # Disable SMS after 3 consecutive failures
    if prefs.sms_consecutive_failures >= 3:
        prefs.sms_opt_in = False
        logger.warning(f"Disabled SMS for user {prefs.user_id} after {prefs.sms_consecutive_failures} failures")

        # Queue an email notification about SMS being disabled
        queue_notification(
            db,
            prefs.user_id,
            'sms_disabled',
            f"SMS notifications have been disabled due to delivery issues: {error_message}. Please update your phone number if it has changed.",
            priority='high',
            channel='email',
            subject='SMS Notifications Disabled'
        )

    db.commit()


def handle_email_failure(db: Session, prefs: NotificationPreferences, error_message: str):
    """
    Handle email delivery failure.

    Disables email on hard bounces.

    Args:
        db: Database session
        prefs: User's notification preferences
        error_message: Error message from SendGrid
    """
    prefs.last_email_failure_at = datetime.now(datetime.now().astimezone().tzinfo)

    # Check if it's a hard bounce (permanent failure)
    hard_bounce_indicators = ['invalid', 'not exist', 'bounced', 'rejected']
    is_hard_bounce = any(indicator in error_message.lower() for indicator in hard_bounce_indicators)

    if is_hard_bounce:
        prefs.email_enabled = False
        logger.warning(f"Disabled email for user {prefs.user_id} due to hard bounce: {error_message}")

    db.commit()


def schedule_match_reminders(db: Session, match_id: int, user_id: int, match_start_time: datetime):
    """
    Schedule 24h and 2h reminders for a confirmed match.

    Args:
        db: Database session
        match_id: Match ID
        user_id: User ID to send reminders to
        match_start_time: Match start time
    """
    # 24 hour reminder
    reminder_24h_time = match_start_time - timedelta(hours=24)
    if reminder_24h_time > datetime.now(match_start_time.tzinfo):
        queue_notification(
            db,
            user_id,
            'match_reminder_24h',
            f"Reminder: You have a match tomorrow at {match_start_time.strftime('%I:%M %p')}",
            priority='high',
            channel='both',
            subject='Match Reminder - 24 Hours',
            metadata={'match_id': match_id},
            scheduled_for=reminder_24h_time
        )

    # 2 hour reminder
    reminder_2h_time = match_start_time - timedelta(hours=2)
    if reminder_2h_time > datetime.now(match_start_time.tzinfo):
        queue_notification(
            db,
            user_id,
            'match_reminder_2h',
            f"Reminder: Your match starts in 2 hours at {match_start_time.strftime('%I:%M %p')}",
            priority='critical',  # Critical so it ignores quiet hours
            channel='both',
            subject='Match Reminder - 2 Hours',
            metadata={'match_id': match_id},
            scheduled_for=reminder_2h_time
        )


def cancel_match_reminders(db: Session, match_id: int):
    """
    Cancel pending reminders for a match that was canceled.

    Args:
        db: Database session
        match_id: Match ID
    """
    # Delete unsent reminders
    deleted_count = db.query(NotificationQueue).filter(
        and_(
            NotificationQueue.metadata['match_id'].astext == str(match_id),
            NotificationQueue.notification_type.in_(['match_reminder_24h', 'match_reminder_2h']),
            NotificationQueue.sent_at.is_(None),
            NotificationQueue.failed_at.is_(None)
        )
    ).delete(synchronize_session=False)

    db.commit()

    if deleted_count > 0:
        logger.info(f"Canceled {deleted_count} reminder(s) for match {match_id}")

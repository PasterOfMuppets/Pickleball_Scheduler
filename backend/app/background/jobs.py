"""
Background jobs for the Pickleball Scheduler.

Uses APScheduler to run periodic tasks:
- Block generation (nightly at 2 AM league time)
- Challenge expiration check (every 5 minutes)
- Vacation end check (daily at midnight league time)
- Cleanup jobs (weekly)
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime

from app.database import SessionLocal
from app.services.matches import check_expiration
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = AsyncIOScheduler()


def check_expired_challenges():
    """
    Background job to check for expired challenges.
    Runs every 5 minutes.

    Sets status='expired' for pending challenges that meet expiration criteria:
    - 48 hours passed since creation
    - 2 hours before match start_time
    - Current time > start_time (too late)
    """
    logger.info("Running expired challenges check...")
    db = SessionLocal()
    try:
        count = check_expiration(db)
        if count > 0:
            logger.info(f"Expired {count} challenges")
        else:
            logger.debug("No challenges expired")
    except Exception as e:
        logger.error(f"Error checking expired challenges: {e}")
    finally:
        db.close()


def generate_availability_blocks():
    """
    Background job to generate availability blocks for all users.
    Runs nightly at 2 AM league time.

    Generates blocks for current week + next week (2-week window).
    """
    logger.info("Running availability block generation...")
    # TODO: Implement block generation logic (from Phase 2)
    # This will be implemented when we add the availability service
    logger.info("Block generation completed")


def check_vacation_end():
    """
    Background job to check for users whose vacation has ended.
    Runs daily at midnight league time.

    Auto-reverts status to 'active' for users where vacation_until has passed.
    """
    logger.info("Running vacation end check...")
    db = SessionLocal()
    try:
        from app.models.user import User
        from app.utils.timezone import get_current_league_time

        today = get_current_league_time().date()

        # Find users whose vacation_until is in the past
        users_to_reactivate = db.query(User).filter(
            User.status == 'vacation',
            User.vacation_until < today
        ).all()

        for user in users_to_reactivate:
            user.status = 'active'
            user.vacation_until = None
            logger.info(f"Reactivated user {user.id} ({user.name}) from vacation")

        if users_to_reactivate:
            db.commit()
            logger.info(f"Reactivated {len(users_to_reactivate)} users from vacation")
        else:
            logger.debug("No users to reactivate from vacation")

    except Exception as e:
        logger.error(f"Error checking vacation end: {e}")
        db.rollback()
    finally:
        db.close()


def process_notifications():
    """
    Background job to process pending notifications.
    Runs every minute.

    Processes all notifications in the queue that are ready to send.
    """
    logger.info("Processing notification queue...")
    db = SessionLocal()
    try:
        from app.services.notifications import process_notification_queue
        count = process_notification_queue(db)
        if count > 0:
            logger.info(f"Processed {count} notifications")
        else:
            logger.debug("No notifications to process")
    except Exception as e:
        logger.error(f"Error processing notifications: {e}")
    finally:
        db.close()


def cleanup_old_data():
    """
    Background job to clean up old data.
    Runs weekly on Sunday at 3 AM league time.

    - Clean up old notifications (>30 days)
    - Archive old availability blocks (>2 weeks in past)
    """
    logger.info("Running cleanup job...")
    db = SessionLocal()
    try:
        from app.models.notification import NotificationQueue
        from app.models.availability import AvailabilityBlock
        from datetime import datetime, timedelta

        now = datetime.now(datetime.now().astimezone().tzinfo)
        thirty_days_ago = now - timedelta(days=30)
        two_weeks_ago = now - timedelta(weeks=2)

        # Clean up old sent/failed notifications (>30 days)
        deleted_notifications = db.query(NotificationQueue).filter(
            NotificationQueue.scheduled_for < thirty_days_ago
        ).delete(synchronize_session=False)

        # Archive old availability blocks (>2 weeks in past)
        # For now, we'll delete them. In production, you might want to move to an archive table
        deleted_blocks = db.query(AvailabilityBlock).filter(
            AvailabilityBlock.end_time < two_weeks_ago
        ).delete(synchronize_session=False)

        db.commit()

        logger.info(f"Cleanup completed: {deleted_notifications} notifications, {deleted_blocks} availability blocks")

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """
    Start the background job scheduler.
    Should be called on application startup.
    """
    # Challenge expiration check - every 5 minutes
    scheduler.add_job(
        check_expired_challenges,
        trigger=IntervalTrigger(minutes=5),
        id='check_expired_challenges',
        name='Check for expired challenges',
        replace_existing=True
    )

    # Notification processing - every minute
    scheduler.add_job(
        process_notifications,
        trigger=IntervalTrigger(minutes=1),
        id='process_notifications',
        name='Process notification queue',
        replace_existing=True
    )

    # Availability block generation - nightly at 2 AM league time
    # TODO: Adjust timezone to league timezone once we implement proper timezone handling
    scheduler.add_job(
        generate_availability_blocks,
        trigger=CronTrigger(hour=2, minute=0, timezone=settings.LEAGUE_TIMEZONE),
        id='generate_availability_blocks',
        name='Generate availability blocks',
        replace_existing=True
    )

    # Vacation end check - daily at midnight league time
    scheduler.add_job(
        check_vacation_end,
        trigger=CronTrigger(hour=0, minute=0, timezone=settings.LEAGUE_TIMEZONE),
        id='check_vacation_end',
        name='Check vacation end dates',
        replace_existing=True
    )

    # Cleanup old data - weekly on Sunday at 3 AM league time
    scheduler.add_job(
        cleanup_old_data,
        trigger=CronTrigger(day_of_week='sun', hour=3, minute=0, timezone=settings.LEAGUE_TIMEZONE),
        id='cleanup_old_data',
        name='Cleanup old data',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Background job scheduler started")


def shutdown_scheduler():
    """
    Shutdown the background job scheduler.
    Should be called on application shutdown.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background job scheduler stopped")

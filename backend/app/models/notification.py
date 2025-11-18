"""Notification models for preferences and queue."""
from datetime import time
from sqlalchemy import Column, BigInteger, String, Boolean, Text, Time, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationPreferences(Base):
    """
    User notification preferences and delivery status tracking.

    Controls when and how users receive notifications via SMS and email.
    Tracks delivery failures to automatically disable problematic channels.
    """
    __tablename__ = "notification_preferences"

    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)

    # Channel preferences
    email_enabled = Column(Boolean, nullable=False, default=True)
    sms_opt_in = Column(Boolean, nullable=False, default=False)
    sms_opt_in_at = Column(DateTime(timezone=True), nullable=True)

    # What to notify about
    notify_match_requests = Column(Boolean, nullable=False, default=True)
    notify_match_responses = Column(Boolean, nullable=False, default=True)
    notify_reminders = Column(Boolean, nullable=False, default=True)
    notify_cancellations = Column(Boolean, nullable=False, default=True)

    # Quiet hours (times in league timezone)
    quiet_hours_enabled = Column(Boolean, nullable=False, default=True)
    quiet_hours_start = Column(Time, nullable=False, default=time(22, 0))  # 10 PM
    quiet_hours_end = Column(Time, nullable=False, default=time(7, 0))     # 7 AM

    # Delivery status tracking
    last_sms_failure_at = Column(DateTime(timezone=True), nullable=True)
    last_email_failure_at = Column(DateTime(timezone=True), nullable=True)
    sms_consecutive_failures = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()", onupdate="NOW()")

    # Relationships
    user = relationship("User", backref="notification_preferences")

    def __repr__(self):
        return f"<NotificationPreferences(user_id={self.user_id}, email_enabled={self.email_enabled}, sms_opt_in={self.sms_opt_in})>"


class NotificationQueue(Base):
    """
    Queue for outgoing notifications to be processed by background job.

    Notifications are queued with a scheduled_for time and processed by
    a background job every minute. Supports SMS and email channels with
    fallback logic and failure tracking.
    """
    __tablename__ = "notification_queue"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # challenge_received, match_accepted, etc.
    priority = Column(String(20), nullable=False)  # critical | high | normal
    channel = Column(String(10), nullable=False)  # sms | email | both
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    metadata = Column(JSONB, nullable=True)  # Match ID, challenge ID, etc.

    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    fallback_sent = Column(Boolean, nullable=False, default=False)  # SMS→email fallback occurred

    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Relationships
    user = relationship("User", backref="notifications")

    def __repr__(self):
        return f"<NotificationQueue(id={self.id}, user_id={self.user_id}, type={self.notification_type}, status={'sent' if self.sent_at else 'failed' if self.failed_at else 'pending'})>"

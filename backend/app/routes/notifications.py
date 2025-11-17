"""Notification preference routes."""
from datetime import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.models.notification import NotificationPreferences
from app.utils.auth import get_current_user
from app.services import notifications as notification_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class NotificationPreferencesResponse(BaseModel):
    """User notification preferences."""
    user_id: int
    email_enabled: bool
    sms_opt_in: bool
    sms_opt_in_at: Optional[str] = None
    notify_match_requests: bool
    notify_match_responses: bool
    notify_reminders: bool
    notify_cancellations: bool
    quiet_hours_enabled: bool
    quiet_hours_start: str  # HH:MM format
    quiet_hours_end: str    # HH:MM format
    last_sms_failure_at: Optional[str] = None
    last_email_failure_at: Optional[str] = None
    sms_consecutive_failures: int

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "email_enabled": True,
                "sms_opt_in": True,
                "sms_opt_in_at": "2025-11-17T10:00:00-05:00",
                "notify_match_requests": True,
                "notify_match_responses": True,
                "notify_reminders": True,
                "notify_cancellations": True,
                "quiet_hours_enabled": True,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00",
                "last_sms_failure_at": None,
                "last_email_failure_at": None,
                "sms_consecutive_failures": 0
            }
        }


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences."""
    email_enabled: Optional[bool] = None
    sms_opt_in: Optional[bool] = None
    notify_match_requests: Optional[bool] = None
    notify_match_responses: Optional[bool] = None
    notify_reminders: Optional[bool] = None
    notify_cancellations: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None  # HH:MM format
    quiet_hours_end: Optional[str] = None    # HH:MM format

    class Config:
        json_schema_extra = {
            "example": {
                "email_enabled": True,
                "sms_opt_in": True,
                "notify_match_requests": True,
                "notify_match_responses": True,
                "notify_reminders": True,
                "notify_cancellations": True,
                "quiet_hours_enabled": True,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00"
            }
        }


@router.get("/preferences", response_model=NotificationPreferencesResponse)
@limiter.limit("100/minute")
async def get_notification_preferences(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notification preferences.

    Returns preferences or creates default ones if they don't exist.
    """
    prefs = notification_service.get_or_create_preferences(db, current_user.id)

    # Convert time objects to strings
    return NotificationPreferencesResponse(
        user_id=prefs.user_id,
        email_enabled=prefs.email_enabled,
        sms_opt_in=prefs.sms_opt_in,
        sms_opt_in_at=prefs.sms_opt_in_at.isoformat() if prefs.sms_opt_in_at else None,
        notify_match_requests=prefs.notify_match_requests,
        notify_match_responses=prefs.notify_match_responses,
        notify_reminders=prefs.notify_reminders,
        notify_cancellations=prefs.notify_cancellations,
        quiet_hours_enabled=prefs.quiet_hours_enabled,
        quiet_hours_start=prefs.quiet_hours_start.strftime("%H:%M"),
        quiet_hours_end=prefs.quiet_hours_end.strftime("%H:%M"),
        last_sms_failure_at=prefs.last_sms_failure_at.isoformat() if prefs.last_sms_failure_at else None,
        last_email_failure_at=prefs.last_email_failure_at.isoformat() if prefs.last_email_failure_at else None,
        sms_consecutive_failures=prefs.sms_consecutive_failures
    )


@router.put("/preferences", response_model=NotificationPreferencesResponse)
@limiter.limit("20/minute")
async def update_notification_preferences(
    request: Request,
    updates: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update notification preferences.

    Only provided fields will be updated. Omitted fields remain unchanged.
    """
    prefs = notification_service.get_or_create_preferences(db, current_user.id)

    # Update provided fields
    if updates.email_enabled is not None:
        prefs.email_enabled = updates.email_enabled

    if updates.sms_opt_in is not None:
        prefs.sms_opt_in = updates.sms_opt_in
        if updates.sms_opt_in:
            from datetime import datetime
            prefs.sms_opt_in_at = datetime.now(datetime.now().astimezone().tzinfo)
            # Reset failure counter when re-enabling
            prefs.sms_consecutive_failures = 0

    if updates.notify_match_requests is not None:
        prefs.notify_match_requests = updates.notify_match_requests

    if updates.notify_match_responses is not None:
        prefs.notify_match_responses = updates.notify_match_responses

    if updates.notify_reminders is not None:
        prefs.notify_reminders = updates.notify_reminders

    if updates.notify_cancellations is not None:
        prefs.notify_cancellations = updates.notify_cancellations

    if updates.quiet_hours_enabled is not None:
        prefs.quiet_hours_enabled = updates.quiet_hours_enabled

    if updates.quiet_hours_start is not None:
        try:
            hour, minute = map(int, updates.quiet_hours_start.split(':'))
            prefs.quiet_hours_start = time(hour, minute)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid quiet_hours_start format. Use HH:MM (e.g., 22:00)"
            )

    if updates.quiet_hours_end is not None:
        try:
            hour, minute = map(int, updates.quiet_hours_end.split(':'))
            prefs.quiet_hours_end = time(hour, minute)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid quiet_hours_end format. Use HH:MM (e.g., 07:00)"
            )

    db.commit()
    db.refresh(prefs)

    # Return updated preferences
    return NotificationPreferencesResponse(
        user_id=prefs.user_id,
        email_enabled=prefs.email_enabled,
        sms_opt_in=prefs.sms_opt_in,
        sms_opt_in_at=prefs.sms_opt_in_at.isoformat() if prefs.sms_opt_in_at else None,
        notify_match_requests=prefs.notify_match_requests,
        notify_match_responses=prefs.notify_match_responses,
        notify_reminders=prefs.notify_reminders,
        notify_cancellations=prefs.notify_cancellations,
        quiet_hours_enabled=prefs.quiet_hours_enabled,
        quiet_hours_start=prefs.quiet_hours_start.strftime("%H:%M"),
        quiet_hours_end=prefs.quiet_hours_end.strftime("%H:%M"),
        last_sms_failure_at=prefs.last_sms_failure_at.isoformat() if prefs.last_sms_failure_at else None,
        last_email_failure_at=prefs.last_email_failure_at.isoformat() if prefs.last_email_failure_at else None,
        sms_consecutive_failures=prefs.sms_consecutive_failures
    )

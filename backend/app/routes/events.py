"""Events API endpoints for calendar integrations and external services."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class EventResponse(BaseModel):
    """Response model for events."""
    events: List[dict]
    message: str


@router.get("/bear")
def get_bear_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EventResponse:
    """
    Get events for Bear app or external calendar integrations.

    This endpoint handles requests from external applications or browser extensions
    that may be trying to sync calendar events.

    Returns:
        EventResponse: Empty events list with informational message
    """
    return EventResponse(
        events=[],
        message="Events endpoint is available. Calendar integration features are not yet implemented."
    )


@router.get("")
def get_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EventResponse:
    """
    Get all events for the current user.

    This is a placeholder for future calendar export functionality
    (Google Calendar, Outlook, iCal, etc.)

    Returns:
        EventResponse: Empty events list with informational message
    """
    return EventResponse(
        events=[],
        message="Events endpoint is available. Calendar integration features are not yet implemented."
    )

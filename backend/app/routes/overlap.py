"""
Overlap detection routes for finding players with shared availability.

These routes are rate-limited more aggressively than others since
overlap calculation can be expensive with many users.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.services import overlap as overlap_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class PlayerOverlap(BaseModel):
    """Player with overlap information."""
    user_id: int
    name: str
    email: str
    overlap_hours: float
    overlap_count: int

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 2,
                "name": "Jane Smith",
                "email": "jane@example.com",
                "overlap_hours": 4.5,
                "overlap_count": 3
            }
        }


class TimeSlot(BaseModel):
    """Shared availability time slot."""
    start_time: datetime
    end_time: datetime
    duration_minutes: int

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-11-20T19:00:00-05:00",
                "end_time": "2025-11-20T21:00:00-05:00",
                "duration_minutes": 120
            }
        }


class SharedAvailabilityResponse(BaseModel):
    """Shared availability between two users."""
    user_a_id: int
    user_b_id: int
    week_start: datetime
    week_end: datetime
    slots: List[TimeSlot]

    class Config:
        json_schema_extra = {
            "example": {
                "user_a_id": 1,
                "user_b_id": 2,
                "week_start": "2025-11-17T00:00:00-05:00",
                "week_end": "2025-11-24T00:00:00-05:00",
                "slots": [
                    {
                        "start_time": "2025-11-20T19:00:00-05:00",
                        "end_time": "2025-11-20T21:00:00-05:00",
                        "duration_minutes": 120
                    }
                ]
            }
        }


@router.get("", response_model=List[PlayerOverlap])
@limiter.limit("60/hour")
async def get_overlaps(
    request: Request,
    week_start: Optional[str] = Query(None, description="Week start date (ISO format, defaults to current week)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all players with overlapping availability for the current user.

    This endpoint is rate-limited to 60 requests per hour as overlap
    calculation can be expensive.

    Query parameters:
    - week_start: Optional week start date in ISO format (defaults to current week)

    Returns:
    - List of players with overlap hours, sorted by most overlap first
    - Only includes active players (excludes inactive and vacation)
    - Excludes time slots with existing matches
    """
    # Parse week_start if provided
    week_start_date = None
    if week_start:
        try:
            week_start_date = datetime.fromisoformat(week_start)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid week_start format. Use ISO format (e.g., 2025-11-17T00:00:00-05:00)"
            )

    # Calculate overlaps
    overlaps = overlap_service.calculate_overlaps(
        db,
        user_id=current_user.id,
        week_start_date=week_start_date
    )

    return overlaps


@router.get("/{user_id}", response_model=SharedAvailabilityResponse)
@limiter.limit("60/hour")
async def get_shared_availability(
    request: Request,
    user_id: int,
    week_start: Optional[str] = Query(None, description="Week start date (ISO format, defaults to current week)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get shared availability time slots with a specific player.

    This endpoint shows exactly when both players are available and
    have no conflicting matches.

    Path parameters:
    - user_id: ID of the other player

    Query parameters:
    - week_start: Optional week start date in ISO format (defaults to current week)

    Returns:
    - List of shared availability time slots
    - Slots are conflict-free (no pending/confirmed matches)
    - Sorted by start time
    """
    # Verify other user exists and is active
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if other_user.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not currently active"
        )

    # Parse week_start if provided
    week_start_date = None
    if week_start:
        try:
            week_start_date = datetime.fromisoformat(week_start)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid week_start format. Use ISO format (e.g., 2025-11-17T00:00:00-05:00)"
            )

    # Get shared availability
    shared_data = overlap_service.get_shared_availability(
        db,
        user_a_id=current_user.id,
        user_b_id=user_id,
        week_start_date=week_start_date
    )

    return shared_data

"""Availability routes for recurring patterns and availability blocks."""
from datetime import datetime, time
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.services.availability import AvailabilityService
from app.utils.auth import get_current_user_id
from app.utils.timezone import utc_to_league_time, league_time_to_utc


router = APIRouter(prefix="/api/availability", tags=["availability"])
limiter = Limiter(key_func=get_remote_address)


# ==================== Pydantic Schemas ====================

class RecurringPatternCreate(BaseModel):
    """Schema for creating a recurring availability pattern."""

    day_of_week: int = Field(..., ge=1, le=7, description="1=Monday, 7=Sunday")
    start_time: str = Field(..., description="Start time in HH:MM format (e.g., '19:00')")
    end_time: str = Field(..., description="End time in HH:MM format (e.g., '21:00')")
    enabled: bool = Field(default=True, description="Whether pattern is enabled")

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format."""
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM or HH:MM:SS format")


class RecurringPatternUpdate(BaseModel):
    """Schema for updating a recurring availability pattern."""

    day_of_week: Optional[int] = Field(None, ge=1, le=7)
    start_time: Optional[str] = Field(None, description="Start time in HH:MM format")
    end_time: Optional[str] = Field(None, description="End time in HH:MM format")
    enabled: Optional[bool] = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate time format."""
        if v is None:
            return v
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM or HH:MM:SS format")


class RecurringPatternResponse(BaseModel):
    """Schema for recurring pattern response."""

    id: int
    user_id: int
    day_of_week: int
    start_time_local: str  # Will be formatted as HH:MM:SS
    end_time_local: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response schema."""
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            day_of_week=obj.day_of_week,
            start_time_local=str(obj.start_time_local),
            end_time_local=str(obj.end_time_local),
            enabled=obj.enabled,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class ManualBlockCreate(BaseModel):
    """Schema for creating a manual availability block."""

    start_time: datetime = Field(..., description="Start time (will be converted to UTC)")
    end_time: datetime = Field(..., description="End time (will be converted to UTC)")

    @field_validator("start_time", "end_time")
    @classmethod
    def ensure_timezone_aware(cls, v: datetime) -> datetime:
        """Ensure datetime is timezone-aware."""
        if v.tzinfo is None:
            raise ValueError("Datetime must be timezone-aware (include timezone info)")
        return v


class AvailabilityBlockResponse(BaseModel):
    """Schema for availability block response."""

    id: int
    user_id: int
    start_time: datetime  # UTC
    end_time: datetime  # UTC
    start_time_local: datetime  # Converted to league timezone for display
    end_time_local: datetime
    generated_from_recurring: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response schema with local time conversion."""
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            start_time=obj.start_time,
            end_time=obj.end_time,
            start_time_local=utc_to_league_time(obj.start_time),
            end_time_local=utc_to_league_time(obj.end_time),
            generated_from_recurring=obj.generated_from_recurring,
            created_at=obj.created_at
        )


# ==================== Routes ====================

@router.get("/patterns", response_model=List[RecurringPatternResponse])
@limiter.limit("100/day")
async def get_patterns(
    request: Request,
    current_user_id: int = Depends(get_current_user_id),
    enabled_only: bool = Query(False, description="Only return enabled patterns"),
    db: Session = Depends(get_db)
):
    """Get user's recurring availability patterns.

    Returns all patterns ordered by day of week and start time.
    """
    patterns = AvailabilityService.get_user_patterns(
        db, current_user_id, enabled_only
    )

    return [RecurringPatternResponse.from_orm(p) for p in patterns]


@router.post("/patterns", response_model=RecurringPatternResponse, status_code=201)
@limiter.limit("40/day")
async def create_pattern(
    request: Request,
    pattern: RecurringPatternCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new recurring availability pattern.

    Automatically generates availability blocks for the next 2 weeks.
    """
    try:
        start_time = time.fromisoformat(pattern.start_time)
        end_time = time.fromisoformat(pattern.end_time)

        created_pattern = AvailabilityService.create_recurring_pattern(
            db=db,
            user_id=current_user_id,
            day_of_week=pattern.day_of_week,
            start_time=start_time,
            end_time=end_time,
            enabled=pattern.enabled
        )

        return RecurringPatternResponse.from_orm(created_pattern)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/patterns/{pattern_id}", response_model=RecurringPatternResponse)
@limiter.limit("40/day")
async def update_pattern(
    request: Request,
    pattern_id: int,
    pattern: RecurringPatternUpdate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a recurring availability pattern.

    Regenerates future blocks from this pattern.
    """
    try:
        start_time = None if pattern.start_time is None else time.fromisoformat(pattern.start_time)
        end_time = None if pattern.end_time is None else time.fromisoformat(pattern.end_time)

        updated_pattern = AvailabilityService.update_recurring_pattern(
            db=db,
            pattern_id=pattern_id,
            day_of_week=pattern.day_of_week,
            start_time=start_time,
            end_time=end_time,
            enabled=pattern.enabled
        )

        if not updated_pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        # Authorization check: ensure pattern belongs to current user
        if updated_pattern.user_id != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this pattern")

        return RecurringPatternResponse.from_orm(updated_pattern)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/patterns/{pattern_id}", status_code=204)
@limiter.limit("40/day")
async def delete_pattern(
    request: Request,
    pattern_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a recurring availability pattern.

    Deletes future blocks generated from this pattern.
    Past blocks are preserved.
    """
    # First, verify the pattern exists and belongs to the current user
    from app.models.availability import RecurringAvailability
    pattern = db.query(RecurringAvailability).filter(
        RecurringAvailability.id == pattern_id
    ).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    if pattern.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this pattern")

    # Delete the pattern
    success = AvailabilityService.delete_recurring_pattern(db, pattern_id)

    if not success:
        raise HTTPException(status_code=404, detail="Pattern not found")


@router.get("/blocks", response_model=List[AvailabilityBlockResponse])
@limiter.limit("100/day")
async def get_blocks(
    request: Request,
    current_user_id: int = Depends(get_current_user_id),
    start_date: Optional[datetime] = Query(None, description="Start date (UTC)"),
    end_date: Optional[datetime] = Query(None, description="End date (UTC)"),
    db: Session = Depends(get_db)
):
    """Get user's availability blocks within a date range.

    If no date range is provided, returns all future blocks.
    """
    # If no start_date, default to now
    if start_date is None:
        start_date = datetime.now(ZoneInfo("UTC"))

    blocks = AvailabilityService.get_user_blocks(
        db, current_user_id, start_date, end_date
    )

    return [AvailabilityBlockResponse.from_orm(b) for b in blocks]


@router.post("/blocks", response_model=AvailabilityBlockResponse, status_code=201)
@limiter.limit("100/day")
async def add_manual_block(
    request: Request,
    block: ManualBlockCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Add a one-time manual availability block.

    This is for adding availability that's not part of a recurring pattern.
    """
    try:
        created_block = AvailabilityService.add_manual_block(
            db=db,
            user_id=current_user_id,
            start_time=block.start_time,
            end_time=block.end_time
        )

        return AvailabilityBlockResponse.from_orm(created_block)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/blocks/{block_id}", status_code=204)
@limiter.limit("100/day")
async def delete_block(
    request: Request,
    block_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete an availability block.

    Can be used to create one-time exceptions to recurring patterns,
    or to remove manually added blocks.
    """
    success = AvailabilityService.delete_block(db, block_id, current_user_id)

    if not success:
        raise HTTPException(status_code=404, detail="Block not found")

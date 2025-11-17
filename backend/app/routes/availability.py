"""Availability routes for managing recurring patterns and blocks."""
from datetime import datetime, date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.models.availability import RecurringAvailability, AvailabilityBlock
from app.utils.auth import get_current_user
from app.services import availability as availability_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class RecurringPatternCreate(BaseModel):
    """Create recurring pattern request."""
    day_of_week: int = Field(..., ge=1, le=7, description="1=Monday, 7=Sunday")
    start_time: str = Field(..., description="Start time in HH:MM format (e.g., '19:00')")
    end_time: str = Field(..., description="End time in HH:MM format (e.g., '21:00')")
    enabled: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "day_of_week": 1,
                "start_time": "19:00",
                "end_time": "21:00",
                "enabled": True
            }
        }


class RecurringPatternUpdate(BaseModel):
    """Update recurring pattern request."""
    day_of_week: Optional[int] = Field(None, ge=1, le=7)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    enabled: Optional[bool] = None


class RecurringPatternResponse(BaseModel):
    """Recurring pattern response."""
    id: int
    user_id: int
    day_of_week: int
    start_time_local: str
    end_time_local: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            day_of_week=obj.day_of_week,
            start_time_local=str(obj.start_time_local),
            end_time_local=str(obj.end_time_local),
            enabled=obj.enabled,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )


class ManualBlockCreate(BaseModel):
    """Create manual availability block request."""
    start_time: datetime
    end_time: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-11-17T19:00:00Z",
                "end_time": "2025-11-17T19:30:00Z"
            }
        }


class AvailabilityBlockResponse(BaseModel):
    """Availability block response."""
    id: int
    user_id: int
    start_time: datetime
    end_time: datetime
    generated_from_recurring: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


def parse_time(time_str: str) -> time:
    """Parse time string in HH:MM format."""
    try:
        hours, minutes = map(int, time_str.split(':'))
        return time(hour=hours, minute=minutes)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format: {time_str}. Use HH:MM format (e.g., '19:00')"
        )


# Recurring Pattern Endpoints

@router.get("/patterns", response_model=List[RecurringPatternResponse])
async def get_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all recurring patterns for current user."""
    patterns = availability_service.get_user_recurring_patterns(db, current_user.id)
    return [RecurringPatternResponse.from_orm(p) for p in patterns]


@router.post("/patterns", response_model=RecurringPatternResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("40/day")
async def create_pattern(
    pattern_data: RecurringPatternCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new recurring availability pattern."""
    start_time = parse_time(pattern_data.start_time)
    end_time = parse_time(pattern_data.end_time)

    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )

    pattern = availability_service.create_recurring_pattern(
        db=db,
        user_id=current_user.id,
        day_of_week=pattern_data.day_of_week,
        start_time=start_time,
        end_time=end_time,
        enabled=pattern_data.enabled
    )

    return RecurringPatternResponse.from_orm(pattern)


@router.put("/patterns/{pattern_id}", response_model=RecurringPatternResponse)
@limiter.limit("40/day")
async def update_pattern(
    pattern_id: int,
    pattern_data: RecurringPatternUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a recurring availability pattern."""
    # Verify pattern belongs to current user
    pattern = db.query(RecurringAvailability).filter(RecurringAvailability.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")

    if pattern.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this pattern")

    start_time = parse_time(pattern_data.start_time) if pattern_data.start_time else None
    end_time = parse_time(pattern_data.end_time) if pattern_data.end_time else None

    updated_pattern = availability_service.update_recurring_pattern(
        db=db,
        pattern_id=pattern_id,
        day_of_week=pattern_data.day_of_week,
        start_time=start_time,
        end_time=end_time,
        enabled=pattern_data.enabled
    )

    if not updated_pattern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")

    return RecurringPatternResponse.from_orm(updated_pattern)


@router.delete("/patterns/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("40/day")
async def delete_pattern(
    pattern_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a recurring availability pattern."""
    # Verify pattern belongs to current user
    pattern = db.query(RecurringAvailability).filter(RecurringAvailability.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")

    if pattern.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this pattern")

    success = availability_service.delete_recurring_pattern(db, pattern_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")


# Availability Block Endpoints

@router.get("/blocks", response_model=List[AvailabilityBlockResponse])
async def get_blocks(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get availability blocks for current user within date range."""
    blocks = availability_service.get_user_blocks(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date
    )
    return blocks


@router.post("/blocks", response_model=AvailabilityBlockResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/day")
async def create_manual_block(
    block_data: ManualBlockCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a manual one-time availability block."""
    try:
        block = availability_service.add_manual_block(
            db=db,
            user_id=current_user.id,
            start_time=block_data.start_time,
            end_time=block_data.end_time
        )
        return block
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/day")
async def delete_block(
    block_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an availability block."""
    # Verify block belongs to current user
    block = db.query(AvailabilityBlock).filter(AvailabilityBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

    if block.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this block")

    success = availability_service.delete_block(db, block_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

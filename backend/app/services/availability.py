"""Availability service for managing recurring patterns and blocks."""
from datetime import datetime, date, time, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.availability import RecurringAvailability, AvailabilityBlock
from app.models.user import User
from app.utils.timezone import (
    combine_date_time_local,
    league_time_to_utc,
    get_current_league_time,
)


def create_recurring_pattern(
    db: Session,
    user_id: int,
    day_of_week: int,
    start_time: time,
    end_time: time,
    enabled: bool = True
) -> RecurringAvailability:
    """Create a recurring availability pattern."""
    pattern = RecurringAvailability(
        user_id=user_id,
        day_of_week=day_of_week,
        start_time_local=start_time,
        end_time_local=end_time,
        enabled=enabled,
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)

    # Generate blocks for the pattern
    generate_blocks_for_pattern(db, pattern.id)

    return pattern


def update_recurring_pattern(
    db: Session,
    pattern_id: int,
    day_of_week: Optional[int] = None,
    start_time: Optional[time] = None,
    end_time: Optional[time] = None,
    enabled: Optional[bool] = None
) -> Optional[RecurringAvailability]:
    """Update a recurring availability pattern."""
    pattern = db.query(RecurringAvailability).filter(RecurringAvailability.id == pattern_id).first()
    if not pattern:
        return None

    if day_of_week is not None:
        pattern.day_of_week = day_of_week
    if start_time is not None:
        pattern.start_time_local = start_time
    if end_time is not None:
        pattern.end_time_local = end_time
    if enabled is not None:
        pattern.enabled = enabled

    db.commit()
    db.refresh(pattern)

    # Delete old generated blocks and regenerate
    db.query(AvailabilityBlock).filter(
        AvailabilityBlock.generated_from_recurring == pattern_id
    ).delete()
    db.commit()

    if pattern.enabled:
        generate_blocks_for_pattern(db, pattern.id)

    return pattern


def delete_recurring_pattern(db: Session, pattern_id: int) -> bool:
    """Delete a recurring availability pattern and its generated blocks."""
    pattern = db.query(RecurringAvailability).filter(RecurringAvailability.id == pattern_id).first()
    if not pattern:
        return False

    db.delete(pattern)
    db.commit()
    return True


def generate_blocks_for_pattern(
    db: Session,
    pattern_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[AvailabilityBlock]:
    """Generate 30-minute blocks for a recurring pattern within date range."""
    pattern = db.query(RecurringAvailability).filter(RecurringAvailability.id == pattern_id).first()
    if not pattern or not pattern.enabled:
        return []

    # Default to current week + next week (2 weeks)
    if start_date is None:
        current_league_time = get_current_league_time()
        # Start from current date
        start_date = current_league_time.date()

    if end_date is None:
        # End 2 weeks from start
        end_date = start_date + timedelta(days=14)

    blocks = []
    current_date = start_date

    while current_date <= end_date:
        # Check if this date matches the day_of_week (1=Monday, 7=Sunday)
        # Python's weekday() returns 0=Monday, 6=Sunday, so we add 1
        if current_date.weekday() + 1 == pattern.day_of_week:
            # Generate blocks for this day
            blocks.extend(_generate_blocks_for_day(db, pattern, current_date))

        current_date += timedelta(days=1)

    return blocks


def _generate_blocks_for_day(
    db: Session,
    pattern: RecurringAvailability,
    date_obj: date
) -> List[AvailabilityBlock]:
    """Generate 30-minute blocks for a specific day."""
    blocks = []

    # Create datetime for start and end in local timezone
    start_local = combine_date_time_local(date_obj, pattern.start_time_local)
    end_local = combine_date_time_local(date_obj, pattern.end_time_local)

    # Convert to UTC
    start_utc = league_time_to_utc(start_local)
    end_utc = league_time_to_utc(end_local)

    # Generate 30-minute blocks
    current_time = start_utc
    while current_time < end_utc:
        block_end = current_time + timedelta(minutes=30)

        # Check if block already exists (idempotent)
        existing_block = db.query(AvailabilityBlock).filter(
            and_(
                AvailabilityBlock.user_id == pattern.user_id,
                AvailabilityBlock.start_time == current_time
            )
        ).first()

        if not existing_block:
            block = AvailabilityBlock(
                user_id=pattern.user_id,
                start_time=current_time,
                end_time=block_end,
                generated_from_recurring=pattern.id,
            )
            db.add(block)
            blocks.append(block)

        current_time = block_end

    db.commit()
    return blocks


def generate_blocks_for_user(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[AvailabilityBlock]:
    """Generate blocks for all enabled recurring patterns of a user."""
    patterns = db.query(RecurringAvailability).filter(
        and_(
            RecurringAvailability.user_id == user_id,
            RecurringAvailability.enabled == True
        )
    ).all()

    all_blocks = []
    for pattern in patterns:
        blocks = generate_blocks_for_pattern(db, pattern.id, start_date, end_date)
        all_blocks.extend(blocks)

    return all_blocks


def add_manual_block(
    db: Session,
    user_id: int,
    start_time: datetime,
    end_time: datetime
) -> AvailabilityBlock:
    """Add a manual one-time availability block (not from recurring pattern)."""
    # Ensure times are on 30-minute boundaries and duration is 30 minutes
    if (end_time - start_time) != timedelta(minutes=30):
        raise ValueError("Block duration must be exactly 30 minutes")

    block = AvailabilityBlock(
        user_id=user_id,
        start_time=start_time,
        end_time=end_time,
        generated_from_recurring=None,  # Manual block
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


def delete_block(db: Session, block_id: int) -> bool:
    """Delete an availability block."""
    block = db.query(AvailabilityBlock).filter(AvailabilityBlock.id == block_id).first()
    if not block:
        return False

    db.delete(block)
    db.commit()
    return True


def get_user_blocks(
    db: Session,
    user_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[AvailabilityBlock]:
    """Get availability blocks for a user within a date range."""
    query = db.query(AvailabilityBlock).filter(AvailabilityBlock.user_id == user_id)

    if start_date:
        query = query.filter(AvailabilityBlock.start_time >= start_date)
    if end_date:
        query = query.filter(AvailabilityBlock.end_time <= end_date)

    return query.order_by(AvailabilityBlock.start_time).all()


def get_user_recurring_patterns(db: Session, user_id: int) -> List[RecurringAvailability]:
    """Get all recurring patterns for a user."""
    return db.query(RecurringAvailability).filter(
        RecurringAvailability.user_id == user_id
    ).order_by(RecurringAvailability.day_of_week, RecurringAvailability.start_time_local).all()

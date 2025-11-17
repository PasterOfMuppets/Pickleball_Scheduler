"""Availability service for managing recurring patterns and availability blocks."""
from datetime import datetime, date, time, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.availability import RecurringAvailability, AvailabilityBlock
from app.utils.timezone import (
    combine_date_time_in_league_tz,
    league_time_to_utc,
    utc_to_league_time,
    get_week_start,
)


class AvailabilityService:
    """Service for managing user availability patterns and blocks."""

    @staticmethod
    def create_recurring_pattern(
        db: Session,
        user_id: int,
        day_of_week: int,
        start_time: time,
        end_time: time,
        enabled: bool = True
    ) -> RecurringAvailability:
        """Create a new recurring availability pattern.

        Args:
            db: Database session
            user_id: User ID
            day_of_week: Day of week (1=Monday, 7=Sunday)
            start_time: Start time in local timezone (e.g., time(19, 0) for 7 PM)
            end_time: End time in local timezone
            enabled: Whether pattern is enabled

        Returns:
            RecurringAvailability: The created pattern

        Raises:
            ValueError: If day_of_week is invalid or times are invalid
        """
        if not (1 <= day_of_week <= 7):
            raise ValueError("day_of_week must be between 1 (Monday) and 7 (Sunday)")

        if start_time >= end_time:
            raise ValueError("start_time must be before end_time")

        pattern = RecurringAvailability(
            user_id=user_id,
            day_of_week=day_of_week,
            start_time_local=start_time,
            end_time_local=end_time,
            enabled=enabled
        )

        db.add(pattern)
        db.commit()
        db.refresh(pattern)

        # Immediately generate blocks for this pattern for the next 2 weeks
        if enabled:
            AvailabilityService.generate_blocks_for_pattern(
                db, pattern.id, weeks_ahead=2
            )

        return pattern

    @staticmethod
    def update_recurring_pattern(
        db: Session,
        pattern_id: int,
        day_of_week: Optional[int] = None,
        start_time: Optional[time] = None,
        end_time: Optional[time] = None,
        enabled: Optional[bool] = None
    ) -> Optional[RecurringAvailability]:
        """Update an existing recurring pattern.

        When updated, regenerates future blocks from this pattern.

        Args:
            db: Database session
            pattern_id: Pattern ID to update
            day_of_week: New day of week (optional)
            start_time: New start time (optional)
            end_time: New end time (optional)
            enabled: New enabled status (optional)

        Returns:
            RecurringAvailability: Updated pattern or None if not found
        """
        pattern = db.query(RecurringAvailability).filter(
            RecurringAvailability.id == pattern_id
        ).first()

        if not pattern:
            return None

        # Update fields if provided
        if day_of_week is not None:
            if not (1 <= day_of_week <= 7):
                raise ValueError("day_of_week must be between 1 and 7")
            pattern.day_of_week = day_of_week

        if start_time is not None:
            pattern.start_time_local = start_time

        if end_time is not None:
            pattern.end_time_local = end_time

        if enabled is not None:
            pattern.enabled = enabled

        # Validate times
        if pattern.start_time_local >= pattern.end_time_local:
            raise ValueError("start_time must be before end_time")

        pattern.updated_at = datetime.now(ZoneInfo("UTC"))

        db.commit()
        db.refresh(pattern)

        # Regenerate blocks: delete future blocks from this pattern and regenerate
        now_utc = datetime.now(ZoneInfo("UTC"))
        db.query(AvailabilityBlock).filter(
            and_(
                AvailabilityBlock.generated_from_recurring == pattern_id,
                AvailabilityBlock.start_time > now_utc
            )
        ).delete()
        db.commit()

        # Regenerate if enabled
        if pattern.enabled:
            AvailabilityService.generate_blocks_for_pattern(
                db, pattern.id, weeks_ahead=2
            )

        return pattern

    @staticmethod
    def delete_recurring_pattern(
        db: Session,
        pattern_id: int
    ) -> bool:
        """Delete a recurring pattern and its future generated blocks.

        Past blocks are preserved (matches may already be scheduled).

        Args:
            db: Database session
            pattern_id: Pattern ID to delete

        Returns:
            bool: True if deleted, False if not found
        """
        pattern = db.query(RecurringAvailability).filter(
            RecurringAvailability.id == pattern_id
        ).first()

        if not pattern:
            return False

        # Delete future blocks generated from this pattern
        now_utc = datetime.now(ZoneInfo("UTC"))
        db.query(AvailabilityBlock).filter(
            and_(
                AvailabilityBlock.generated_from_recurring == pattern_id,
                AvailabilityBlock.start_time > now_utc
            )
        ).delete()

        # Delete the pattern
        db.delete(pattern)
        db.commit()

        return True

    @staticmethod
    def generate_blocks_for_pattern(
        db: Session,
        pattern_id: int,
        weeks_ahead: int = 2
    ) -> List[AvailabilityBlock]:
        """Generate availability blocks from a recurring pattern.

        Generates 30-minute blocks for the specified number of weeks ahead.
        Idempotent - skips blocks that already exist.

        Args:
            db: Database session
            pattern_id: Recurring pattern ID
            weeks_ahead: Number of weeks to generate (default 2)

        Returns:
            List[AvailabilityBlock]: List of created blocks
        """
        pattern = db.query(RecurringAvailability).filter(
            RecurringAvailability.id == pattern_id
        ).first()

        if not pattern or not pattern.enabled:
            return []

        # Get the start of the current week
        week_start = get_week_start()
        week_start_local = utc_to_league_time(week_start)

        created_blocks = []

        # Generate blocks for each week
        for week_offset in range(weeks_ahead):
            # Calculate the target date for this pattern's day
            days_ahead = (pattern.day_of_week - 1) + (week_offset * 7)
            target_date = (week_start_local + timedelta(days=days_ahead)).date()

            # Generate 30-minute blocks for the pattern's time range
            current_time = pattern.start_time_local
            end_time = pattern.end_time_local

            while current_time < end_time:
                # Create start datetime in league timezone
                start_dt_local = combine_date_time_in_league_tz(target_date, current_time)

                # Convert to UTC
                start_dt_utc = league_time_to_utc(start_dt_local)
                end_dt_utc = start_dt_utc + timedelta(minutes=30)

                # Check if block already exists (idempotent)
                existing = db.query(AvailabilityBlock).filter(
                    and_(
                        AvailabilityBlock.user_id == pattern.user_id,
                        AvailabilityBlock.start_time == start_dt_utc
                    )
                ).first()

                if not existing:
                    block = AvailabilityBlock(
                        user_id=pattern.user_id,
                        start_time=start_dt_utc,
                        end_time=end_dt_utc,
                        generated_from_recurring=pattern_id
                    )
                    db.add(block)
                    created_blocks.append(block)

                # Move to next 30-minute slot
                current_time = (
                    datetime.combine(date.today(), current_time) + timedelta(minutes=30)
                ).time()

        if created_blocks:
            db.commit()
            for block in created_blocks:
                db.refresh(block)

        return created_blocks

    @staticmethod
    def generate_blocks_for_user(
        db: Session,
        user_id: int,
        weeks_ahead: int = 2
    ) -> List[AvailabilityBlock]:
        """Generate availability blocks for all of a user's enabled recurring patterns.

        Args:
            db: Database session
            user_id: User ID
            weeks_ahead: Number of weeks to generate (default 2)

        Returns:
            List[AvailabilityBlock]: List of all created blocks
        """
        patterns = db.query(RecurringAvailability).filter(
            and_(
                RecurringAvailability.user_id == user_id,
                RecurringAvailability.enabled == True
            )
        ).all()

        all_blocks = []
        for pattern in patterns:
            blocks = AvailabilityService.generate_blocks_for_pattern(
                db, pattern.id, weeks_ahead
            )
            all_blocks.extend(blocks)

        return all_blocks

    @staticmethod
    def add_manual_block(
        db: Session,
        user_id: int,
        start_time: datetime,
        end_time: datetime
    ) -> AvailabilityBlock:
        """Add a one-time manual availability block (not from recurring pattern).

        Args:
            db: Database session
            user_id: User ID
            start_time: Start time in UTC (timezone-aware)
            end_time: End time in UTC (timezone-aware)

        Returns:
            AvailabilityBlock: The created block

        Raises:
            ValueError: If times are invalid or block already exists
        """
        if start_time >= end_time:
            raise ValueError("start_time must be before end_time")

        # Check if block already exists
        existing = db.query(AvailabilityBlock).filter(
            and_(
                AvailabilityBlock.user_id == user_id,
                AvailabilityBlock.start_time == start_time
            )
        ).first()

        if existing:
            raise ValueError("Availability block already exists for this time slot")

        block = AvailabilityBlock(
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
            generated_from_recurring=None  # Manual block
        )

        db.add(block)
        db.commit()
        db.refresh(block)

        return block

    @staticmethod
    def delete_block(
        db: Session,
        block_id: int,
        user_id: Optional[int] = None
    ) -> bool:
        """Delete an availability block (one-time exception or manual block removal).

        Args:
            db: Database session
            block_id: Block ID to delete
            user_id: Optional user ID for authorization check

        Returns:
            bool: True if deleted, False if not found
        """
        query = db.query(AvailabilityBlock).filter(
            AvailabilityBlock.id == block_id
        )

        if user_id is not None:
            query = query.filter(AvailabilityBlock.user_id == user_id)

        block = query.first()

        if not block:
            return False

        db.delete(block)
        db.commit()

        return True

    @staticmethod
    def get_user_patterns(
        db: Session,
        user_id: int,
        enabled_only: bool = False
    ) -> List[RecurringAvailability]:
        """Get all recurring patterns for a user.

        Args:
            db: Database session
            user_id: User ID
            enabled_only: If True, only return enabled patterns

        Returns:
            List[RecurringAvailability]: List of patterns
        """
        query = db.query(RecurringAvailability).filter(
            RecurringAvailability.user_id == user_id
        )

        if enabled_only:
            query = query.filter(RecurringAvailability.enabled == True)

        return query.order_by(
            RecurringAvailability.day_of_week,
            RecurringAvailability.start_time_local
        ).all()

    @staticmethod
    def get_user_blocks(
        db: Session,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AvailabilityBlock]:
        """Get availability blocks for a user within a date range.

        Args:
            db: Database session
            user_id: User ID
            start_date: Start date (UTC, optional)
            end_date: End date (UTC, optional)

        Returns:
            List[AvailabilityBlock]: List of blocks
        """
        query = db.query(AvailabilityBlock).filter(
            AvailabilityBlock.user_id == user_id
        )

        if start_date:
            query = query.filter(AvailabilityBlock.start_time >= start_date)

        if end_date:
            query = query.filter(AvailabilityBlock.end_time <= end_date)

        return query.order_by(AvailabilityBlock.start_time).all()

    @staticmethod
    def cleanup_old_blocks(
        db: Session,
        days_old: int = 14
    ) -> int:
        """Clean up old availability blocks (for background job).

        Args:
            db: Database session
            days_old: Delete blocks older than this many days (default 14)

        Returns:
            int: Number of blocks deleted
        """
        cutoff_date = datetime.now(ZoneInfo("UTC")) - timedelta(days=days_old)

        result = db.query(AvailabilityBlock).filter(
            AvailabilityBlock.end_time < cutoff_date
        ).delete()

        db.commit()

        return result

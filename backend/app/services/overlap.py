"""
Overlap detection service for finding players with shared availability.

This service helps players discover potential opponents by:
- Finding mutual availability time slots
- Excluding time slots with existing matches
- Filtering out inactive or vacationing users
- Calculating total overlap hours per player
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.models.user import User
from app.models.availability import AvailabilityBlock
from app.models.match import Match


def calculate_overlaps(
    db: Session,
    user_id: int,
    week_start_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Calculate overlapping availability between current user and all other players.

    Args:
        db: Database session
        user_id: Current user ID
        week_start_date: Start of week to check (defaults to current week)

    Returns:
        List of dicts with player info and overlap details:
        [{
            'user_id': int,
            'name': str,
            'email': str,
            'overlap_hours': float,
            'overlap_count': int  # number of matching time slots
        }]
    """
    # Default to current week if not specified
    if not week_start_date:
        now = datetime.now().astimezone()
        week_start_date = now - timedelta(days=now.weekday())  # Monday
        week_start_date = week_start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    week_end_date = week_start_date + timedelta(days=7)

    # Get current user's availability blocks for the week
    user_blocks = db.query(AvailabilityBlock).filter(
        and_(
            AvailabilityBlock.user_id == user_id,
            AvailabilityBlock.start_time >= week_start_date,
            AvailabilityBlock.start_time < week_end_date
        )
    ).all()

    if not user_blocks:
        return []

    # Get all active users (exclude self, inactive, and vacation)
    active_users = db.query(User).filter(
        and_(
            User.id != user_id,
            User.status == 'active'
        )
    ).all()

    results = []

    for other_user in active_users:
        overlap_data = get_shared_availability(
            db, user_id, other_user.id, week_start_date
        )

        if overlap_data['slots']:
            total_hours = sum(
                (slot['end_time'] - slot['start_time']).total_seconds() / 3600
                for slot in overlap_data['slots']
            )

            results.append({
                'user_id': other_user.id,
                'name': other_user.name,
                'email': other_user.email,
                'overlap_hours': round(total_hours, 1),
                'overlap_count': len(overlap_data['slots'])
            })

    # Sort by overlap hours (descending)
    results.sort(key=lambda x: x['overlap_hours'], reverse=True)

    return results


def get_shared_availability(
    db: Session,
    user_a_id: int,
    user_b_id: int,
    week_start_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Get specific shared availability slots between two users.

    Args:
        db: Database session
        user_a_id: First user ID
        user_b_id: Second user ID
        week_start_date: Start of week to check (defaults to current week)

    Returns:
        Dict with shared availability info:
        {
            'user_a_id': int,
            'user_b_id': int,
            'week_start': datetime,
            'week_end': datetime,
            'slots': [
                {
                    'start_time': datetime,
                    'end_time': datetime,
                    'duration_minutes': int
                }
            ]
        }
    """
    # Default to current week if not specified
    if not week_start_date:
        now = datetime.now().astimezone()
        week_start_date = now - timedelta(days=now.weekday())  # Monday
        week_start_date = week_start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    week_end_date = week_start_date + timedelta(days=7)

    # Get availability blocks for both users
    user_a_blocks = db.query(AvailabilityBlock).filter(
        and_(
            AvailabilityBlock.user_id == user_a_id,
            AvailabilityBlock.start_time >= week_start_date,
            AvailabilityBlock.start_time < week_end_date
        )
    ).all()

    user_b_blocks = db.query(AvailabilityBlock).filter(
        and_(
            AvailabilityBlock.user_id == user_b_id,
            AvailabilityBlock.start_time >= week_start_date,
            AvailabilityBlock.start_time < week_end_date
        )
    ).all()

    # Find overlapping time slots
    overlapping_slots = []

    for block_a in user_a_blocks:
        for block_b in user_b_blocks:
            # Check if blocks overlap
            overlap_start = max(block_a.start_time, block_b.start_time)
            overlap_end = min(block_a.end_time, block_b.end_time)

            if overlap_start < overlap_end:
                # Check for conflicts with existing matches
                if not _has_match_conflict(db, user_a_id, user_b_id, overlap_start, overlap_end):
                    duration_minutes = int((overlap_end - overlap_start).total_seconds() / 60)
                    overlapping_slots.append({
                        'start_time': overlap_start,
                        'end_time': overlap_end,
                        'duration_minutes': duration_minutes
                    })

    # Remove duplicate slots and sort by start time
    unique_slots = _deduplicate_slots(overlapping_slots)
    unique_slots.sort(key=lambda x: x['start_time'])

    return {
        'user_a_id': user_a_id,
        'user_b_id': user_b_id,
        'week_start': week_start_date,
        'week_end': week_end_date,
        'slots': unique_slots
    }


def _has_match_conflict(
    db: Session,
    user_a_id: int,
    user_b_id: int,
    start_time: datetime,
    end_time: datetime
) -> bool:
    """
    Check if either user has a pending or confirmed match during the time slot.

    Args:
        db: Database session
        user_a_id: First user ID
        user_b_id: Second user ID
        start_time: Slot start time
        end_time: Slot end time

    Returns:
        True if there's a conflict, False otherwise
    """
    # Check for matches involving either user that overlap with this time slot
    conflict = db.query(Match).filter(
        and_(
            or_(
                Match.player_a_id.in_([user_a_id, user_b_id]),
                Match.player_b_id.in_([user_a_id, user_b_id])
            ),
            Match.status.in_(['pending', 'confirmed']),
            or_(
                # Match starts during this slot
                and_(Match.start_time >= start_time, Match.start_time < end_time),
                # Match ends during this slot
                and_(Match.end_time > start_time, Match.end_time <= end_time),
                # Match completely contains this slot
                and_(Match.start_time <= start_time, Match.end_time >= end_time)
            )
        )
    ).first()

    return conflict is not None


def _deduplicate_slots(slots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Remove duplicate time slots from the list.

    Args:
        slots: List of slot dicts with start_time and end_time

    Returns:
        Deduplicated list of slots
    """
    seen = set()
    unique_slots = []

    for slot in slots:
        # Create a tuple key for uniqueness check
        key = (slot['start_time'], slot['end_time'])
        if key not in seen:
            seen.add(key)
            unique_slots.append(slot)

    return unique_slots

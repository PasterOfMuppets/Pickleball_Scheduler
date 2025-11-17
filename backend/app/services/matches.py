"""
Match service - Business logic for match challenges and lifecycle management.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.match import Match
from app.models.user import User
from app.utils.timezone import utc_now, league_time_to_utc


class ConflictError(Exception):
    """Raised when a match conflicts with another match."""
    pass


class MatchNotFoundError(Exception):
    """Raised when a match is not found."""
    pass


class UnauthorizedError(Exception):
    """Raised when a user is not authorized to perform an action."""
    pass


def check_conflict(db: Session, user_id: int, start_time: datetime, end_time: datetime, exclude_match_id: Optional[int] = None) -> bool:
    """
    Check if a user has any pending or confirmed matches that overlap with the given time range.

    Args:
        db: Database session
        user_id: User ID to check
        start_time: Start time (UTC)
        end_time: End time (UTC)
        exclude_match_id: Optional match ID to exclude from the check (for updates)

    Returns:
        True if there is a conflict, False otherwise
    """
    query = db.query(Match).filter(
        or_(Match.player_a_id == user_id, Match.player_b_id == user_id),
        Match.status.in_(['pending', 'confirmed']),
        # Check for time overlap: (start_time < other.end_time AND end_time > other.start_time)
        Match.start_time < end_time,
        Match.end_time > start_time
    )

    if exclude_match_id:
        query = query.filter(Match.id != exclude_match_id)

    return db.query(query.exists()).scalar()


def create_challenge(
    db: Session,
    player_a_id: int,
    player_b_id: int,
    start_time: datetime,
    duration_minutes: int
) -> Match:
    """
    Create a new match challenge.

    Args:
        db: Database session
        player_a_id: Challenger (Player A)
        player_b_id: Challenged player (Player B)
        start_time: Match start time (UTC)
        duration_minutes: Match duration in minutes (60, 90, or 120)

    Returns:
        Created Match object

    Raises:
        ConflictError: If either player has a conflicting match
        ValueError: If players are invalid or duration is invalid
    """
    # Validate players
    if player_a_id == player_b_id:
        raise ValueError("Cannot challenge yourself")

    # Validate duration
    if duration_minutes not in [60, 90, 120]:
        raise ValueError("Duration must be 60, 90, or 120 minutes")

    # Check if both players exist and are active
    player_a = db.query(User).filter(User.id == player_a_id).first()
    player_b = db.query(User).filter(User.id == player_b_id).first()

    if not player_a or not player_b:
        raise ValueError("One or both players not found")

    if player_a.status != 'active':
        raise ValueError("You cannot send challenges while inactive or on vacation")

    if player_b.status != 'active':
        raise ValueError("Cannot challenge a player who is inactive or on vacation")

    # Calculate end time
    end_time = start_time + timedelta(minutes=duration_minutes)

    # Check for conflicts for both players
    if check_conflict(db, player_a_id, start_time, end_time):
        raise ConflictError("You have a conflicting match at this time")

    if check_conflict(db, player_b_id, start_time, end_time):
        raise ConflictError("The other player has a conflicting match at this time")

    # Create the match
    match = Match(
        player_a_id=player_a_id,
        player_b_id=player_b_id,
        start_time=start_time,
        end_time=end_time,
        status='pending',
        created_by=player_a_id
    )

    db.add(match)
    db.commit()
    db.refresh(match)

    return match


def accept_challenge(db: Session, match_id: int, user_id: int) -> Match:
    """
    Accept a pending challenge (Player B accepts).

    Args:
        db: Database session
        match_id: Match ID
        user_id: User ID (must be Player B)

    Returns:
        Updated Match object

    Raises:
        MatchNotFoundError: If match doesn't exist
        UnauthorizedError: If user is not Player B
        ValueError: If match is not in pending status or has expired
        ConflictError: If accepting would create a conflict
    """
    match = db.query(Match).filter(Match.id == match_id).first()

    if not match:
        raise MatchNotFoundError("Match not found")

    if match.player_b_id != user_id:
        raise UnauthorizedError("Only Player B can accept this challenge")

    if match.status != 'pending':
        raise ValueError(f"Cannot accept a match with status '{match.status}'")

    # Check if match has expired
    now = utc_now()
    expiration_time = match.created_at + timedelta(hours=48)
    two_hours_before = match.start_time - timedelta(hours=2)

    if now >= expiration_time or now >= two_hours_before or now >= match.start_time:
        match.status = 'expired'
        db.commit()
        raise ValueError("This challenge has expired")

    # Check for conflicts again (in case something changed)
    if check_conflict(db, user_id, match.start_time, match.end_time, exclude_match_id=match_id):
        raise ConflictError("You have a conflicting match at this time")

    # Accept the challenge
    match.status = 'confirmed'
    match.confirmed_at = now
    match.updated_at = now

    db.commit()
    db.refresh(match)

    return match


def decline_challenge(db: Session, match_id: int, user_id: int) -> Match:
    """
    Decline a pending challenge (Player B declines).

    Args:
        db: Database session
        match_id: Match ID
        user_id: User ID (must be Player B)

    Returns:
        Updated Match object

    Raises:
        MatchNotFoundError: If match doesn't exist
        UnauthorizedError: If user is not Player B
        ValueError: If match is not in pending status
    """
    match = db.query(Match).filter(Match.id == match_id).first()

    if not match:
        raise MatchNotFoundError("Match not found")

    if match.player_b_id != user_id:
        raise UnauthorizedError("Only Player B can decline this challenge")

    if match.status != 'pending':
        raise ValueError(f"Cannot decline a match with status '{match.status}'")

    # Decline the challenge
    now = utc_now()
    match.status = 'declined'
    match.declined_at = now
    match.updated_at = now

    db.commit()
    db.refresh(match)

    return match


def cancel_match(db: Session, match_id: int, user_id: int, reason: Optional[str] = None) -> Match:
    """
    Cancel a match (works for pending by Player A, or confirmed by either player).

    Args:
        db: Database session
        match_id: Match ID
        user_id: User ID (must be Player A or B)
        reason: Optional cancellation reason

    Returns:
        Updated Match object

    Raises:
        MatchNotFoundError: If match doesn't exist
        UnauthorizedError: If user is not involved in the match
        ValueError: If match cannot be canceled (already completed, etc.)
    """
    match = db.query(Match).filter(Match.id == match_id).first()

    if not match:
        raise MatchNotFoundError("Match not found")

    # Check if user is involved in the match
    if user_id not in [match.player_a_id, match.player_b_id]:
        raise UnauthorizedError("You are not involved in this match")

    # Check if match can be canceled
    if match.status not in ['pending', 'confirmed']:
        raise ValueError(f"Cannot cancel a match with status '{match.status}'")

    # For pending matches, only Player A can cancel
    if match.status == 'pending' and user_id != match.player_a_id:
        raise UnauthorizedError("Only Player A can withdraw a pending challenge")

    # Check if match has already started
    now = utc_now()
    if now >= match.start_time:
        raise ValueError("Cannot cancel a match that has already started")

    # Cancel the match
    match.status = 'canceled'
    match.canceled_by = user_id
    match.cancellation_reason = reason
    match.canceled_at = now
    match.updated_at = now

    db.commit()
    db.refresh(match)

    return match


def get_user_matches(
    db: Session,
    user_id: int,
    status: Optional[str] = None,
    time_filter: Optional[str] = None,
    limit: int = 100
) -> List[Match]:
    """
    Get matches for a user with optional filters.

    Args:
        db: Database session
        user_id: User ID
        status: Optional status filter ('pending', 'confirmed', 'declined', 'expired', 'canceled')
        time_filter: Optional time filter ('upcoming', 'past')
        limit: Maximum number of matches to return

    Returns:
        List of Match objects
    """
    now = utc_now()

    query = db.query(Match).filter(
        or_(Match.player_a_id == user_id, Match.player_b_id == user_id)
    )

    if status:
        query = query.filter(Match.status == status)

    if time_filter == 'upcoming':
        query = query.filter(Match.start_time > now)
    elif time_filter == 'past':
        query = query.filter(Match.start_time <= now)

    query = query.order_by(Match.start_time.desc()).limit(limit)

    return query.all()


def get_match_by_id(db: Session, match_id: int, user_id: Optional[int] = None) -> Match:
    """
    Get a match by ID.

    Args:
        db: Database session
        match_id: Match ID
        user_id: Optional user ID to verify involvement

    Returns:
        Match object

    Raises:
        MatchNotFoundError: If match doesn't exist
        UnauthorizedError: If user_id is provided and user is not involved
    """
    match = db.query(Match).filter(Match.id == match_id).first()

    if not match:
        raise MatchNotFoundError("Match not found")

    if user_id and user_id not in [match.player_a_id, match.player_b_id]:
        raise UnauthorizedError("You are not involved in this match")

    return match


def check_expiration(db: Session) -> int:
    """
    Background job to check for expired challenges.
    Sets status='expired' for pending challenges that meet expiration criteria:
    - 48 hours passed since creation
    - 2 hours before match start_time
    - Current time > start_time (too late)

    Args:
        db: Database session

    Returns:
        Number of matches expired
    """
    now = utc_now()

    # Find all pending matches that should be expired
    expiration_threshold = now - timedelta(hours=48)
    two_hours_before_threshold = now + timedelta(hours=2)

    matches_to_expire = db.query(Match).filter(
        Match.status == 'pending',
        or_(
            Match.created_at <= expiration_threshold,  # 48 hours old
            Match.start_time <= two_hours_before_threshold,  # Within 2 hours of start
            Match.start_time <= now  # Already passed start time
        )
    ).all()

    count = 0
    for match in matches_to_expire:
        match.status = 'expired'
        match.updated_at = now
        count += 1

    if count > 0:
        db.commit()

    return count

"""Match service for challenge and match management."""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.match import Match
from app.models.user import User


class MatchConflictError(Exception):
    """Raised when a match conflicts with another match."""
    pass


class MatchNotFoundError(Exception):
    """Raised when a match is not found."""
    pass


class MatchPermissionError(Exception):
    """Raised when a user doesn't have permission for an action."""
    pass


class MatchStatusError(Exception):
    """Raised when a match action is invalid for the current status."""
    pass


def check_conflict(
    db: Session,
    user_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_match_id: Optional[int] = None
) -> Optional[Match]:
    """
    Check if a user has a conflicting match (pending or confirmed).

    Args:
        db: Database session
        user_id: User ID to check
        start_time: Start time of proposed match
        end_time: End time of proposed match
        exclude_match_id: Optional match ID to exclude (for updates)

    Returns:
        Conflicting match if found, None otherwise
    """
    query = db.query(Match).filter(
        and_(
            or_(
                Match.player_a_id == user_id,
                Match.player_b_id == user_id
            ),
            Match.status.in_(['pending', 'confirmed']),
            or_(
                # New match starts during existing match
                and_(Match.start_time <= start_time, Match.end_time > start_time),
                # New match ends during existing match
                and_(Match.start_time < end_time, Match.end_time >= end_time),
                # New match completely contains existing match
                and_(Match.start_time >= start_time, Match.end_time <= end_time)
            )
        )
    )

    if exclude_match_id:
        query = query.filter(Match.id != exclude_match_id)

    return query.first()


def create_challenge(
    db: Session,
    player_a_id: int,
    player_b_id: int,
    start_time: datetime,
    end_time: datetime
) -> Match:
    """
    Create a new match challenge.

    Args:
        db: Database session
        player_a_id: ID of challenging player
        player_b_id: ID of challenged player
        start_time: Match start time
        end_time: Match end time

    Returns:
        Created match

    Raises:
        MatchConflictError: If either player has a conflicting match
        ValueError: If players are the same or times are invalid
    """
    # Validate players are different
    if player_a_id == player_b_id:
        raise ValueError("Cannot challenge yourself")

    # Validate times
    if start_time >= end_time:
        raise ValueError("Start time must be before end time")

    if start_time < datetime.now(start_time.tzinfo):
        raise ValueError("Cannot create match in the past")

    # Check for conflicts for player A
    conflict_a = check_conflict(db, player_a_id, start_time, end_time)
    if conflict_a:
        raise MatchConflictError(f"Player A has a conflicting match at {conflict_a.start_time}")

    # Check for conflicts for player B
    conflict_b = check_conflict(db, player_b_id, start_time, end_time)
    if conflict_b:
        raise MatchConflictError(f"Player B has a conflicting match at {conflict_b.start_time}")

    # Create match
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
    Accept a pending challenge.

    Args:
        db: Database session
        match_id: Match ID to accept
        user_id: ID of user accepting (must be player B)

    Returns:
        Updated match

    Raises:
        MatchNotFoundError: If match not found
        MatchPermissionError: If user is not player B
        MatchStatusError: If match is not pending
        MatchConflictError: If user now has a conflict
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise MatchNotFoundError(f"Match {match_id} not found")

    # Validate user is player B
    if match.player_b_id != user_id:
        raise MatchPermissionError("Only the challenged player can accept")

    # Validate match is pending
    if match.status != 'pending':
        raise MatchStatusError(f"Cannot accept match with status {match.status}")

    # Check for conflicts (user might have accepted another match)
    conflict = check_conflict(db, user_id, match.start_time, match.end_time, exclude_match_id=match_id)
    if conflict:
        raise MatchConflictError(f"You have a conflicting match at {conflict.start_time}")

    # Update match
    match.status = 'confirmed'
    match.confirmed_at = datetime.now(match.start_time.tzinfo)

    db.commit()
    db.refresh(match)

    return match


def decline_challenge(db: Session, match_id: int, user_id: int) -> Match:
    """
    Decline a pending challenge.

    Args:
        db: Database session
        match_id: Match ID to decline
        user_id: ID of user declining (must be player B)

    Returns:
        Updated match

    Raises:
        MatchNotFoundError: If match not found
        MatchPermissionError: If user is not player B
        MatchStatusError: If match is not pending
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise MatchNotFoundError(f"Match {match_id} not found")

    # Validate user is player B
    if match.player_b_id != user_id:
        raise MatchPermissionError("Only the challenged player can decline")

    # Validate match is pending
    if match.status != 'pending':
        raise MatchStatusError(f"Cannot decline match with status {match.status}")

    # Update match
    match.status = 'declined'
    match.declined_at = datetime.now(match.start_time.tzinfo)

    db.commit()
    db.refresh(match)

    return match


def cancel_match(
    db: Session,
    match_id: int,
    user_id: int,
    cancellation_reason: Optional[str] = None
) -> Match:
    """
    Cancel a match (pending or confirmed).

    Args:
        db: Database session
        match_id: Match ID to cancel
        user_id: ID of user canceling (must be player A or B)
        cancellation_reason: Optional reason for cancellation

    Returns:
        Updated match

    Raises:
        MatchNotFoundError: If match not found
        MatchPermissionError: If user is not a player in the match
        MatchStatusError: If match cannot be canceled
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise MatchNotFoundError(f"Match {match_id} not found")

    # Validate user is a player
    if user_id not in [match.player_a_id, match.player_b_id]:
        raise MatchPermissionError("Only players can cancel the match")

    # Validate match status
    if match.status not in ['pending', 'confirmed']:
        raise MatchStatusError(f"Cannot cancel match with status {match.status}")

    # Update match
    match.status = 'canceled'
    match.canceled_by = user_id
    match.canceled_at = datetime.now(match.start_time.tzinfo)
    match.cancellation_reason = cancellation_reason

    db.commit()
    db.refresh(match)

    return match


def get_user_matches(
    db: Session,
    user_id: int,
    status: Optional[str] = None,
    include_past: bool = True,
    limit: int = 100
) -> List[Match]:
    """
    Get matches for a user.

    Args:
        db: Database session
        user_id: User ID
        status: Optional status filter
        include_past: Whether to include past matches
        limit: Maximum number of matches to return

    Returns:
        List of matches
    """
    query = db.query(Match).filter(
        or_(
            Match.player_a_id == user_id,
            Match.player_b_id == user_id
        )
    )

    if status:
        query = query.filter(Match.status == status)

    if not include_past:
        now = datetime.now(datetime.now().astimezone().tzinfo)
        query = query.filter(Match.start_time > now)

    return query.order_by(Match.start_time.desc()).limit(limit).all()


def get_match_by_id(db: Session, match_id: int, user_id: Optional[int] = None) -> Optional[Match]:
    """
    Get a match by ID.

    Args:
        db: Database session
        match_id: Match ID
        user_id: Optional user ID to verify permission

    Returns:
        Match if found and user has permission

    Raises:
        MatchPermissionError: If user_id provided and user is not a player
    """
    match = db.query(Match).filter(Match.id == match_id).first()

    if match and user_id:
        if user_id not in [match.player_a_id, match.player_b_id]:
            raise MatchPermissionError("You don't have permission to view this match")

    return match


def check_expiration(db: Session) -> List[Match]:
    """
    Check for expired challenges and update their status.

    A challenge expires if:
    - 48 hours have passed since creation
    - Current time is within 2 hours of start time
    - Current time has passed start time

    Args:
        db: Database session

    Returns:
        List of expired matches
    """
    now = datetime.now(datetime.now().astimezone().tzinfo)
    forty_eight_hours_ago = now - timedelta(hours=48)
    two_hours_from_now = now + timedelta(hours=2)

    # Find pending matches that should be expired
    expired_matches = db.query(Match).filter(
        and_(
            Match.status == 'pending',
            or_(
                # Created more than 48 hours ago
                Match.created_at < forty_eight_hours_ago,
                # Within 2 hours of start time
                Match.start_time < two_hours_from_now,
                # Past start time
                Match.start_time < now
            )
        )
    ).all()

    # Update status to expired
    for match in expired_matches:
        match.status = 'expired'
        match.updated_at = now

    if expired_matches:
        db.commit()

    return expired_matches

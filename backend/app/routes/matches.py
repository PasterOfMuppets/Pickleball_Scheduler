"""Match routes for challenges, acceptance, and cancellation."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.models.match import Match
from app.utils.auth import get_current_user
from app.utils.timezone import utc_to_league_time, league_time_to_utc
from app.services import matches as match_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class MatchCreate(BaseModel):
    """Create a match challenge request."""
    player_b_id: int = Field(..., description="ID of the player being challenged")
    start_time: datetime = Field(..., description="Match start time (ISO format, will be interpreted as league time)")
    duration_minutes: int = Field(..., description="Match duration in minutes", ge=60, le=120)

    class Config:
        json_schema_extra = {
            "example": {
                "player_b_id": 2,
                "start_time": "2025-11-18T19:00:00",
                "duration_minutes": 90
            }
        }


class MatchCancel(BaseModel):
    """Cancel a match request."""
    reason: Optional[str] = Field(None, max_length=500, description="Optional cancellation reason")

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Sorry, something came up!"
            }
        }


class UserSummary(BaseModel):
    """User summary for match responses."""
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    """Match response."""
    id: int
    player_a: UserSummary
    player_b: UserSummary
    start_time: str  # Will be league time as string
    end_time: str  # Will be league time as string
    status: str
    created_by: int
    canceled_by: Optional[int]
    cancellation_reason: Optional[str]
    created_at: str
    confirmed_at: Optional[str]
    declined_at: Optional[str]
    canceled_at: Optional[str]
    updated_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("40/day")
@limiter.limit("10/minute")
async def create_challenge(
    match_data: MatchCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new match challenge.

    Rate limits:
    - 40 challenges per day
    - 10 challenges per minute
    """
    try:
        # Convert start_time from league time to UTC
        start_time_utc = league_time_to_utc(match_data.start_time)

        # Create the challenge
        match = match_service.create_challenge(
            db=db,
            player_a_id=current_user.id,
            player_b_id=match_data.player_b_id,
            start_time=start_time_utc,
            duration_minutes=match_data.duration_minutes
        )

        # Convert times back to league time for response
        return _format_match_response(match)

    except match_service.ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[MatchResponse])
@limiter.limit("200/minute")
async def get_matches(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    time_filter: Optional[str] = Query(None, alias="time", description="Filter by time (upcoming, past)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get matches for the current user.

    Query parameters:
    - status: Filter by match status (pending, confirmed, declined, expired, canceled)
    - time: Filter by time (upcoming, past)
    """
    matches = match_service.get_user_matches(
        db=db,
        user_id=current_user.id,
        status=status_filter,
        time_filter=time_filter
    )

    return [_format_match_response(match) for match in matches]


@router.get("/{match_id}", response_model=MatchResponse)
@limiter.limit("200/minute")
async def get_match(
    match_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific match by ID."""
    try:
        match = match_service.get_match_by_id(db=db, match_id=match_id, user_id=current_user.id)
        return _format_match_response(match)
    except match_service.MatchNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    except match_service.UnauthorizedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this match"
        )


@router.post("/{match_id}/accept", response_model=MatchResponse)
@limiter.limit("200/day")
async def accept_challenge(
    match_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a pending challenge (Player B only)."""
    try:
        match = match_service.accept_challenge(db=db, match_id=match_id, user_id=current_user.id)
        return _format_match_response(match)
    except match_service.MatchNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    except match_service.UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except match_service.ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{match_id}/decline", response_model=MatchResponse)
@limiter.limit("200/day")
async def decline_challenge(
    match_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a pending challenge (Player B only)."""
    try:
        match = match_service.decline_challenge(db=db, match_id=match_id, user_id=current_user.id)
        return _format_match_response(match)
    except match_service.MatchNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    except match_service.UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{match_id}/cancel", response_model=MatchResponse)
@limiter.limit("20/day")
async def cancel_match(
    match_id: int,
    cancel_data: MatchCancel,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a match (pending by Player A, or confirmed by either player)."""
    try:
        match = match_service.cancel_match(
            db=db,
            match_id=match_id,
            user_id=current_user.id,
            reason=cancel_data.reason
        )
        return _format_match_response(match)
    except match_service.MatchNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    except match_service.UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


def _format_match_response(match: Match) -> dict:
    """
    Format a match for API response, converting times to league timezone.
    """
    return {
        "id": match.id,
        "player_a": {
            "id": match.player_a.id,
            "name": match.player_a.name,
            "email": match.player_a.email
        },
        "player_b": {
            "id": match.player_b.id,
            "name": match.player_b.name,
            "email": match.player_b.email
        },
        "start_time": utc_to_league_time(match.start_time).isoformat(),
        "end_time": utc_to_league_time(match.end_time).isoformat(),
        "status": match.status,
        "created_by": match.created_by,
        "canceled_by": match.canceled_by,
        "cancellation_reason": match.cancellation_reason,
        "created_at": utc_to_league_time(match.created_at).isoformat(),
        "confirmed_at": utc_to_league_time(match.confirmed_at).isoformat() if match.confirmed_at else None,
        "declined_at": utc_to_league_time(match.declined_at).isoformat() if match.declined_at else None,
        "canceled_at": utc_to_league_time(match.canceled_at).isoformat() if match.canceled_at else None,
        "updated_at": utc_to_league_time(match.updated_at).isoformat()
    }

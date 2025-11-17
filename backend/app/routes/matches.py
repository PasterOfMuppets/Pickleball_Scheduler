"""Match routes for challenges and match management."""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.match import Match
from app.models.user import User
from app.utils.auth import get_current_user
from app.services import matches as match_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class MatchCreate(BaseModel):
    """Create match challenge request."""
    player_b_id: int = Field(..., gt=0, description="ID of player to challenge")
    start_time: datetime = Field(..., description="Match start time (ISO format with timezone)")
    end_time: datetime = Field(..., description="Match end time (ISO format with timezone)")

    class Config:
        json_schema_extra = {
            "example": {
                "player_b_id": 2,
                "start_time": "2025-11-20T19:00:00-05:00",
                "end_time": "2025-11-20T20:30:00-05:00"
            }
        }


class MatchCancelRequest(BaseModel):
    """Cancel match request."""
    cancellation_reason: Optional[str] = Field(None, max_length=500, description="Optional reason for cancellation")

    class Config:
        json_schema_extra = {
            "example": {
                "cancellation_reason": "Something came up, sorry!"
            }
        }


class UserInfo(BaseModel):
    """Basic user information."""
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    """Match response with player details."""
    id: int
    player_a_id: int
    player_b_id: int
    player_a: Optional[UserInfo] = None
    player_b: Optional[UserInfo] = None
    start_time: datetime
    end_time: datetime
    status: str
    created_by: int
    canceled_by: Optional[int] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("40/day")
async def create_match_challenge(
    request: Request,
    match_data: MatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new match challenge.

    Rate limits:
    - 40 challenges per day per player
    - Additional limit of 10 challenges to same player per day checked in service

    Validates:
    - No conflicts for either player
    - Valid time range
    - Different players
    """
    try:
        # Check if challenging the same player too many times
        recent_challenges = match_service.get_user_matches(
            db, current_user.id, status='pending', include_past=False
        )
        same_player_count = sum(
            1 for m in recent_challenges
            if m.player_b_id == match_data.player_b_id
        )
        if same_player_count >= 10:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum 10 pending challenges to same player"
            )

        match = match_service.create_challenge(
            db,
            player_a_id=current_user.id,
            player_b_id=match_data.player_b_id,
            start_time=match_data.start_time,
            end_time=match_data.end_time
        )

        # Load player details for response
        db.refresh(match)
        return match

    except match_service.MatchConflictError as e:
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
    status_filter: Optional[str] = None,
    include_past: bool = True,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get matches for the current user.

    Query parameters:
    - status_filter: Filter by status (pending, confirmed, declined, expired, canceled)
    - include_past: Include past matches (default: true)
    - limit: Maximum number of matches (default: 100, max: 100)
    """
    if limit > 100:
        limit = 100

    matches = match_service.get_user_matches(
        db,
        user_id=current_user.id,
        status=status_filter,
        include_past=include_past,
        limit=limit
    )

    return matches


@router.get("/{match_id}", response_model=MatchResponse)
@limiter.limit("200/minute")
async def get_match(
    request: Request,
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific match."""
    try:
        match = match_service.get_match_by_id(db, match_id, user_id=current_user.id)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        return match

    except match_service.MatchPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/{match_id}/accept", response_model=MatchResponse)
@limiter.limit("200/day")
async def accept_match(
    request: Request,
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept a pending challenge.

    Only the challenged player (player_b) can accept.
    """
    try:
        match = match_service.accept_challenge(db, match_id, current_user.id)
        return match

    except match_service.MatchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except match_service.MatchPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except match_service.MatchStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except match_service.MatchConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.post("/{match_id}/decline", response_model=MatchResponse)
@limiter.limit("200/day")
async def decline_match(
    request: Request,
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Decline a pending challenge.

    Only the challenged player (player_b) can decline.
    """
    try:
        match = match_service.decline_challenge(db, match_id, current_user.id)
        return match

    except match_service.MatchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except match_service.MatchPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except match_service.MatchStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{match_id}/cancel", response_model=MatchResponse)
@limiter.limit("20/day")
async def cancel_match_route(
    request: Request,
    match_id: int,
    cancel_data: MatchCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a match (pending or confirmed).

    Either player can cancel.
    """
    try:
        match = match_service.cancel_match(
            db,
            match_id,
            current_user.id,
            cancellation_reason=cancel_data.cancellation_reason
        )
        return match

    except match_service.MatchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except match_service.MatchPermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except match_service.MatchStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

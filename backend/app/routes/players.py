"""Players API endpoints for player profiles and statistics."""
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.utils.exceptions import NotFoundException
from pydantic import BaseModel

router = APIRouter()


class PlayerHistoryItem(BaseModel):
    """Individual match history item."""
    match_id: int
    opponent_id: int
    opponent_name: str
    start_time: str
    end_time: str
    status: str
    result: Optional[str] = None


class PlayerHistoryResponse(BaseModel):
    """Response model for player history."""
    player_id: int
    player_name: str
    matches: List[PlayerHistoryItem]
    total_matches: int
    message: str


@router.get("/{player_id}/history")
def get_player_history(
    player_id: int = Path(..., description="The ID of the player"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PlayerHistoryResponse:
    """
    Get match history for a specific player.

    This endpoint handles requests for player match history, which may come from
    external applications or browser extensions.

    Args:
        player_id: The ID of the player to retrieve history for
        current_user: The authenticated user making the request
        db: Database session

    Returns:
        PlayerHistoryResponse: Player history with match records

    Raises:
        NotFoundException: If the player does not exist
    """
    # Verify the player exists
    player = db.query(User).filter(User.id == player_id).first()
    if not player:
        raise NotFoundException(
            message=f"Player with ID {player_id} not found",
            details={"player_id": player_id}
        )

    # TODO: Implement actual match history retrieval
    # This would query the matches table for all matches where
    # player_a_id == player_id OR player_b_id == player_id
    # and return them in chronological order

    return PlayerHistoryResponse(
        player_id=player_id,
        player_name=player.name,
        matches=[],
        total_matches=0,
        message="Player history endpoint is available. Match history features are not yet fully implemented."
    )


@router.get("/{player_id}")
def get_player_profile(
    player_id: int = Path(..., description="The ID of the player"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get public profile for a specific player.

    Args:
        player_id: The ID of the player to retrieve
        current_user: The authenticated user making the request
        db: Database session

    Returns:
        dict: Player profile information

    Raises:
        NotFoundException: If the player does not exist
    """
    player = db.query(User).filter(User.id == player_id).first()
    if not player:
        raise NotFoundException(
            message=f"Player with ID {player_id} not found",
            details={"player_id": player_id}
        )

    return {
        "id": player.id,
        "name": player.name,
        "status": player.status,
        "role": player.role,
        "message": "Player profile endpoint is available."
    }

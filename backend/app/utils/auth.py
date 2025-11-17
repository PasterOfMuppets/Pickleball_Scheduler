"""Authentication utilities (stub for Phase 2 - will be completed in Phase 1)."""
from typing import Optional
from fastapi import Depends, HTTPException, Header

from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> int:
    """Get current user ID from authorization header.

    This is a stub implementation for Phase 2 development.
    In Phase 1, this will implement proper JWT token validation.

    For now, it expects a simple user ID in the Authorization header.

    Args:
        authorization: Authorization header (format: "Bearer <user_id>")
        db: Database session

    Returns:
        int: User ID

    Raises:
        HTTPException: If not authenticated
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Include Authorization header with user ID."
        )

    try:
        # Simple stub: expect "Bearer <user_id>"
        if authorization.startswith("Bearer "):
            user_id = int(authorization.split(" ")[1])
            return user_id
        else:
            user_id = int(authorization)
            return user_id
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format. Use: Bearer <user_id>"
        )


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    """Get current user object from database.

    Args:
        user_id: Current user ID
        db: Database session

    Returns:
        User: Current user object

    Raises:
        HTTPException: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user

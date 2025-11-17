"""User routes - profile management and vacation mode."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.schemas import UserResponse, UserUpdate, VacationUpdate
from app.utils.auth import get_current_active_user
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create router
router = APIRouter()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's profile.

    Requires: Valid JWT token

    Returns:
        Current user profile
    """
    return current_user


@router.put("/me", response_model=UserResponse)
@limiter.limit("100/day")  # 100 profile updates per day
async def update_my_profile(
    request: Request,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.

    Rate limit: 100 per day

    Args:
        user_update: Fields to update (name, email, phone)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user profile

    Raises:
        HTTPException: If email is already taken by another user
    """
    # Check if email is being updated and already exists
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account"
            )

    # Update fields if provided
    if user_update.name is not None:
        current_user.name = user_update.name

    if user_update.email is not None:
        current_user.email = user_update.email

    if user_update.phone is not None:
        current_user.phone = user_update.phone

    db.commit()
    db.refresh(current_user)

    return current_user


@router.patch("/me/vacation", response_model=UserResponse)
@limiter.limit("40/day")  # 40 vacation updates per day
async def set_vacation_mode(
    request: Request,
    vacation_data: VacationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Set or update vacation mode for current user.

    Rate limit: 40 per day

    When vacation mode is active:
    - User does not appear in overlap detection
    - User cannot send or receive challenges
    - Status is automatically set to 'vacation'

    Args:
        vacation_data: Vacation end date (or null to end vacation)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user profile with vacation status
    """
    if vacation_data.vacation_until is None:
        # End vacation immediately
        current_user.status = "active"
        current_user.vacation_until = None
    else:
        # Set vacation mode
        current_user.status = "vacation"
        current_user.vacation_until = vacation_data.vacation_until

    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me/vacation", response_model=UserResponse)
async def end_vacation_mode(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    End vacation mode immediately (convenience endpoint).

    Requires: Valid JWT token

    Returns:
        Updated user profile with active status
    """
    current_user.status = "active"
    current_user.vacation_until = None

    db.commit()
    db.refresh(current_user)

    return current_user

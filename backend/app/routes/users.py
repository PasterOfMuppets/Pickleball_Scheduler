"""User routes for profile management."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user, get_password_hash

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class UserUpdate(BaseModel):
    """User profile update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe Updated",
                "email": "john.new@example.com",
                "phone": "+1234567890"
            }
        }


class VacationUpdate(BaseModel):
    """Vacation mode update request."""
    vacation_until: Optional[date] = None  # None to end vacation early

    class Config:
        json_schema_extra = {
            "example": {
                "vacation_until": "2025-12-31"
            }
        }


class UserResponse(BaseModel):
    """User response (no password)."""
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str
    status: str
    vacation_until: Optional[date]

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get own user profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
@limiter.limit("100/day")
async def update_my_profile(
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update own user profile."""
    # Check if new email is already taken by another user
    if user_data.email and user_data.email != current_user.email:
        existing_user = db.query(User).filter(
            User.email == user_data.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )

    # Update fields if provided
    if user_data.name is not None:
        current_user.name = user_data.name
    if user_data.email is not None:
        current_user.email = user_data.email
    if user_data.phone is not None:
        current_user.phone = user_data.phone

    db.commit()
    db.refresh(current_user)

    return current_user


@router.patch("/me/vacation", response_model=UserResponse)
@limiter.limit("40/day")
async def set_vacation_mode(
    vacation_data: VacationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set or end vacation mode."""
    if vacation_data.vacation_until is None:
        # End vacation early
        current_user.status = "active"
        current_user.vacation_until = None
    else:
        # Set vacation mode
        if vacation_data.vacation_until < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vacation end date must be in the future"
            )
        current_user.status = "vacation"
        current_user.vacation_until = vacation_data.vacation_until

    db.commit()
    db.refresh(current_user)

    return current_user

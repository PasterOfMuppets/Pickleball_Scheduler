"""Pydantic schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# Auth schemas
class UserRegister(BaseModel):
    """Schema for user registration."""

    name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 characters)")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number for SMS notifications")
    sms_opt_in: bool = Field(default=False, description="SMS notification consent (required for SMS)")

    @field_validator('phone')
    @classmethod
    def validate_phone_with_sms(cls, v, info):
        """Validate that phone is provided if SMS opt-in is True."""
        if info.data.get('sms_opt_in') and not v:
            raise ValueError('Phone number required when opting in to SMS notifications')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User password")


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class TokenData(BaseModel):
    """Schema for token payload data."""

    user_id: Optional[int] = None


# User schemas
class UserResponse(BaseModel):
    """Schema for user profile response."""

    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str
    status: str
    vacation_until: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Allows ORM models to be used


class UserUpdate(BaseModel):
    """Schema for user profile update."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)


class VacationUpdate(BaseModel):
    """Schema for vacation mode update."""

    vacation_until: Optional[date] = Field(
        None,
        description="Date when vacation ends (inclusive). Set to null to end vacation immediately."
    )

    @field_validator('vacation_until')
    @classmethod
    def validate_vacation_date(cls, v):
        """Validate that vacation_until is not in the past."""
        if v is not None and v < date.today():
            raise ValueError('Vacation end date cannot be in the past')
        return v


# Minimal user info (for listing opponents, etc.)
class UserMinimal(BaseModel):
    """Minimal user information for listings."""

    id: int
    name: str
    email: str
    status: str

    class Config:
        from_attributes = True

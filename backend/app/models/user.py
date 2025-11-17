"""User model for authentication and profile management."""
from sqlalchemy import BigInteger, Boolean, Column, String, text
from sqlalchemy.dialects.postgresql import TIMESTAMP

from app.database import Base


class User(Base):
    """User model for players and admins."""

    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)

    # Role: 'player' or 'admin'
    role = Column(String(20), nullable=False, default="player")

    # Status: 'active', 'vacation', or 'inactive'
    status = Column(String(20), nullable=False, default="active")

    # Vacation mode
    vacation_until = Column(TIMESTAMP(timezone=True), nullable=True)

    # SMS consent for notifications
    sms_consent = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("NOW()")
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=text("NOW()")
    )

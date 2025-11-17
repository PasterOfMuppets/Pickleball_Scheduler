"""User model."""
from sqlalchemy import Column, BigInteger, String, DateTime, Date, CheckConstraint
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for players and admins."""

    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="player")  # 'player' or 'admin'
    status = Column(String(20), nullable=False, default="active")  # 'active' | 'vacation' | 'inactive'
    vacation_until = Column(Date, nullable=True)  # Inclusive date when vacation ends
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('player', 'admin')", name="valid_role"),
        CheckConstraint("status IN ('active', 'vacation', 'inactive')", name="valid_status"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role}, status={self.status})>"

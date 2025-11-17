"""Availability models for recurring patterns and blocks."""
from datetime import datetime, time
from sqlalchemy import (
    Column, BigInteger, Integer, Time, DateTime, Boolean,
    ForeignKey, CheckConstraint, UniqueConstraint, Index, text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RecurringAvailability(Base):
    """Recurring weekly availability pattern."""

    __tablename__ = "recurring_availability"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 1=Monday, 7=Sunday
    start_time_local = Column(Time, nullable=False)  # e.g., '19:00:00' (7 PM)
    end_time_local = Column(Time, nullable=False)  # e.g., '21:00:00' (9 PM)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="recurring_patterns")
    generated_blocks = relationship("AvailabilityBlock", back_populates="recurring_pattern", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="valid_day"),
        CheckConstraint("start_time_local < end_time_local", name="valid_time_order"),
        Index("idx_recurring_availability_user", "user_id", postgresql_where=text("enabled = TRUE")),
    )

    def __repr__(self):
        return f"<RecurringAvailability(id={self.id}, user_id={self.user_id}, day={self.day_of_week}, time={self.start_time_local}-{self.end_time_local})>"


class AvailabilityBlock(Base):
    """Generated 30-minute availability blocks."""

    __tablename__ = "availability_blocks"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)  # UTC, on 30-min boundary
    end_time = Column(DateTime(timezone=True), nullable=False)  # UTC, 30 mins after start_time
    generated_from_recurring = Column(BigInteger, ForeignKey("recurring_availability.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="availability_blocks")
    recurring_pattern = relationship("RecurringAvailability", back_populates="generated_blocks")

    # Constraints and indexes
    __table_args__ = (
        # SQLite doesn't support INTERVAL in CHECK constraints, so we'll validate in application
        CheckConstraint("start_time < end_time", name="valid_order"),
        UniqueConstraint("user_id", "start_time", name="unique_user_time_slot"),
        Index("idx_availability_blocks_user_time", "user_id", "start_time"),
        Index("idx_availability_blocks_time_range", "start_time", "end_time"),
    )

    def __repr__(self):
        return f"<AvailabilityBlock(id={self.id}, user_id={self.user_id}, time={self.start_time}-{self.end_time})>"

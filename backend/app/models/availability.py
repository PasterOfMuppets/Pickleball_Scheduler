"""Availability models for recurring patterns and generated blocks."""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.database import Base


class RecurringAvailability(Base):
    """Recurring weekly availability patterns.

    Stores user's weekly schedule in local time (e.g., 'Every Monday 7-9 PM').
    Background job generates actual availability blocks from these patterns.
    """

    __tablename__ = "recurring_availability"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 1=Monday, 7=Sunday
    start_time_local = Column(Time, nullable=False)  # e.g., '19:00:00' (7 PM)
    end_time_local = Column(Time, nullable=False)    # e.g., '21:00:00' (9 PM)
    enabled = Column(Boolean, default=True, nullable=False)

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

    # Constraints
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="valid_day"),
        CheckConstraint("start_time_local < end_time_local", name="valid_time_order"),
        Index("idx_recurring_availability_user", "user_id", postgresql_where=text("enabled = TRUE")),
    )

    # Relationships
    # user = relationship("User", back_populates="recurring_availability")
    generated_blocks = relationship(
        "AvailabilityBlock",
        back_populates="recurring_pattern",
        foreign_keys="AvailabilityBlock.generated_from_recurring"
    )


class AvailabilityBlock(Base):
    """Individual 30-minute availability blocks.

    Generated from recurring patterns OR manually added by users.
    All times stored in UTC. Used for overlap detection and match scheduling.
    """

    __tablename__ = "availability_blocks"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)  # UTC, on 30-min boundary
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)    # UTC, exactly 30 mins after start

    # Track if generated from recurring pattern (NULL = manual one-time block)
    generated_from_recurring = Column(
        BigInteger,
        ForeignKey("recurring_availability.id", ondelete="SET NULL"),
        nullable=True
    )

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

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "end_time = start_time + INTERVAL '30 minutes'",
            name="valid_duration"
        ),
        CheckConstraint("start_time < end_time", name="valid_order"),
        # Prevent duplicates for same user + time slot
        Index("uq_availability_blocks_user_start", "user_id", "start_time", unique=True),
        # Index for overlap queries
        Index("idx_availability_blocks_user_time", "user_id", "start_time"),
        # Index for time range queries
        Index("idx_availability_blocks_time_range", "start_time", "end_time"),
    )

    # Relationships
    # user = relationship("User", back_populates="availability_blocks")
    recurring_pattern = relationship(
        "RecurringAvailability",
        back_populates="generated_blocks",
        foreign_keys=[generated_from_recurring]
    )

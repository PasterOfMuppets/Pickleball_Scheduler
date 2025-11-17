"""Match model."""
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, Text, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Match(Base):
    """Match model for challenges and scheduled games."""

    __tablename__ = "matches"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    player_a_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    player_b_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending | confirmed | declined | expired | canceled
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)

    # Cancellation tracking
    canceled_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Timestamps for lifecycle tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    player_a = relationship("User", foreign_keys=[player_a_id])
    player_b = relationship("User", foreign_keys=[player_b_id])
    creator = relationship("User", foreign_keys=[created_by])
    canceler = relationship("User", foreign_keys=[canceled_by])

    # Constraints
    __table_args__ = (
        CheckConstraint('start_time < end_time', name='valid_match_time'),
        CheckConstraint('player_a_id != player_b_id', name='different_players'),
    )

    def __repr__(self):
        return f"<Match(id={self.id}, player_a_id={self.player_a_id}, player_b_id={self.player_b_id}, status='{self.status}', start_time={self.start_time})>"

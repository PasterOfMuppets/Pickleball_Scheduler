from sqlalchemy import Column, BigInteger, String, Text, ForeignKey, CheckConstraint, Index, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Match(Base):
    """
    Match model representing a pickleball match challenge between two players.

    Lifecycle:
    - pending: Challenge sent, awaiting Player B's response
    - confirmed: Player B accepted, match is scheduled
    - declined: Player B declined the challenge
    - expired: Challenge expired (48h timeout OR 2h before match OR past start_time)
    - canceled: Match was canceled by either player
    """
    __tablename__ = "matches"

    id = Column(BigInteger, primary_key=True, index=True)
    player_a_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    player_b_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), nullable=False)  # pending | confirmed | declined | expired | canceled
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)

    # Cancellation tracking
    canceled_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Timestamps for lifecycle tracking
    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()", onupdate="NOW()")

    # Relationships
    player_a = relationship("User", foreign_keys=[player_a_id], backref="matches_as_player_a")
    player_b = relationship("User", foreign_keys=[player_b_id], backref="matches_as_player_b")
    creator = relationship("User", foreign_keys=[created_by])
    canceler = relationship("User", foreign_keys=[canceled_by])

    # Constraints
    __table_args__ = (
        CheckConstraint("start_time < end_time", name="valid_match_time"),
        CheckConstraint("player_a_id != player_b_id", name="different_players"),
        # Indexes for conflict detection
        Index("idx_matches_player_a_time", "player_a_id", "start_time", "end_time",
              postgresql_where="status IN ('pending', 'confirmed')"),
        Index("idx_matches_player_b_time", "player_b_id", "start_time", "end_time",
              postgresql_where="status IN ('pending', 'confirmed')"),
        # Index for analytics on cancellations
        Index("idx_matches_canceled", "canceled_by", "canceled_at",
              postgresql_where="status = 'canceled'"),
    )

    def __repr__(self):
        return f"<Match(id={self.id}, player_a_id={self.player_a_id}, player_b_id={self.player_b_id}, status={self.status})>"

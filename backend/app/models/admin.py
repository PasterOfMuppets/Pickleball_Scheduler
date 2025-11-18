"""Admin action log model for tracking admin activities."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class AdminActionLog(Base):
    """
    Log of admin actions for audit purposes.

    Tracks all administrative actions including impersonation,
    user status changes, and match modifications.
    """
    __tablename__ = "admin_action_log"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    acting_as_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g., "impersonate_start", "update_user_status", "cancel_match"
    resource_type = Column(String(50), nullable=True)  # e.g., "user", "match", "availability"
    resource_id = Column(Integer, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Additional context (old/new values, etc.)
    description = Column(Text, nullable=True)  # Human-readable description
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id], backref="admin_actions")
    acting_as_user = relationship("User", foreign_keys=[acting_as_user_id])

    def __repr__(self):
        impersonating = f" (acting as {self.acting_as_user_id})" if self.acting_as_user_id else ""
        return f"<AdminActionLog {self.id}: Admin {self.admin_id}{impersonating} - {self.action}>"

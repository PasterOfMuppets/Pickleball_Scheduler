"""Admin utilities and middleware for authorization and audit logging."""

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.admin import AdminActionLog
from app.utils.auth import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role.

    Args:
        current_user: The authenticated user

    Returns:
        User object if admin

    Raises:
        HTTPException: 403 if user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def log_admin_action(
    db: Session,
    admin_id: int,
    action: str,
    acting_as_user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None
) -> AdminActionLog:
    """
    Log an admin action to the audit trail.

    Args:
        db: Database session
        admin_id: ID of the admin performing the action
        action: Action being performed (e.g., "update_user_status", "cancel_match")
        acting_as_user_id: ID of user being impersonated (if applicable)
        resource_type: Type of resource being acted upon (e.g., "user", "match")
        resource_id: ID of the resource
        metadata: Additional context (old/new values, etc.)
        description: Human-readable description

    Returns:
        AdminActionLog: The created log entry
    """
    log_entry = AdminActionLog(
        admin_id=admin_id,
        acting_as_user_id=acting_as_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        extra_data=metadata,
        description=description
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return log_entry


# Impersonation session management
# In a production app, this would use Redis or similar
# For MVP, we'll use a simple in-memory dict
_impersonation_sessions: Dict[int, int] = {}  # {admin_id: impersonated_user_id}


def start_impersonation(
    db: Session,
    admin: User,
    target_user_id: int
) -> User:
    """
    Start impersonating another user.

    Args:
        db: Database session
        admin: The admin user
        target_user_id: ID of user to impersonate

    Returns:
        The user being impersonated

    Raises:
        HTTPException: 404 if target user not found
        HTTPException: 403 if trying to impersonate another admin
    """
    # Get target user
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {target_user_id} not found"
        )

    # Prevent impersonating other admins
    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot impersonate other administrators"
        )

    # Store impersonation session
    _impersonation_sessions[admin.id] = target_user_id

    # Log the action
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="impersonate_start",
        acting_as_user_id=target_user_id,
        resource_type="user",
        resource_id=target_user_id,
        description=f"Admin {admin.name} started impersonating {target_user.name}"
    )

    return target_user


def stop_impersonation(db: Session, admin: User) -> None:
    """
    Stop impersonating a user.

    Args:
        db: Database session
        admin: The admin user
    """
    if admin.id in _impersonation_sessions:
        impersonated_user_id = _impersonation_sessions[admin.id]
        del _impersonation_sessions[admin.id]

        # Log the action
        log_admin_action(
            db=db,
            admin_id=admin.id,
            action="impersonate_stop",
            acting_as_user_id=impersonated_user_id,
            description=f"Admin {admin.name} stopped impersonating user {impersonated_user_id}"
        )


def get_effective_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the effective user (either current user or impersonated user if admin).

    This dependency should be used in routes that support impersonation.

    Args:
        current_user: The authenticated user
        db: Database session

    Returns:
        The effective user (impersonated user if admin is impersonating, otherwise current user)
    """
    # If not an admin, return current user
    if current_user.role != "admin":
        return current_user

    # Check if admin is impersonating someone
    if current_user.id in _impersonation_sessions:
        impersonated_user_id = _impersonation_sessions[current_user.id]
        impersonated_user = db.query(User).filter(User.id == impersonated_user_id).first()

        if impersonated_user:
            return impersonated_user

    # Not impersonating, return admin user
    return current_user


def get_impersonation_context(admin: User) -> Optional[Dict[str, Any]]:
    """
    Get impersonation context for the admin.

    Args:
        admin: The admin user

    Returns:
        Dictionary with impersonation info, or None if not impersonating
    """
    if admin.role != "admin":
        return None

    if admin.id in _impersonation_sessions:
        return {
            "is_impersonating": True,
            "impersonated_user_id": _impersonation_sessions[admin.id]
        }

    return {
        "is_impersonating": False,
        "impersonated_user_id": None
    }

"""Admin routes for user management, impersonation, and analytics."""

from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import User
from app.models.match import Match
from app.models.admin import AdminActionLog
from app.utils.admin import (
    require_admin,
    log_admin_action,
    start_impersonation,
    stop_impersonation,
    get_impersonation_context
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Pydantic schemas
class UserListResponse(BaseModel):
    """User list item response."""
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str
    status: str
    vacation_until: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class UpdateUserStatusRequest(BaseModel):
    """Request to update user status."""
    status: str  # "active", "vacation", "inactive"
    vacation_until: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "vacation",
                "vacation_until": "2025-12-31"
            }
        }


class ImpersonationResponse(BaseModel):
    """Impersonation status response."""
    is_impersonating: bool
    impersonated_user_id: Optional[int]
    impersonated_user_name: Optional[str]


class AdminActionLogResponse(BaseModel):
    """Admin action log entry."""
    id: int
    admin_id: int
    admin_name: str
    acting_as_user_id: Optional[int]
    acting_as_user_name: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    extra_data: Optional[dict]
    description: Optional[str]
    timestamp: str

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    """System analytics response."""
    total_users: int
    active_users: int
    users_on_vacation: int
    inactive_users: int
    total_matches: int
    pending_matches: int
    confirmed_matches: int
    completed_matches: int
    canceled_matches: int
    matches_this_week: int
    matches_last_week: int
    cancellation_rate: float


# ==================== USER MANAGEMENT ====================

@router.get("/users", response_model=List[UserListResponse])
@limiter.limit("100/minute")
async def get_all_users(
    request: Request,
    status_filter: Optional[str] = Query(None, description="Filter by status (active, vacation, inactive)"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all users (admin only).

    Args:
        status_filter: Optional status filter
        search: Optional search query
        admin: Current admin user
        db: Database session

    Returns:
        List of users
    """
    query = db.query(User)

    # Apply filters
    if status_filter:
        query = query.filter(User.status == status_filter)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    users = query.order_by(User.created_at.desc()).all()

    return [
        UserListResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            role=u.role,
            status=u.status,
            vacation_until=u.vacation_until.isoformat() if u.vacation_until else None,
            created_at=u.created_at.isoformat()
        )
        for u in users
    ]


@router.patch("/users/{user_id}/status")
@limiter.limit("50/minute")
async def update_user_status(
    request: Request,
    user_id: int,
    update_data: UpdateUserStatusRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update user status (admin only).

    Args:
        user_id: User ID to update
        update_data: New status data
        admin: Current admin user
        db: Database session

    Returns:
        Updated user
    """
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )

    # Cannot modify other admins
    if user.role == "admin" and user.id != admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify other administrators"
        )

    # Store old values for logging
    old_status = user.status
    old_vacation_until = user.vacation_until

    # Update status
    user.status = update_data.status

    if update_data.status == "vacation" and update_data.vacation_until:
        user.vacation_until = datetime.fromisoformat(update_data.vacation_until)
    else:
        user.vacation_until = None

    db.commit()
    db.refresh(user)

    # Log the action
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="update_user_status",
        resource_type="user",
        resource_id=user.id,
        extra_data={
            "old_status": old_status,
            "new_status": update_data.status,
            "old_vacation_until": old_vacation_until.isoformat() if old_vacation_until else None,
            "new_vacation_until": update_data.vacation_until
        },
        description=f"Changed user {user.name} status from {old_status} to {update_data.status}"
    )

    return UserListResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        status=user.status,
        vacation_until=user.vacation_until.isoformat() if user.vacation_until else None,
        created_at=user.created_at.isoformat()
    )


# ==================== IMPERSONATION ====================

@router.post("/impersonate/{user_id}", response_model=ImpersonationResponse)
@limiter.limit("20/minute")
async def start_impersonating(
    request: Request,
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Start impersonating a user (admin only).

    Args:
        user_id: User ID to impersonate
        admin: Current admin user
        db: Database session

    Returns:
        Impersonation status
    """
    target_user = start_impersonation(db, admin, user_id)

    return ImpersonationResponse(
        is_impersonating=True,
        impersonated_user_id=target_user.id,
        impersonated_user_name=target_user.name
    )


@router.post("/stop-impersonate", response_model=ImpersonationResponse)
@limiter.limit("20/minute")
async def stop_impersonating(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Stop impersonating a user (admin only).

    Args:
        admin: Current admin user
        db: Database session

    Returns:
        Impersonation status
    """
    stop_impersonation(db, admin)

    return ImpersonationResponse(
        is_impersonating=False,
        impersonated_user_id=None,
        impersonated_user_name=None
    )


@router.get("/impersonation-status", response_model=ImpersonationResponse)
@limiter.limit("100/minute")
async def get_impersonation_status(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get current impersonation status (admin only).

    Args:
        admin: Current admin user
        db: Database session

    Returns:
        Impersonation status
    """
    context = get_impersonation_context(admin)

    if context and context["is_impersonating"]:
        user_id = context["impersonated_user_id"]
        user = db.query(User).filter(User.id == user_id).first()

        return ImpersonationResponse(
            is_impersonating=True,
            impersonated_user_id=user_id,
            impersonated_user_name=user.name if user else None
        )

    return ImpersonationResponse(
        is_impersonating=False,
        impersonated_user_id=None,
        impersonated_user_name=None
    )


# ==================== ACTION LOG ====================

@router.get("/action-log", response_model=List[AdminActionLogResponse])
@limiter.limit("100/minute")
async def get_action_log(
    request: Request,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    admin_id: Optional[int] = Query(None, description="Filter by admin ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get admin action log (admin only).

    Args:
        limit: Number of entries to return
        offset: Offset for pagination
        admin_id: Optional filter by admin ID
        action: Optional filter by action type
        admin: Current admin user
        db: Database session

    Returns:
        List of admin action log entries
    """
    query = db.query(AdminActionLog)

    # Apply filters
    if admin_id:
        query = query.filter(AdminActionLog.admin_id == admin_id)

    if action:
        query = query.filter(AdminActionLog.action == action)

    # Get entries
    entries = query.order_by(AdminActionLog.timestamp.desc()).limit(limit).offset(offset).all()

    # Build response with user names
    result = []
    for entry in entries:
        admin_user = db.query(User).filter(User.id == entry.admin_id).first()
        acting_as_user = None
        if entry.acting_as_user_id:
            acting_as_user = db.query(User).filter(User.id == entry.acting_as_user_id).first()

        result.append(AdminActionLogResponse(
            id=entry.id,
            admin_id=entry.admin_id,
            admin_name=admin_user.name if admin_user else "Unknown",
            acting_as_user_id=entry.acting_as_user_id,
            acting_as_user_name=acting_as_user.name if acting_as_user else None,
            action=entry.action,
            resource_type=entry.resource_type,
            resource_id=entry.resource_id,
            extra_data=entry.extra_data,
            description=entry.description,
            timestamp=entry.timestamp.isoformat()
        ))

    return result


# ==================== ANALYTICS ====================

@router.get("/analytics", response_model=AnalyticsResponse)
@limiter.limit("60/minute")
async def get_analytics(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get system analytics (admin only).

    Args:
        admin: Current admin user
        db: Database session

    Returns:
        System analytics
    """
    # User stats
    total_users = db.query(func.count(User.id)).filter(User.role == "player").scalar()
    active_users = db.query(func.count(User.id)).filter(
        and_(User.role == "player", User.status == "active")
    ).scalar()
    users_on_vacation = db.query(func.count(User.id)).filter(
        and_(User.role == "player", User.status == "vacation")
    ).scalar()
    inactive_users = db.query(func.count(User.id)).filter(
        and_(User.role == "player", User.status == "inactive")
    ).scalar()

    # Match stats
    total_matches = db.query(func.count(Match.id)).scalar()
    pending_matches = db.query(func.count(Match.id)).filter(Match.status == "pending").scalar()
    confirmed_matches = db.query(func.count(Match.id)).filter(Match.status == "confirmed").scalar()

    # Calculate completed matches (past confirmed matches)
    now = datetime.utcnow()
    completed_matches = db.query(func.count(Match.id)).filter(
        and_(
            Match.status == "confirmed",
            Match.end_time < now
        )
    ).scalar()

    canceled_matches = db.query(func.count(Match.id)).filter(Match.status == "canceled").scalar()

    # Matches this week
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    matches_this_week = db.query(func.count(Match.id)).filter(
        Match.start_time >= week_start
    ).scalar()

    # Matches last week
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start
    matches_last_week = db.query(func.count(Match.id)).filter(
        and_(
            Match.start_time >= last_week_start,
            Match.start_time < last_week_end
        )
    ).scalar()

    # Cancellation rate
    total_created = db.query(func.count(Match.id)).filter(
        Match.status.in_(["confirmed", "canceled"])
    ).scalar()
    cancellation_rate = (canceled_matches / total_created * 100) if total_created > 0 else 0.0

    return AnalyticsResponse(
        total_users=total_users or 0,
        active_users=active_users or 0,
        users_on_vacation=users_on_vacation or 0,
        inactive_users=inactive_users or 0,
        total_matches=total_matches or 0,
        pending_matches=pending_matches or 0,
        confirmed_matches=confirmed_matches or 0,
        completed_matches=completed_matches or 0,
        canceled_matches=canceled_matches or 0,
        matches_this_week=matches_this_week or 0,
        matches_last_week=matches_last_week or 0,
        cancellation_rate=round(cancellation_rate, 2)
    )


# ==================== MATCH MANAGEMENT ====================

class MatchListResponse(BaseModel):
    """Match list item for admin view."""
    id: int
    player_a_id: int
    player_a_name: str
    player_b_id: int
    player_b_name: str
    start_time: str
    end_time: str
    status: str
    canceled_by_id: Optional[int]
    canceled_reason: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class CancelMatchRequest(BaseModel):
    """Request to cancel a match."""
    reason: str

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Court maintenance - admin canceled"
            }
        }


@router.get("/matches", response_model=List[MatchListResponse])
@limiter.limit("100/minute")
async def get_all_matches(
    request: Request,
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all matches (admin only).

    Args:
        status_filter: Optional status filter
        user_id: Optional user ID filter
        limit: Number of matches to return
        offset: Offset for pagination
        admin: Current admin user
        db: Database session

    Returns:
        List of matches
    """
    query = db.query(Match)

    # Apply filters
    if status_filter:
        query = query.filter(Match.status == status_filter)

    if user_id:
        query = query.filter(
            or_(
                Match.player_a_id == user_id,
                Match.player_b_id == user_id
            )
        )

    matches = query.order_by(Match.start_time.desc()).limit(limit).offset(offset).all()

    # Build response with player names
    result = []
    for match in matches:
        player_a = db.query(User).filter(User.id == match.player_a_id).first()
        player_b = db.query(User).filter(User.id == match.player_b_id).first()

        result.append(MatchListResponse(
            id=match.id,
            player_a_id=match.player_a_id,
            player_a_name=player_a.name if player_a else "Unknown",
            player_b_id=match.player_b_id,
            player_b_name=player_b.name if player_b else "Unknown",
            start_time=match.start_time.isoformat(),
            end_time=match.end_time.isoformat(),
            status=match.status,
            canceled_by_id=match.canceled_by_id,
            canceled_reason=match.canceled_reason,
            created_at=match.created_at.isoformat()
        ))

    return result


@router.delete("/matches/{match_id}")
@limiter.limit("50/minute")
async def cancel_match_admin(
    request: Request,
    match_id: int,
    cancel_data: CancelMatchRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Cancel any match (admin only).

    Args:
        match_id: Match ID to cancel
        cancel_data: Cancellation reason
        admin: Current admin user
        db: Database session

    Returns:
        Canceled match
    """
    # Get match
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match {match_id} not found"
        )

    # Can't cancel already canceled or completed matches
    if match.status == "canceled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match is already canceled"
        )

    # Store old status for logging
    old_status = match.status

    # Update match
    match.status = "canceled"
    match.canceled_by_id = admin.id
    match.canceled_reason = f"[ADMIN] {cancel_data.reason}"

    db.commit()
    db.refresh(match)

    # Log the action
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="cancel_match",
        resource_type="match",
        resource_id=match.id,
        extra_data={
            "old_status": old_status,
            "reason": cancel_data.reason,
            "player_a_id": match.player_a_id,
            "player_b_id": match.player_b_id
        },
        description=f"Admin canceled match {match_id}: {cancel_data.reason}"
    )

    # Get player names for response
    player_a = db.query(User).filter(User.id == match.player_a_id).first()
    player_b = db.query(User).filter(User.id == match.player_b_id).first()

    return MatchListResponse(
        id=match.id,
        player_a_id=match.player_a_id,
        player_a_name=player_a.name if player_a else "Unknown",
        player_b_id=match.player_b_id,
        player_b_name=player_b.name if player_b else "Unknown",
        start_time=match.start_time.isoformat(),
        end_time=match.end_time.isoformat(),
        status=match.status,
        canceled_by_id=match.canceled_by_id,
        canceled_reason=match.canceled_reason,
        created_at=match.created_at.isoformat()
    )

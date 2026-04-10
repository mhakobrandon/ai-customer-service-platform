"""
Admin API Endpoints
Administrative functions for system management
Includes comprehensive User Management module
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Float
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import csv
import io
import json

from app.database.session import get_db
from app.core.security import require_role, get_password_hash
from app.models.user import User, UserRole, AgentStatus
from app.models.ticket import Ticket
from app.models.chat_session import ChatSession
from app.models.nlp_feedback import NLPFeedback
from app.services.location_directory_service import location_directory_service, LOCATION_TYPES

router = APIRouter()


# ==================== User Management Schemas ====================

class UserListResponse(BaseModel):
    """User list response schema"""
    id: str
    name: str
    email: str
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    department: Optional[str] = None
    specialization: Optional[str] = None
    languages: Optional[str] = None
    status: Optional[str] = None
    created_at: str
    last_login: Optional[str] = None


class UserDetailResponse(BaseModel):
    """Detailed user response"""
    id: str
    name: str
    email: str
    phone_number: Optional[str] = None
    role: str
    preferred_language: str
    is_active: bool
    is_verified: bool
    department: Optional[str] = None
    specialization: Optional[str] = None
    languages: Optional[str] = None
    status: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    last_login: Optional[str] = None


class AssignRoleRequest(BaseModel):
    """Request to assign role to user"""
    role: str  # customer, agent, supervisor, admin
    department: Optional[str] = None
    specialization: Optional[str] = None
    languages: Optional[str] = None


class UpdateUserRequest(BaseModel):
    """Request to update user details"""
    name: Optional[str] = None
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    languages: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class CreateUserRequest(BaseModel):
    """Admin creates a user with role"""
    name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None
    role: str = "customer"
    preferred_language: str = "en"
    department: Optional[str] = None
    specialization: Optional[str] = None
    languages: Optional[str] = None


class NLPFeedbackResponse(BaseModel):
    """NLP feedback item response"""
    id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    message_text: str
    predicted_intent: str
    predicted_confidence: str
    language: str
    needs_escalation: bool
    corrected_intent: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed: bool
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str


class UpdateNLPFeedbackRequest(BaseModel):
    """Update NLP feedback review fields"""
    corrected_intent: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed: bool = True


class LocationDirectoryItemCreate(BaseModel):
    location_type: str
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None
    opening_hours: Optional[str] = None
    latitude: float
    longitude: float
    provider: Optional[str] = None
    is_active: bool = True


class LocationDirectoryItemUpdate(BaseModel):
    location_type: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    opening_hours: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    provider: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== User Management Endpoints ====================

@router.get("/users", response_model=List[UserListResponse])
async def list_all_users(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db),
    role_filter: Optional[str] = None,
    status_filter: Optional[str] = None  # active, inactive, pending
):
    """
    List all users in the system
    Admin and Supervisor access
    """
    query = select(User).order_by(User.created_at.desc())
    
    if role_filter:
        try:
            role_enum = UserRole(role_filter)
            query = query.filter(User.role == role_enum)
        except ValueError:
            pass
    
    if status_filter == "active":
        query = query.filter(User.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(User.is_active == False)
    elif status_filter == "pending":
        query = query.filter(User.role == UserRole.PENDING)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserListResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone_number=user.phone_number,
            role=user.role.value,
            is_active=user.is_active,
            is_verified=user.is_verified,
            department=user.department,
            specialization=user.specialization,
            languages=user.languages,
            status=user.status.value if user.status else None,
            created_at=user.created_at.isoformat() if user.created_at else "",
            last_login=user.last_login.isoformat() if user.last_login else None
        )
        for user in users
    ]


@router.get("/users/pending", response_model=List[UserListResponse])
async def list_pending_users(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    List all pending users awaiting role assignment
    Admin and Supervisor access
    """
    query = select(User).filter(User.role == UserRole.PENDING).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserListResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone_number=user.phone_number,
            role=user.role.value,
            is_active=user.is_active,
            is_verified=user.is_verified,
            department=user.department,
            specialization=user.specialization,
            languages=user.languages,
            status=user.status.value if user.status else None,
            created_at=user.created_at.isoformat() if user.created_at else "",
            last_login=user.last_login.isoformat() if user.last_login else None
        )
        for user in users
    ]


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_details(
    user_id: str,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed user information
    Admin and Supervisor access
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserDetailResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone_number=user.phone_number,
        role=user.role.value,
        preferred_language=user.preferred_language,
        is_active=user.is_active,
        is_verified=user.is_verified,
        department=user.department,
        specialization=user.specialization,
        languages=user.languages,
        status=user.status.value if user.status else None,
        created_at=user.created_at.isoformat() if user.created_at else "",
        updated_at=user.updated_at.isoformat() if user.updated_at else None,
        last_login=user.last_login.isoformat() if user.last_login else None
    )


@router.post("/users", response_model=UserDetailResponse)
async def create_user(
    user_data: CreateUserRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin creates a new user with assigned role
    Admin only
    """
    # Check if email exists
    result = await db.execute(select(User).filter(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    try:
        role_enum = UserRole(user_data.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
        )
    
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        phone_number=user_data.phone_number,
        role=role_enum,
        preferred_language=user_data.preferred_language,
        is_active=True,
        is_verified=True  # Admin-created users are verified
    )
    
    # Set staff-specific fields
    if role_enum in [UserRole.AGENT, UserRole.SUPERVISOR]:
        new_user.status = AgentStatus.AVAILABLE
        new_user.department = user_data.department or "Customer Support"
        new_user.specialization = user_data.specialization or "General Support"
        new_user.languages = user_data.languages or user_data.preferred_language
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserDetailResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        phone_number=new_user.phone_number,
        role=new_user.role.value,
        preferred_language=new_user.preferred_language,
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        department=new_user.department,
        specialization=new_user.specialization,
        languages=new_user.languages,
        status=new_user.status.value if new_user.status else None,
        created_at=new_user.created_at.isoformat() if new_user.created_at else "",
        updated_at=None,
        last_login=None
    )


@router.patch("/users/{user_id}/assign-role")
async def assign_user_role(
    user_id: str,
    role_data: AssignRoleRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign or change a user's role
    Admin only - this is how pending users get activated
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate role
    try:
        role_enum = UserRole(role_data.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: customer, agent, supervisor, admin"
        )
    
    # Don't allow assigning pending role
    if role_enum == UserRole.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign pending role. Use a valid role."
        )
    
    old_role = user.role.value
    user.role = role_enum
    user.is_verified = True  # Role assignment verifies the user
    
    # Set staff-specific fields
    if role_enum in [UserRole.AGENT, UserRole.SUPERVISOR]:
        user.status = AgentStatus.AVAILABLE
        user.department = role_data.department or user.department or "Customer Support"
        user.specialization = role_data.specialization or user.specialization or "General Support"
        user.languages = role_data.languages or user.languages or user.preferred_language
    else:
        # Clear staff fields for non-staff roles
        user.status = None
        user.department = None
        user.specialization = None
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "old_role": old_role,
        "new_role": user.role.value,
        "message": f"Role successfully changed from {old_role} to {user.role.value}"
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UpdateUserRequest,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user details
    Admin and Supervisor access (supervisors can only update agents)
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Supervisors can only update agents
    if current_user.role == UserRole.SUPERVISOR and user.role not in [UserRole.AGENT, UserRole.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisors can only update agent accounts"
        )
    
    # Update fields
    if update_data.name is not None:
        user.name = update_data.name
    if update_data.phone_number is not None:
        user.phone_number = update_data.phone_number
    if update_data.preferred_language is not None:
        user.preferred_language = update_data.preferred_language
    if update_data.department is not None:
        user.department = update_data.department
    if update_data.specialization is not None:
        user.specialization = update_data.specialization
    if update_data.languages is not None:
        user.languages = update_data.languages
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    if update_data.is_verified is not None:
        user.is_verified = update_data.is_verified
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    
    return {
        "user_id": user.id,
        "message": "User updated successfully"
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user
    Admin only
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {
        "message": f"User {user.email} deleted successfully"
    }


@router.patch("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle user active status
    Admin and Supervisor access
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Supervisors can only toggle agents
    if current_user.role == UserRole.SUPERVISOR and user.role not in [UserRole.AGENT, UserRole.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisors can only manage agent accounts"
        )
    
    user.is_active = not user.is_active
    user.updated_at = datetime.utcnow()
    await db.commit()
    
    return {
        "user_id": user.id,
        "is_active": user.is_active,
        "message": f"User {'activated' if user.is_active else 'deactivated'} successfully"
    }


# ==================== System Statistics ====================

@router.get("/system-stats")
async def get_system_statistics(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive system statistics
    Admin and Supervisor access
    """
    # User statistics
    total_users = await db.execute(select(func.count(User.id)))
    pending_users = await db.execute(select(func.count(User.id)).filter(User.role == UserRole.PENDING))
    customers = await db.execute(select(func.count(User.id)).filter(User.role == UserRole.CUSTOMER))
    agents = await db.execute(select(func.count(User.id)).filter(User.role == UserRole.AGENT))
    supervisors = await db.execute(select(func.count(User.id)).filter(User.role == UserRole.SUPERVISOR))
    admins = await db.execute(select(func.count(User.id)).filter(User.role == UserRole.ADMIN))
    
    # Ticket statistics
    total_tickets = await db.execute(select(func.count(Ticket.id)))
    
    # Session statistics
    total_sessions = await db.execute(select(func.count(ChatSession.id)))
    
    return {
        "users": {
            "total": total_users.scalar(),
            "pending": pending_users.scalar(),
            "customers": customers.scalar(),
            "agents": agents.scalar(),
            "supervisors": supervisors.scalar(),
            "admins": admins.scalar()
        },
        "tickets": {
            "total": total_tickets.scalar()
        },
        "sessions": {
            "total": total_sessions.scalar()
        },
        "system_info": {
            "version": "1.0.0",
            "status": "operational"
        }
    }


# ==================== NLP Feedback Management ====================

@router.get("/nlp-feedback", response_model=List[NLPFeedbackResponse])
async def list_nlp_feedback(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db),
    reviewed: Optional[bool] = None,
    intent: Optional[str] = None,
    language: Optional[str] = None,
    min_confidence: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    max_confidence: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    limit: int = Query(default=100, ge=1, le=1000)
):
    """
    List NLP feedback records for quality review.
    Admin and Supervisor access.
    """
    query = select(NLPFeedback).order_by(NLPFeedback.created_at.desc()).limit(limit)

    if reviewed is not None:
        query = query.filter(NLPFeedback.reviewed == reviewed)
    if intent:
        query = query.filter(NLPFeedback.predicted_intent == intent)
    if language:
        query = query.filter(NLPFeedback.language == language)
    if min_confidence is not None:
        query = query.filter(cast(NLPFeedback.predicted_confidence, Float) >= min_confidence)
    if max_confidence is not None:
        query = query.filter(cast(NLPFeedback.predicted_confidence, Float) <= max_confidence)

    result = await db.execute(query)
    feedback_items = result.scalars().all()

    return [
        NLPFeedbackResponse(
            id=item.id,
            user_id=item.user_id,
            session_id=item.session_id,
            message_id=item.message_id,
            message_text=item.message_text,
            predicted_intent=item.predicted_intent,
            predicted_confidence=item.predicted_confidence,
            language=item.language,
            needs_escalation=item.needs_escalation,
            corrected_intent=item.corrected_intent,
            reviewer_notes=item.reviewer_notes,
            reviewed=item.reviewed,
            reviewed_by=item.reviewed_by,
            reviewed_at=item.reviewed_at.isoformat() if item.reviewed_at else None,
            created_at=item.created_at.isoformat()
        )
        for item in feedback_items
    ]


@router.patch("/nlp-feedback/{feedback_id}", response_model=NLPFeedbackResponse)
async def update_nlp_feedback(
    feedback_id: str,
    update_data: UpdateNLPFeedbackRequest,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update NLP feedback review details and corrected intent.
    Admin and Supervisor access.
    """
    result = await db.execute(select(NLPFeedback).filter(NLPFeedback.id == feedback_id))
    feedback_item = result.scalar_one_or_none()

    if not feedback_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NLP feedback record not found"
        )

    feedback_item.corrected_intent = update_data.corrected_intent
    feedback_item.reviewer_notes = update_data.reviewer_notes
    feedback_item.reviewed = update_data.reviewed

    if update_data.reviewed:
        feedback_item.reviewed_at = datetime.utcnow()
        feedback_item.reviewed_by = current_user.id
    else:
        feedback_item.reviewed_at = None
        feedback_item.reviewed_by = None

    await db.commit()
    await db.refresh(feedback_item)

    return NLPFeedbackResponse(
        id=feedback_item.id,
        user_id=feedback_item.user_id,
        session_id=feedback_item.session_id,
        message_id=feedback_item.message_id,
        message_text=feedback_item.message_text,
        predicted_intent=feedback_item.predicted_intent,
        predicted_confidence=feedback_item.predicted_confidence,
        language=feedback_item.language,
        needs_escalation=feedback_item.needs_escalation,
        corrected_intent=feedback_item.corrected_intent,
        reviewer_notes=feedback_item.reviewer_notes,
        reviewed=feedback_item.reviewed,
        reviewed_by=feedback_item.reviewed_by,
        reviewed_at=feedback_item.reviewed_at.isoformat() if feedback_item.reviewed_at else None,
        created_at=feedback_item.created_at.isoformat()
    )


@router.get("/nlp-feedback/export")
async def export_nlp_feedback(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db),
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    reviewed_only: bool = False
):
    """
    Export NLP feedback for retraining datasets (CSV or JSON).
    Admin and Supervisor access.
    """
    query = select(NLPFeedback).order_by(NLPFeedback.created_at.desc())
    if reviewed_only:
        query = query.filter(NLPFeedback.reviewed == True)

    result = await db.execute(query)
    feedback_items = result.scalars().all()

    export_rows = [
        {
            "id": item.id,
            "user_id": item.user_id,
            "session_id": item.session_id,
            "message_id": item.message_id,
            "message_text": item.message_text,
            "predicted_intent": item.predicted_intent,
            "predicted_confidence": item.predicted_confidence,
            "language": item.language,
            "needs_escalation": item.needs_escalation,
            "corrected_intent": item.corrected_intent,
            "reviewer_notes": item.reviewer_notes,
            "reviewed": item.reviewed,
            "reviewed_by": item.reviewed_by,
            "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
            "created_at": item.created_at.isoformat()
        }
        for item in feedback_items
    ]

    if format == "json":
        return Response(
            content=json.dumps(export_rows, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=nlp_feedback_export.json"}
        )

    output = io.StringIO()
    fieldnames = [
        "id",
        "user_id",
        "session_id",
        "message_id",
        "message_text",
        "predicted_intent",
        "predicted_confidence",
        "language",
        "needs_escalation",
        "corrected_intent",
        "reviewer_notes",
        "reviewed",
        "reviewed_by",
        "reviewed_at",
        "created_at"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(export_rows)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nlp_feedback_export.csv"}
    )


# ==================== Location Directory Management ====================

@router.get("/locations", response_model=dict)
async def list_location_directory_items(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    location_type: Optional[str] = None,
    active_only: bool = False,
):
    if location_type and location_type not in LOCATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid location_type. Allowed: {sorted(LOCATION_TYPES)}"
        )

    items = location_directory_service.list_items(location_type=location_type, active_only=active_only)
    return {
        "items": items,
        "count": len(items),
        "allowed_types": sorted(LOCATION_TYPES),
    }


@router.post("/locations", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_location_directory_item(
    payload: LocationDirectoryItemCreate,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    if payload.location_type not in LOCATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid location_type. Allowed: {sorted(LOCATION_TYPES)}"
        )

    created = location_directory_service.create_item(payload.model_dump())
    return created


@router.patch("/locations/{item_id}", response_model=dict)
async def update_location_directory_item(
    item_id: str,
    payload: LocationDirectoryItemUpdate,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    patch_data = payload.model_dump(exclude_unset=True)

    if "location_type" in patch_data and patch_data["location_type"] not in LOCATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid location_type. Allowed: {sorted(LOCATION_TYPES)}"
        )

    updated = location_directory_service.update_item(item_id, patch_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location item not found")

    return updated


@router.delete("/locations/{item_id}", response_model=dict)
async def delete_location_directory_item(
    item_id: str,
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    deleted = location_directory_service.delete_item(item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location item not found")
    return {"message": "Location item deleted successfully", "id": item_id}


@router.get("/locations/export")
async def export_location_directory(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    location_type: Optional[str] = None,
):
    if location_type and location_type not in LOCATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid location_type. Allowed: {sorted(LOCATION_TYPES)}"
        )

    items = location_directory_service.list_items(location_type=location_type, active_only=False)

    if format == "json":
        return Response(
            content=json.dumps({"items": items}, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=location_directory_export.json"}
        )

    output = io.StringIO()
    fieldnames = [
        "id",
        "location_type",
        "name",
        "address",
        "contact",
        "opening_hours",
        "latitude",
        "longitude",
        "provider",
        "is_active",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(items)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=location_directory_export.csv"}
    )


@router.post("/locations/import", response_model=dict)
async def import_location_directory(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    file: UploadFile = File(...),
):
    filename = (file.filename or "").lower()
    raw_bytes = await file.read()

    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    decoded = raw_bytes.decode("utf-8-sig")

    try:
        if filename.endswith(".json"):
            payload = json.loads(decoded)
            if isinstance(payload, dict):
                rows = payload.get("items", [])
            elif isinstance(payload, list):
                rows = payload
            else:
                rows = []
        else:
            reader = csv.DictReader(io.StringIO(decoded))
            rows = [row for row in reader]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse import file: {exc}"
        )

    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No rows found to import")

    validation = location_directory_service.validate_rows(rows)
    result = location_directory_service.upsert_items(rows)
    return {
        "message": "Location directory import completed",
        "validation": {
            "total": validation["total_count"],
            "valid": validation["valid_count"],
            "invalid": validation["invalid_count"],
            "invalid_rows": validation["invalid_rows"][:50],
        },
        **result,
    }


@router.post("/locations/import/preview", response_model=dict)
async def preview_location_directory_import(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    file: UploadFile = File(...),
):
    filename = (file.filename or "").lower()
    raw_bytes = await file.read()

    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    decoded = raw_bytes.decode("utf-8-sig")

    try:
        if filename.endswith(".json"):
            payload = json.loads(decoded)
            if isinstance(payload, dict):
                rows = payload.get("items", [])
            elif isinstance(payload, list):
                rows = payload
            else:
                rows = []
        else:
            reader = csv.DictReader(io.StringIO(decoded))
            rows = [row for row in reader]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse import file: {exc}"
        )

    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No rows found to preview")

    validation = location_directory_service.validate_rows(rows)
    return {
        "message": "Import preview completed",
        "total": validation["total_count"],
        "valid": validation["valid_count"],
        "invalid": validation["invalid_count"],
        "invalid_rows": validation["invalid_rows"][:100],
    }


@router.get("/locations/template")
async def download_location_directory_template(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    output = io.StringIO()
    fieldnames = [
        "location_type",
        "name",
        "address",
        "contact",
        "opening_hours",
        "latitude",
        "longitude",
        "provider",
        "is_active",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow(
        {
            "location_type": "atm",
            "name": "Sample ATM - Main Street",
            "address": "Main Street, Harare CBD",
            "contact": "+263 242 000 000",
            "opening_hours": "24/7",
            "latitude": -17.8292,
            "longitude": 31.0522,
            "provider": "Sample Bank",
            "is_active": "true",
        }
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=location_directory_template.csv"}
    )


# ==================== Market Rates Management ====================

class FeeUpdateItem(BaseModel):
    provider: str
    send_fee_percent: float
    cashout_fee_percent: float
    zipit_fee_usd: float


class BundleUpdateItem(BaseModel):
    provider: str
    voice_10min_usd: float
    data_1gb_usd: float
    data_5gb_usd: float


@router.get("/market-rates")
async def get_market_rates(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    from app.services.market_intelligence import get_transaction_fees, get_bundle_prices, get_rates_last_updated
    return {
        "transaction_fees": get_transaction_fees(),
        "bundle_prices": get_bundle_prices(),
        "last_updated": get_rates_last_updated(),
    }


@router.put("/market-rates/fees")
async def update_market_fees(
    fees: List[FeeUpdateItem],
    current_user: User = Depends(require_role(["admin"])),
):
    from app.services.market_intelligence import update_transaction_fees
    result = update_transaction_fees([f.model_dump() for f in fees])
    return {"message": "Transaction fees updated", "last_updated": result.get("last_updated")}


@router.put("/market-rates/bundles")
async def update_market_bundles(
    bundles: List[BundleUpdateItem],
    current_user: User = Depends(require_role(["admin"])),
):
    from app.services.market_intelligence import update_bundle_prices
    result = update_bundle_prices([b.model_dump() for b in bundles])
    return {"message": "Bundle prices updated", "last_updated": result.get("last_updated")}


# ==================== NLP Retraining Trigger ====================

@router.post("/nlp-feedback/retrain")
async def trigger_nlp_retrain(
    current_user: User = Depends(require_role(["admin", "supervisor"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Export reviewed corrections and trigger a retraining run.
    """
    import subprocess, sys, pathlib

    # Export reviewed feedback as retraining dataset
    query = select(NLPFeedback).filter(NLPFeedback.reviewed == True, NLPFeedback.corrected_intent.isnot(None))
    result = await db.execute(query)
    items = result.scalars().all()

    if not items:
        raise HTTPException(status_code=400, detail="No reviewed corrections available for retraining")

    dataset = [
        {"text": item.message_text, "intent": item.corrected_intent, "language": item.language}
        for item in items
    ]

    gen_dir = pathlib.Path(__file__).resolve().parents[2] / "generated"
    gen_dir.mkdir(exist_ok=True)
    dataset_path = gen_dir / "retraining_dataset.json"
    with open(dataset_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    # Launch retraining in background
    script = pathlib.Path(__file__).resolve().parents[2] / "services" / "retraining_pipeline.py"
    subprocess.Popen(
        [sys.executable, str(script)],
        cwd=str(pathlib.Path(__file__).resolve().parents[2]),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    return {
        "message": f"Retraining triggered with {len(dataset)} corrections",
        "dataset_size": len(dataset),
    }

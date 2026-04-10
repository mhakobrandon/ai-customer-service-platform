"""
User Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database.session import get_db
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


class UserProfileResponse(BaseModel):
    """User profile response schema"""
    id: str
    name: str
    email: str
    phone_number: Optional[str]
    role: str
    preferred_language: str
    is_active: bool


class UserProfileUpdate(BaseModel):
    """User profile update schema"""
    name: Optional[str] = None
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = None


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user profile
    
    Args:
        current_user: Authenticated user
    
    Returns:
        User profile information
    """
    return UserProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
        preferred_language=current_user.preferred_language,
        is_active=current_user.is_active
    )


@router.patch("/me", response_model=UserProfileResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user profile
    
    Args:
        profile_update: Profile update data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Updated user profile
    """
    if profile_update.name:
        current_user.name = profile_update.name
    
    if profile_update.phone_number:
        current_user.phone_number = profile_update.phone_number
    
    if profile_update.preferred_language:
        current_user.preferred_language = profile_update.preferred_language
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
        preferred_language=current_user.preferred_language,
        is_active=current_user.is_active
    )

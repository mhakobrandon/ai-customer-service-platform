"""
Authentication API Endpoints
Handles user registration, login, and token management
Supports multi-role authentication: Admin, Supervisor, Agent, Customer
Includes OTP and Email verification

Author: AI Customer Service Platform
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta, datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import logging

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token
)
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole, AgentStatus
from app.services.otp_service import (
    create_otp, 
    verify_otp, 
    get_otp_status,
    create_verification_token,
    verify_token
)
from app.services.email_service import (
    send_otp_email,
    send_verification_link,
    send_welcome_email
)
from app.services.sms_service import send_otp_sms

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Schemas
class UserRegister(BaseModel):
    """User registration schema - role assigned by admin"""
    name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None
    preferred_language: str = "en"


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    """OTP verification request"""
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    """Resend OTP request"""
    email: EmailStr


class PhoneOTPRequest(BaseModel):
    """Phone OTP verification request"""
    phone_number: str
    otp: str


class SendPhoneOTPRequest(BaseModel):
    """Send phone OTP request"""
    email: EmailStr  # Used to identify user
    phone_number: str


class EmailVerifyRequest(BaseModel):
    """Email verification via token"""
    token: str


class OTPResponse(BaseModel):
    """OTP status response"""
    success: bool
    message: str
    expires_in_seconds: Optional[int] = None
    otp_sent: bool = False


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    name: str
    email: str
    role: str
    preferred_language: str
    is_active: bool
    specialization: Optional[str] = None
    department: Optional[str] = None
    languages: Optional[str] = None
    status: Optional[str] = None


class UserProfileResponse(BaseModel):
    """Detailed user profile response"""
    id: str
    name: str
    email: str
    phone_number: Optional[str] = None
    role: str
    preferred_language: str
    is_active: bool
    is_verified: bool
    specialization: Optional[str] = None
    department: Optional[str] = None
    languages: Optional[str] = None
    status: Optional[str] = None
    created_at: str
    last_login: Optional[str] = None
    
    # Role-based permissions
    can_manage_agents: bool = False
    can_view_analytics: bool = False
    can_handle_escalations: bool = False


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user and send OTP for verification
    
    Args:
        user_data: User registration data
        db: Database session
    
    Returns:
        Registration status with OTP info
    """
    # Check if email already exists
    result = await db.execute(select(User).filter(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        # If user exists but not verified, allow re-registration
        if not existing_user.is_verified:
            # Update user data and resend OTP
            existing_user.name = user_data.name
            existing_user.password_hash = get_password_hash(user_data.password)
            existing_user.phone_number = user_data.phone_number
            existing_user.preferred_language = user_data.preferred_language
            await db.commit()
            
            # Generate and send OTP
            try:
                otp, expiry = create_otp(user_data.email, otp_type="email")
                send_otp_email(
                    to_email=user_data.email,
                    name=user_data.name,
                    otp=otp,
                    expiry_minutes=10
                )
                logger.info(f"[DEV] OTP for {user_data.email}: {otp}")
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=str(e)
                )
            
            return {
                "success": True,
                "message": "Registration updated. Please verify your email with the OTP sent.",
                "email": user_data.email,
                "requires_verification": True
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create new user with CUSTOMER role (can use the system immediately after verification)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        phone_number=user_data.phone_number,
        role=UserRole.CUSTOMER,  # All new users are customers by default
        preferred_language=user_data.preferred_language,
        is_active=True,
        is_verified=False  # Will be verified via OTP
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate and send OTP for email verification
    try:
        otp, expiry = create_otp(user_data.email, otp_type="email")
        send_otp_email(
            to_email=user_data.email,
            name=user_data.name,
            otp=otp,
            expiry_minutes=10
        )
        # Log OTP for development
        logger.info(f"[DEV] OTP for {user_data.email}: {otp}")
        print(f"\n[DEV] OTP for {user_data.email}: {otp}\n")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    
    return {
        "success": True,
        "message": "Registration successful! Please check your email for the verification OTP.",
        "email": user_data.email,
        "user_id": new_user.id,
        "requires_verification": True
    }


@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp_endpoint(
    request: OTPVerifyRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Verify OTP and activate user account
    
    Args:
        request: OTP verification request
        db: Database session
    
    Returns:
        Verification status
    """
    # Find user
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        return OTPResponse(
            success=True,
            message="Email already verified"
        )
    
    # Verify OTP
    success, message = verify_otp(request.email, request.otp)
    
    if success:
        # Mark user as verified
        user.is_verified = True
        await db.commit()
        
        # Send welcome email
        send_welcome_email(
            to_email=user.email,
            name=user.name
        )
        
        return OTPResponse(
            success=True,
            message="Email verified successfully! You can now login."
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


@router.post("/resend-otp", response_model=OTPResponse)
async def resend_otp_endpoint(
    request: ResendOTPRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Resend OTP to user's email
    
    Args:
        request: Resend OTP request
        db: Database session
    
    Returns:
        OTP status
    """
    # Find user
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_verified:
        return OTPResponse(
            success=True,
            message="Email already verified",
            otp_sent=False
        )
    
    # Check if there's an existing OTP
    status_info = get_otp_status(request.email)
    if status_info:
        return OTPResponse(
            success=False,
            message=f"Please wait before requesting a new OTP",
            expires_in_seconds=status_info.get("expires_in_seconds"),
            otp_sent=False
        )
    
    # Generate new OTP
    try:
        otp, expiry = create_otp(request.email, otp_type="email")
        send_otp_email(
            to_email=request.email,
            name=user.name,
            otp=otp,
            expiry_minutes=10
        )
        logger.info(f"[DEV] Resent OTP for {request.email}: {otp}")
        print(f"\n[DEV] Resent OTP for {request.email}: {otp}\n")
        
        return OTPResponse(
            success=True,
            message="OTP sent successfully",
            expires_in_seconds=600,
            otp_sent=True
        )
    except ValueError as e:
        return OTPResponse(
            success=False,
            message=str(e),
            otp_sent=False
        )


@router.get("/otp-status/{email}", response_model=OTPResponse)
async def check_otp_status(email: str, db: AsyncSession = Depends(get_db)):
    """
    Check OTP status for an email
    
    Args:
        email: User's email
        db: Database session
    
    Returns:
        OTP status
    """
    status_info = get_otp_status(email)
    
    if status_info:
        return OTPResponse(
            success=True,
            message=f"OTP active. {status_info['attempts_remaining']} attempts remaining.",
            expires_in_seconds=status_info.get("expires_in_seconds")
        )
    else:
        return OTPResponse(
            success=False,
            message="No active OTP. Please request a new one."
        )


# ==================== PHONE VERIFICATION ====================

@router.post("/send-phone-otp", response_model=OTPResponse)
async def send_phone_otp_endpoint(
    request: SendPhoneOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send OTP to user's phone number for verification
    
    Args:
        request: Send phone OTP request
        db: Database session
    
    Returns:
        OTP status
    """
    # Find user by email
    result = await db.execute(select(User).filter(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if phone is already verified
    if hasattr(user, 'phone_verified') and user.phone_verified:
        return OTPResponse(
            success=True,
            message="Phone number already verified",
            otp_sent=False
        )
    
    # Validate phone number
    if not request.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required"
        )
    
    # Update user's phone number if different
    if user.phone_number != request.phone_number:
        user.phone_number = request.phone_number
        await db.commit()
    
    # Use phone number as identifier for OTP
    phone_identifier = f"phone:{request.phone_number}"
    
    # Check if there's an existing OTP
    status_info = get_otp_status(phone_identifier)
    if status_info:
        return OTPResponse(
            success=False,
            message="Please wait before requesting a new OTP",
            expires_in_seconds=status_info.get("expires_in_seconds"),
            otp_sent=False
        )
    
    # Generate and send OTP
    try:
        otp, expiry = create_otp(phone_identifier, otp_type="sms")
        send_otp_sms(
            to_phone=request.phone_number,
            otp=otp,
            expiry_minutes=10,
            language=user.preferred_language
        )
        logger.info(f"[DEV] Phone OTP for {request.phone_number}: {otp}")
        print(f"\n[DEV] Phone OTP for {request.phone_number}: {otp}\n")
        
        return OTPResponse(
            success=True,
            message="OTP sent to your phone",
            expires_in_seconds=600,
            otp_sent=True
        )
    except ValueError as e:
        return OTPResponse(
            success=False,
            message=str(e),
            otp_sent=False
        )


@router.post("/verify-phone-otp", response_model=OTPResponse)
async def verify_phone_otp_endpoint(
    request: PhoneOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify phone OTP and mark phone as verified
    
    Args:
        request: Phone OTP verification request
        db: Database session
    
    Returns:
        Verification status
    """
    # Find user by phone number
    result = await db.execute(select(User).filter(User.phone_number == request.phone_number))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this phone number not found"
        )
    
    # Check if already verified
    if hasattr(user, 'phone_verified') and user.phone_verified:
        return OTPResponse(
            success=True,
            message="Phone number already verified"
        )
    
    # Use phone number as identifier
    phone_identifier = f"phone:{request.phone_number}"
    
    # Verify OTP
    success, message = verify_otp(phone_identifier, request.otp)
    
    if success:
        # Mark phone as verified
        user.phone_verified = True
        await db.commit()
        
        return OTPResponse(
            success=True,
            message="Phone number verified successfully!"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


@router.get("/phone-otp-status/{phone_number}", response_model=OTPResponse)
async def check_phone_otp_status(phone_number: str):
    """
    Check OTP status for a phone number
    
    Args:
        phone_number: User's phone number
    
    Returns:
        OTP status
    """
    phone_identifier = f"phone:{phone_number}"
    status_info = get_otp_status(phone_identifier)
    
    if status_info:
        return OTPResponse(
            success=True,
            message=f"OTP active. {status_info['attempts_remaining']} attempts remaining.",
            expires_in_seconds=status_info.get("expires_in_seconds")
        )
    else:
        return OTPResponse(
            success=False,
            message="No active OTP. Please request a new one."
        )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    User login endpoint
    
    Args:
        user_data: Login credentials
        db: Database session
    
    Returns:
        JWT tokens and user information
    """
    # Find user by email
    result = await db.execute(select(User).filter(User.email == user_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Check if email is verified
    if not user.is_verified:
        # Generate and send new OTP
        try:
            otp, expiry = create_otp(user.email, otp_type="email")
            send_otp_email(
                to_email=user.email,
                name=user.name,
                otp=otp,
                expiry_minutes=10
            )
            logger.info(f"[DEV] OTP for unverified user {user.email}: {otp}")
            print(f"\n[DEV] OTP for unverified user {user.email}: {otp}\n")
        except ValueError:
            # OTP already sent recently
            pass
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your email for the verification OTP.",
            headers={"X-Requires-Verification": "true"}
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "preferred_language": user.preferred_language,
            "specialization": user.specialization,
            "department": user.department,
            "languages": user.languages,
            "status": user.status.value if user.status else None,
            "can_manage_agents": user.can_manage_agents,
            "can_view_analytics": user.can_view_analytics,
            "can_handle_escalations": user.can_handle_escalations
        }
    )


@router.post("/token", response_model=TokenResponse)
async def login_with_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login
    Used for API documentation authentication
    """
    # Find user by username (email)
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "preferred_language": user.preferred_language,
            "can_manage_agents": user.can_manage_agents,
            "can_view_analytics": user.can_view_analytics,
            "can_handle_escalations": user.can_handle_escalations
        }
    )

"""
OTP (One-Time Password) Service
Handles generation, storage, and verification of OTP codes
Supports SMS and Email verification

Author: AI Customer Service Platform
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import hashlib
import secrets

# In-memory OTP storage (in production, use Redis or database)
# Format: {email: {"otp": hashed_otp, "expires": datetime, "attempts": int, "type": str}}
_otp_store: Dict[str, dict] = {}

# Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
MAX_ATTEMPTS = 3
RESEND_COOLDOWN_SECONDS = 60


def generate_otp(length: int = OTP_LENGTH) -> str:
    """
    Generate a random numeric OTP
    
    Args:
        length: Length of OTP (default 6 digits)
    
    Returns:
        String of random digits
    """
    return ''.join(random.choices(string.digits, k=length))


def hash_otp(otp: str) -> str:
    """
    Hash OTP for secure storage
    
    Args:
        otp: Plain text OTP
    
    Returns:
        Hashed OTP
    """
    return hashlib.sha256(otp.encode()).hexdigest()


def create_otp(
    identifier: str, 
    otp_type: str = "email",
    expiry_minutes: int = OTP_EXPIRY_MINUTES
) -> Tuple[str, datetime]:
    """
    Create and store a new OTP for the given identifier
    
    Args:
        identifier: Email or phone number
        otp_type: Type of OTP ("email", "sms", "phone")
        expiry_minutes: Minutes until OTP expires
    
    Returns:
        Tuple of (plain_otp, expiry_datetime)
    """
    # Check cooldown period
    existing = _otp_store.get(identifier)
    if existing:
        time_since_created = datetime.utcnow() - (existing["expires"] - timedelta(minutes=expiry_minutes))
        if time_since_created.total_seconds() < RESEND_COOLDOWN_SECONDS:
            remaining = RESEND_COOLDOWN_SECONDS - int(time_since_created.total_seconds())
            raise ValueError(f"Please wait {remaining} seconds before requesting a new OTP")
    
    # Generate OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
    
    # Store hashed OTP
    _otp_store[identifier] = {
        "otp": hash_otp(otp),
        "expires": expiry,
        "attempts": 0,
        "type": otp_type,
        "created_at": datetime.utcnow()
    }
    
    return otp, expiry


def verify_otp(identifier: str, otp: str) -> Tuple[bool, str]:
    """
    Verify an OTP for the given identifier
    
    Args:
        identifier: Email or phone number
        otp: OTP to verify
    
    Returns:
        Tuple of (success, message)
    """
    stored = _otp_store.get(identifier)
    
    if not stored:
        return False, "No OTP found. Please request a new one."
    
    # Check expiry
    if datetime.utcnow() > stored["expires"]:
        del _otp_store[identifier]
        return False, "OTP has expired. Please request a new one."
    
    # Check attempts
    if stored["attempts"] >= MAX_ATTEMPTS:
        del _otp_store[identifier]
        return False, "Too many failed attempts. Please request a new OTP."
    
    # Verify OTP
    if hash_otp(otp) == stored["otp"]:
        # Success - remove OTP
        del _otp_store[identifier]
        return True, "OTP verified successfully"
    else:
        # Increment attempts
        stored["attempts"] += 1
        remaining = MAX_ATTEMPTS - stored["attempts"]
        
        if remaining == 0:
            del _otp_store[identifier]
            return False, "Incorrect OTP. Maximum attempts reached. Please request a new OTP."
        
        return False, f"Incorrect OTP. {remaining} attempts remaining."


def get_otp_status(identifier: str) -> Optional[dict]:
    """
    Get the status of an OTP for the given identifier
    
    Args:
        identifier: Email or phone number
    
    Returns:
        OTP status dict or None
    """
    stored = _otp_store.get(identifier)
    if not stored:
        return None
    
    if datetime.utcnow() > stored["expires"]:
        del _otp_store[identifier]
        return None
    
    return {
        "type": stored["type"],
        "expires_in_seconds": int((stored["expires"] - datetime.utcnow()).total_seconds()),
        "attempts_remaining": MAX_ATTEMPTS - stored["attempts"]
    }


def clear_otp(identifier: str) -> bool:
    """
    Clear OTP for identifier
    
    Args:
        identifier: Email or phone number
    
    Returns:
        True if OTP was cleared, False if not found
    """
    if identifier in _otp_store:
        del _otp_store[identifier]
        return True
    return False


def generate_verification_token() -> str:
    """
    Generate a secure token for email verification links
    
    Returns:
        Secure random token
    """
    return secrets.token_urlsafe(32)


# Token storage for email verification links
_verification_tokens: Dict[str, dict] = {}


def create_verification_token(email: str, expiry_hours: int = 24) -> str:
    """
    Create a verification token for email verification link
    
    Args:
        email: User's email
        expiry_hours: Hours until token expires
    
    Returns:
        Verification token
    """
    token = generate_verification_token()
    expiry = datetime.utcnow() + timedelta(hours=expiry_hours)
    
    _verification_tokens[token] = {
        "email": email,
        "expires": expiry,
        "created_at": datetime.utcnow()
    }
    
    return token


def verify_token(token: str) -> Tuple[bool, Optional[str], str]:
    """
    Verify an email verification token
    
    Args:
        token: Verification token
    
    Returns:
        Tuple of (success, email, message)
    """
    stored = _verification_tokens.get(token)
    
    if not stored:
        return False, None, "Invalid verification link"
    
    if datetime.utcnow() > stored["expires"]:
        del _verification_tokens[token]
        return False, None, "Verification link has expired"
    
    email = stored["email"]
    del _verification_tokens[token]
    
    return True, email, "Email verified successfully"


def cleanup_expired():
    """Clean up expired OTPs and tokens"""
    now = datetime.utcnow()
    
    # Clean OTPs
    expired_otps = [k for k, v in _otp_store.items() if now > v["expires"]]
    for key in expired_otps:
        del _otp_store[key]
    
    # Clean tokens
    expired_tokens = [k for k, v in _verification_tokens.items() if now > v["expires"]]
    for key in expired_tokens:
        del _verification_tokens[key]

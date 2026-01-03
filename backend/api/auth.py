"""
Authentication API Endpoints
Handles user registration, login, and profile management
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials

from models.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    SuccessResponse,
    SendVerificationCodeRequest,
    VerifyCodeRequest,
    PasswordResetRequest,
    ResetPasswordRequest
)
from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current authenticated user.
    Returns user dict with id, email, name etc.
    """
    user_id = auth_service.get_current_user_id(credentials)
    user = await azure_storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_limiter(request: Request):
    """Get the limiter from app state"""
    return request.app.state.limiter


@router.post("/send-verification-code", response_model=SuccessResponse)
async def send_verification_code(data: SendVerificationCodeRequest):
    """
    Send 6-digit verification code to email
    """
    await auth_service.send_verification_code(data.email, azure_storage, email_service)

    return SuccessResponse(
        status="success",
        message="Verification code sent to your email"
    )


@router.post("/verify-code", response_model=SuccessResponse)
async def verify_code(data: VerifyCodeRequest):
    """
    Verify the 6-digit code
    """
    await auth_service.verify_code(data.email, data.code, azure_storage)

    return SuccessResponse(
        status="success",
        message="Email verified successfully"
    )


@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """
    Register a new parent/caregiver account (email must be verified first)
    """
    # Register user (will verify email was validated)
    user = await auth_service.register(
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        azure_storage=azure_storage,
        verified=True,  # Since we verified with code
        is_caregiver=user_data.is_caregiver
    )

    # Send welcome email
    await email_service.send_welcome_email(user["email"], user["name"])

    # Create JWT token
    token = auth_service.create_access_token({
        "user_id": user["id"],
        "email": user["email"]
    })

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
        name=user["name"]
    )


@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    """
    Login with email and password (with account lockout after 10 failed attempts)
    """
    # Login user (handles account lockout)
    user = await auth_service.login(login_data.email, login_data.password, azure_storage)

    # Create JWT token
    token = auth_service.create_access_token({
        "user_id": user["id"],
        "email": user["email"]
    })

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
        name=user["name"]
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current user profile (requires authentication)
    """
    user = await get_current_user(credentials)

    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        is_caregiver=user.get("is_caregiver", False),
        subscription_status=user.get("subscription_status", "trial"),
        trial_start_date=datetime.fromisoformat(user["trial_start_date"])
            if user.get("trial_start_date") else None,
        trial_end_date=datetime.fromisoformat(user["trial_end_date"])
            if user.get("trial_end_date") else None,
        created_at=datetime.fromisoformat(user["created_at"]),
        updated_at=datetime.fromisoformat(user["updated_at"])
    )


@router.delete("/account", response_model=SuccessResponse)
async def delete_account(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Delete user account and all associated data (requires authentication)
    WARNING: This is irreversible!
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Delete all child profiles
    profiles = await azure_storage.list_child_profiles(user_id)
    for profile in profiles:
        await azure_storage.delete_child_profile(user_id, profile["id"])

    # Delete user account
    success = await azure_storage.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete account")

    return SuccessResponse(
        status="success",
        message="Account deleted successfully"
    )


@router.post("/request-password-reset", response_model=SuccessResponse)
async def request_password_reset(data: PasswordResetRequest):
    """
    Request password reset - sends email with reset link
    """
    await auth_service.request_password_reset(data.email, azure_storage, email_service)

    return SuccessResponse(
        status="success",
        message="If this email exists, a password reset link has been sent"
    )


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(data: ResetPasswordRequest):
    """
    Reset password using token from email
    """
    await auth_service.reset_password(data.token, data.new_password, azure_storage)

    return SuccessResponse(
        status="success",
        message="Password reset successfully. You can now login with your new password"
    )

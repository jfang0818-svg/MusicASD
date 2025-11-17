# backend/app/services/auth_service.py
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import uuid
import logging

from app.core.security import verify_password, get_password_hash
from app.services.file_storage import file_storage
from app.services.email_service import EmailService
from app.schemas.auth import SimpleUser, UserRole
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class SimpleAuthService:
    """Simplified authentication service"""

    def __init__(self):
        self.email_service = EmailService()
        self.max_login_attempts = 10
        self.lockout_duration = timedelta(hours=1)
        self.verification_expiry = timedelta(minutes=5)
        self.reset_expiry = timedelta(hours=1)

    def generate_verification_code(self) -> str:
        """Generate 6-digit verification code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    async def send_verification_code(self, email: str) -> str:
        """Send verification code to email"""
        try:
            # Check if email already exists
            existing_user = await file_storage.get_user_by_email(email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

            # NEW: Check if email is invited BEFORE sending verification code
            is_invited = await file_storage.is_email_invited(email)
            if not is_invited:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email not found in invite list. Please visit https://stempro.org/collegeninja to request an invitation."
                )

            # Generate and save code
            code = self.generate_verification_code()
            expires_at = (datetime.now(timezone.utc) + self.verification_expiry).isoformat()

            await file_storage.save_verification_code(email, code, expires_at)

            # Log the code for debugging
            logger.info(f"Generated verification code for {email}: {code}")

            # Send email
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                    <h1>TargetAI</h1>
                    <p>Your Path to the Perfect College Match</p>
                </div>
                <div style="padding: 30px;">
                    <h2>Verify Your Email</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        {code}
                    </div>
                    <p style="color: #666;">This code will expire in 5 minutes.</p>
                </div>
            </div>
            """

            result = await self.email_service.send_email(
                to_email=email,
                subject=f"Your TargetAI Verification Code: {code}",
                content=f"Your verification code is: {code}\n\nThis code will expire in 5 minutes.",
                html_content=html_content
            )

            if result.get("success"):
                logger.info(f"Verification code sent successfully to {email}")
            else:
                logger.error(f"Failed to send email: {result.get('error')}")
                # Still return success but log the error
                logger.warning(f"EMAIL NOT SENT - Code for {email}: {code}")

            return "Verification code sent"

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in send_verification_code: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code"
            )

    async def verify_code(self, email: str, code: str) -> bool:
        """Verify the code"""
        verification = await file_storage.get_verification_code(email)

        if not verification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found"
            )

        # Check expiry
        if datetime.fromisoformat(verification.expires_at) < datetime.now(timezone.utc):
            await file_storage.delete_verification_code(email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code expired"
            )

        # Check code
        if verification.code != code:
            # Increment attempts
            verification.attempts += 1
            if verification.attempts >= 3:
                await file_storage.delete_verification_code(email)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed attempts"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )

        # Code is valid - don't delete yet, will delete after registration
        return True

    async def register(
        self,
        email: str,
        password: str,
        role: str,
        verified: bool = False,
        add_contributor: bool = False
    ) -> SimpleUser:
        """Register new user with optional multi-role support"""
        # Check if already exists
        existing_user = await file_storage.get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # For admin role, check whitelist
        if role == UserRole.ADMIN:
            if not await file_storage.is_admin_email_allowed(email):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email not authorized for admin registration"
                )

        # NEW: Setup roles array
        roles = [role]  # Primary role
        if add_contributor and role != "contributor":
            roles.append("contributor")

        # Set initial profile completion status
        profiles_complete = {}
        if role == "contributor":
            # Contributors have minimal profile, auto-complete
            profiles_complete["contributor"] = True
            is_profile_complete = True
        else:
            profiles_complete[role] = False
            if "contributor" in roles:
                profiles_complete["contributor"] = True
            is_profile_complete = False

        # Create user
        user = SimpleUser(
            id=str(uuid.uuid4()),
            email=email.lower(),
            password_hash=get_password_hash(password),
            role=role,  # Keep for compatibility
            roles=roles,  # NEW: All roles
            active_role=role,  # NEW: Initially set to primary role
            profiles_complete=profiles_complete,  # NEW
            is_email_verified=verified,
            is_profile_complete=is_profile_complete,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        await file_storage.create_user(user)

        # Delete verification code if exists
        await file_storage.delete_verification_code(email)

        logger.info(f"User registered: {email} with roles {roles}")
        return user

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login user"""
        user = await file_storage.get_user_by_email(email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Check if account is locked
        if user.locked_until:
            if datetime.fromisoformat(user.locked_until) > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account temporarily locked due to too many failed attempts"
                )
            else:
                # Unlock account
                await file_storage.update_user(email, {
                    "locked_until": None,
                    "login_attempts": 0
                })
                user.locked_until = None
                user.login_attempts = 0

        # Verify password
        if not verify_password(password, user.password_hash):
            # Increment login attempts
            user.login_attempts += 1
            updates = {"login_attempts": user.login_attempts}

            if user.login_attempts >= self.max_login_attempts:
                locked_until = datetime.now(timezone.utc) + self.lockout_duration
                updates["locked_until"] = locked_until.isoformat()

            await file_storage.update_user(email, updates)

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Reset login attempts and update last login
        await file_storage.update_user(email, {
            "login_attempts": 0,
            "locked_until": None,
            "last_login": datetime.now(timezone.utc).isoformat()
        })

        # Get profile if exists
        profile = await file_storage.get_profile(user.id)

        return {
            "user": user,
            "profile": profile,
            "needs_profile_completion": not user.is_profile_complete
        }

    async def request_password_reset(self, email: str) -> None:
        """Request password reset"""
        user = await file_storage.get_user_by_email(email)

        if user:
            # Generate reset token
            token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + self.reset_expiry).isoformat()

            await file_storage.save_password_reset(email, token, expires_at)

            # Send email
            reset_url = f"http://localhost:3000/auth/reset-password?token={token}"

            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                    <h1>TargetAI</h1>
                </div>
                <div style="padding: 30px;">
                    <h2>Password Reset Request</h2>
                    <p>Click the link below to reset your password:</p>
                    <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p style="color: #666;">This link will expire in 1 hour.</p>
                    <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                </div>
            </div>
            """

            await self.email_service.send_email(
                to_email=email,
                subject="Password Reset - TargetAI",
                content=f"Reset your password: {reset_url}\n\nThis link expires in 1 hour.",
                html_content=html_content
            )

    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset password with token"""
        reset = await file_storage.get_password_reset(token)

        if not reset:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )

        if reset.used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token already used"
            )

        if datetime.fromisoformat(reset.expires_at) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token expired"
            )

        # Update password
        await file_storage.update_user(reset.email, {
            "password_hash": get_password_hash(new_password)
        })

        # Mark token as used
        await file_storage.mark_reset_used(token)

        logger.info(f"Password reset for: {reset.email}")

# Singleton instance
auth_service = SimpleAuthService()
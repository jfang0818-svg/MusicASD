"""
Authentication Service
Handles JWT token generation, password hashing, and authentication
"""
import jwt
import secrets
import string
import uuid
import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

logger = logging.getLogger(__name__)

# JWT Bearer token
security = HTTPBearer()


class AuthService:
    """Authentication service"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt (has 72 byte limit)"""
        # Bcrypt has a 72-byte password limit, truncate if necessary
        password_bytes = password.encode('utf-8')[:72]
        # Generate salt and hash
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a bcrypt hash"""
        # Apply same truncation as hash_password for consistency
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)

    @staticmethod
    def create_access_token(data: Dict[str, Any]) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})

        encoded_jwt = jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode and verify a JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

    @staticmethod
    def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
        """Extract user ID from JWT token"""
        token = credentials.credentials
        payload = AuthService.decode_token(token)
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return user_id

    @staticmethod
    def get_current_user_email(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
        """Extract user email from JWT token"""
        token = credentials.credentials
        payload = AuthService.decode_token(token)
        email = payload.get("email")

        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return email

    @staticmethod
    def generate_verification_code() -> str:
        """Generate 6-digit verification code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    @staticmethod
    async def send_verification_code(email: str, azure_storage, email_service) -> str:
        """Send verification code to email"""
        try:
            # Normalize email to lowercase
            email = email.lower()

            # Check if email already exists
            existing_user = await azure_storage.get_user_by_email(email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already registered. Would you like to log in instead?"
                )

            # Generate and save code
            code = AuthService.generate_verification_code()
            expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

            await azure_storage.save_verification_code(email, code, expires_at)

            # Log the code for debugging
            logger.info(f"Generated verification code for {email}: {code}")

            # Send email
            result = await email_service.send_verification_code(email, code, expires_in_minutes=5)

            if result.get("success"):
                logger.info(f"Verification code sent successfully to {email}")
            else:
                logger.error(f"Failed to send email: {result.get('error')}")
                logger.warning(f"EMAIL NOT SENT - Code for {email}: {code}")

            return "Verification code sent"

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            logger.error(f"Error in send_verification_code: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code"
            )

    @staticmethod
    async def verify_code(email: str, code: str, azure_storage) -> bool:
        """Verify the code"""
        # Normalize email to lowercase
        email = email.lower()

        verification = await azure_storage.get_verification_code(email)

        if not verification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found"
            )

        # Check expiry
        if datetime.fromisoformat(verification["expires_at"]) < datetime.now(timezone.utc):
            await azure_storage.delete_verification_code(email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code expired"
            )

        # Check code
        if verification["code"] != code:
            # Increment attempts
            attempts = verification.get("attempts", 0) + 1
            if attempts >= 3:
                await azure_storage.delete_verification_code(email)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed attempts"
                )
            await azure_storage.update_verification_attempts(email, attempts)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )

        # Code is valid
        return True

    @staticmethod
    async def register(
        email: str,
        password: str,
        name: str,
        azure_storage,
        verified: bool = False,
        is_caregiver: bool = False
    ) -> Dict[str, Any]:
        """Register new user"""
        # Normalize email to lowercase
        email = email.lower()

        # Check if already exists
        existing_user = await azure_storage.get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered. Would you like to log in instead?"
            )

        # Calculate trial period (14 days)
        trial_start = datetime.now(timezone.utc)
        trial_end = trial_start + timedelta(days=14)

        # Create user
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email.lower(),
            "password_hash": AuthService.hash_password(password),
            "name": name,
            "is_caregiver": is_caregiver,
            "subscription_status": "trial",
            "trial_start_date": trial_start.isoformat(),
            "trial_end_date": trial_end.isoformat(),
            "is_email_verified": verified,
            "login_attempts": 0,
            "locked_until": None,
            "created_at": trial_start.isoformat(),
            "updated_at": trial_start.isoformat()
        }

        await azure_storage.save_user(user_id, user_data)

        # Delete verification code if exists
        await azure_storage.delete_verification_code(email)

        logger.info(f"User registered: {email}, is_caregiver: {is_caregiver}")
        return user_data

    @staticmethod
    async def login(email: str, password: str, azure_storage) -> Dict[str, Any]:
        """Login user with account lockout"""
        # Normalize email to lowercase
        email = email.lower()

        user = await azure_storage.get_user_by_email(email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Check if account is locked
        if user.get("locked_until"):
            locked_until_dt = datetime.fromisoformat(user["locked_until"])
            if locked_until_dt > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account temporarily locked due to too many failed attempts"
                )
            else:
                # Unlock account
                await azure_storage.update_user(email, {
                    "locked_until": None,
                    "login_attempts": 0
                })
                user["locked_until"] = None
                user["login_attempts"] = 0

        # Verify password
        if not AuthService.verify_password(password, user["password_hash"]):
            # Increment login attempts
            login_attempts = user.get("login_attempts", 0) + 1
            updates = {"login_attempts": login_attempts}

            if login_attempts >= 10:  # 10 failed attempts
                locked_until = datetime.now(timezone.utc) + timedelta(hours=1)
                updates["locked_until"] = locked_until.isoformat()

            await azure_storage.update_user(email, updates)

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Reset login attempts and update last login
        await azure_storage.update_user(email, {
            "login_attempts": 0,
            "locked_until": None,
            "last_login": datetime.now(timezone.utc).isoformat()
        })

        return user

    @staticmethod
    async def request_password_reset(email: str, azure_storage, email_service) -> None:
        """Request password reset"""
        # Normalize email to lowercase
        email = email.lower()

        user = await azure_storage.get_user_by_email(email)

        if user:
            # Generate reset token
            token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

            await azure_storage.save_password_reset(email, token, expires_at)

            # Send email
            await email_service.send_password_reset(
                email=email,
                reset_token=token,
                frontend_url="http://localhost:3001"
            )

    @staticmethod
    async def reset_password(token: str, new_password: str, azure_storage) -> None:
        """Reset password with token"""
        reset = await azure_storage.get_password_reset(token)

        if not reset:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )

        if reset.get("used"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token already used"
            )

        if datetime.fromisoformat(reset["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token expired"
            )

        # Update password
        await azure_storage.update_user(reset["email"], {
            "password_hash": AuthService.hash_password(new_password)
        })

        # Mark token as used
        await azure_storage.mark_reset_used(token)

        logger.info(f"Password reset for: {reset['email']}")


# Singleton instance
auth_service = AuthService()

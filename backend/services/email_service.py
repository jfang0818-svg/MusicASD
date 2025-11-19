"""
Email Service for SonicSoothe
Handles sending emails via SMTP with beautiful HTML templates
"""
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for SonicSoothe with Zoho SMTP support"""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

        # Check if email is configured
        self.is_configured = bool(
            self.smtp_host and
            self.smtp_user and
            self.smtp_password
        )

        if not self.is_configured:
            logger.warning("⚠️ Email service not configured - emails will be logged only (dev mode)")
        else:
            logger.info(f"✅ Email service configured with {self.smtp_host}:{self.smtp_port}")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        html_content: Optional[str] = None,
        to_name: str = ""
    ) -> Dict[str, Any]:
        """
        Send an email via SMTP

        Returns:
            Dict with keys: success (bool), error (str)
        """
        logger.info(f"📧 Sending email to {to_email}: {subject}")

        # If not configured, log and return (dev mode)
        if not self.is_configured:
            logger.warning(f"📝 DEV MODE - Email would be sent to {to_email}:")
            logger.warning(f"   Subject: {subject}")
            logger.warning(f"   Content: {content[:200]}...")
            return {
                "success": True,  # Return True in dev mode for testing
                "error": None,
                "dev_mode": True
            }

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email

            # Add text part
            text_part = MIMEText(content, 'plain', 'utf-8')
            msg.attach(text_part)

            # Add HTML part if provided
            if html_content:
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)

            # Send email via Zoho SMTP
            context = ssl.create_default_context()

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                if self.smtp_port == 587:  # TLS
                    server.starttls(context=context)

                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"✅ Email sent successfully to {to_email}")
            return {"success": True, "error": None}

        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}

    async def send_verification_code(
        self,
        email: str,
        code: str,
        expires_in_minutes: int = 5
    ) -> Dict[str, Any]:
        """Send verification code email with SonicSoothe branding"""

        subject = f"Your SonicSoothe Verification Code: {code}"

        plain_content = f"""
Welcome to SonicSoothe - Music Therapy, Reimagined!

Your verification code is: {code}

This code will expire in {expires_in_minutes} minutes.

If you didn't request this code, please ignore this email.

Best regards,
The SonicSoothe Team
"""

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .email-container {{
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0 0 10px 0;
            font-size: 32px;
            font-weight: 700;
        }}
        .header p {{
            margin: 0;
            opacity: 0.95;
            font-size: 16px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .content h2 {{
            color: #6366f1;
            margin-top: 0;
        }}
        .code-box {{
            background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%);
            padding: 30px;
            text-align: center;
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 30px 0;
            border-radius: 16px;
            color: #6366f1;
            border: 2px dashed #6366f1;
        }}
        .warning {{
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }}
        .emoji {{
            font-size: 24px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="emoji">🎵</div>
            <h1>SonicSoothe</h1>
            <p>Music Therapy, Reimagined ✨</p>
        </div>

        <div class="content">
            <h2>Verify Your Email 📧</h2>
            <p>Welcome! Please use the verification code below to complete your registration:</p>

            <div class="code-box">
                {code}
            </div>

            <div class="warning">
                ⏱️ This code will expire in {expires_in_minutes} minutes
            </div>

            <p>Enter this code on the registration page to verify your email address and start your music therapy journey!</p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't request this verification code, please ignore this email.
            </p>
        </div>

        <div class="footer">
            <p>Made with 💙 for ASD therapy</p>
            <p>© 2024 SonicSoothe. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=email,
            subject=subject,
            content=plain_content,
            html_content=html_content
        )

    async def send_password_reset(
        self,
        email: str,
        reset_token: str,
        frontend_url: str = "http://localhost:3001"
    ) -> Dict[str, Any]:
        """Send password reset email"""

        reset_url = f"{frontend_url}/reset-password?token={reset_token}"

        subject = "Password Reset - SonicSoothe"

        plain_content = f"""
Password Reset Request

We received a request to reset your SonicSoothe account password.

Click this link to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The SonicSoothe Team
"""

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .email-container {{
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 32px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .button {{
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }}
        .button-container {{
            text-align: center;
            margin: 30px 0;
        }}
        .warning {{
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div style="font-size: 24px;">🔐</div>
            <h1>Password Reset</h1>
        </div>

        <div class="content">
            <h2 style="color: #6366f1;">Reset Your Password</h2>
            <p>We received a request to reset your SonicSoothe account password.</p>

            <div class="button-container">
                <a href="{reset_url}" class="button">
                    Reset Password
                </a>
            </div>

            <div class="warning">
                ⚠️ This link will expire in 1 hour for security reasons
            </div>

            <p style="color: #666; font-size: 14px;">
                If you didn't request this password reset, please ignore this email.
                Your password will remain unchanged.
            </p>
        </div>

        <div class="footer">
            <p>Made with 💙 for ASD therapy</p>
            <p>© 2024 SonicSoothe. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=email,
            subject=subject,
            content=plain_content,
            html_content=html_content
        )

    async def send_welcome_email(
        self,
        email: str,
        name: str
    ) -> Dict[str, Any]:
        """Send welcome email after successful registration"""

        subject = "Welcome to SonicSoothe! 🎵"

        plain_content = f"""
Welcome to SonicSoothe, {name}!

Your account has been created successfully.

SonicSoothe is an AI-powered music therapy platform designed for children with ASD.
Start creating personalized therapy sessions and track engagement in real-time.

Get started by logging in to your account:
http://localhost:3001/login

What you can do:
- Create child profiles with personalized preferences
- Start therapy sessions with adaptive music
- Track engagement with AI-powered analytics
- Generate custom music therapy sessions

Best regards,
The SonicSoothe Team
"""

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .email-container {{
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%);
            color: white;
            padding: 50px 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 10px 0;
            font-size: 36px;
            font-weight: 700;
        }}
        .header p {{
            margin: 0;
            opacity: 0.95;
            font-size: 18px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .button {{
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }}
        .features {{
            background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%);
            padding: 25px;
            border-radius: 16px;
            margin: 25px 0;
        }}
        .features li {{
            margin: 12px 0;
            padding-left: 5px;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div style="font-size: 48px;">🎶</div>
            <h1>Welcome to SonicSoothe!</h1>
            <p>Music Therapy, Reimagined ✨</p>
        </div>

        <div class="content">
            <h2 style="color: #6366f1;">Hi {name}! 🎉</h2>
            <p>Your account has been created successfully. Welcome to the future of music therapy!</p>

            <div class="features">
                <p><strong>What you can do now:</strong></p>
                <ul style="list-style: none; padding-left: 0;">
                    <li>🧒 Create child profiles with personalized preferences</li>
                    <li>🎵 Start therapy sessions with adaptive music</li>
                    <li>📊 Track engagement with AI-powered analytics</li>
                    <li>✨ Generate custom music therapy sessions</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="http://localhost:3001/login" class="button">
                    Get Started
                </a>
            </p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Need help? We're here to support your music therapy journey.
            </p>
        </div>

        <div class="footer">
            <p>Made with 💜 for ASD therapy • Powered by GPT-4 & Azure</p>
            <p>© 2024 SonicSoothe. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=email,
            subject=subject,
            content=plain_content,
            html_content=html_content,
            to_name=name
        )


# Singleton instance
email_service = EmailService()

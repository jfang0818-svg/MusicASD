# backend/app/services/email_service.py
import os
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from app.core.config import settings
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    """Simplified email service for TargetAI"""

    def __init__(self):
        # Use settings instead of os.getenv
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.from_email
        self.from_name = settings.from_name

        # Check if email is configured
        self.is_configured = bool(
            self.smtp_host and
            self.smtp_user and
            self.smtp_password
        )

        if not self.is_configured:
            logger.warning("Email service not configured - emails will be logged only")
        else:
            logger.info(f"Email service configured with {self.smtp_host}:{self.smtp_port}")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        html_content: Optional[str] = None,
        to_name: str = ""
    ) -> Dict[str, Any]:
        """
        Send an email

        Returns:
            Dict with keys: success (bool), error (str)
        """
        # Log the email attempt
        logger.info(f"Attempting to send email to {to_email}: {subject}")

        # If not configured, just log and return
        if not self.is_configured:
            logger.warning(f"Email service not configured. Would send to {to_email}:")
            logger.warning(f"Subject: {subject}")
            logger.warning(f"Content: {content[:200]}...")
            return {
                "success": False,
                "error": "Email service not configured (dev mode)"
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

            # Send email
            context = ssl.create_default_context()

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                if self.smtp_port == 587:  # TLS
                    server.starttls(context=context)

                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return {"success": True}

        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    async def send_verification_email(
        self,
        email: str,
        code: str,
        expires_in_minutes: int = 5
    ) -> Dict[str, Any]:
        """Send verification code email"""

        subject = f"Your TargetAI Verification Code: {code}"

        plain_content = f"""
Welcome to TargetAI!

Your verification code is: {code}

This code will expire in {expires_in_minutes} minutes.

If you didn't request this code, please ignore this email.

Best regards,
The TargetAI Team
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
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
        }}
        .code-box {{
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            margin: 20px 0;
            border-radius: 8px;
            color: #667eea;
        }}
        .warning {{
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 14px;
        }}
        .footer {{
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>TargetAI</h1>
        <p>Your Path to the Perfect College Match</p>
    </div>
    <div class="content">
        <h2>Verify Your Email</h2>
        <p>Welcome to TargetAI! Please use the verification code below to complete your registration:</p>

        <div class="code-box">
            {code}
        </div>

        <div class="warning">
            ⏱️ This code will expire in {expires_in_minutes} minutes
        </div>

        <p>Enter this code on the registration page to verify your email address.</p>

        <p style="color: #666; font-size: 14px;">
            If you didn't request this verification code, please ignore this email.
        </p>
    </div>
    <div class="footer">
        <p>© 2024 TargetAI. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
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

    async def send_password_reset_email(
        self,
        email: str,
        reset_token: str
    ) -> Dict[str, Any]:
        """Send password reset email"""

        reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token={reset_token}"

        subject = "Password Reset - TargetAI"

        plain_content = f"""
Password Reset Request

We received a request to reset your TargetAI account password.

Click this link to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The TargetAI Team
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
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .warning {{
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>TargetAI</h1>
    </div>
    <div class="content">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your TargetAI account password.</p>

        <p style="text-align: center;">
            <a href="{reset_url}" class="button">Reset Password</a>
        </p>

        <div class="warning">
            ⚠️ This link will expire in 1 hour for security reasons
        </div>

        <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, please ignore this email.
            Your password will remain unchanged.
        </p>
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

    async def send_connection_request_email(
        self,
        to_email: str,
        from_email: str,
        from_name: str,
        connection_type: str
    ) -> Dict[str, Any]:
        """Send connection request notification"""

        relationship = {
            'parent_student': 'parent',
            'student_parent': 'child',
            'student_counselor': 'student'
        }.get(connection_type, 'user')

        subject = f"Connection Request from {from_name}"

        plain_content = f"""
Connection Request on TargetAI

{from_name} ({from_email}) has sent you a connection request as your {relationship}.

Please log in to TargetAI to approve or decline this request.

Best regards,
The TargetAI Team
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
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
        }}
        .request-box {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Connection Request</h1>
    </div>
    <div class="content">
        <p>You have a new connection request on TargetAI!</p>

        <div class="request-box">
            <p><strong>From:</strong> {from_name}</p>
            <p><strong>Email:</strong> {from_email}</p>
            <p><strong>Relationship:</strong> Your {relationship}</p>
        </div>

        <p>Please log in to your TargetAI account to approve or decline this request.</p>

        <p style="text-align: center;">
            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login" class="button">
                Go to TargetAI
            </a>
        </p>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            content=plain_content,
            html_content=html_content
        )

    async def send_connection_response_email(
        self,
        to_email: str,
        from_name: str,
        status: str  # 'approved' or 'rejected'
    ) -> Dict[str, Any]:
        """Send connection response notification"""

        subject = f"Connection Request {status.capitalize()}"

        if status == 'approved':
            message = f"{from_name} has approved your connection request!"
            color = "#28a745"
        else:
            message = f"{from_name} has declined your connection request."
            color = "#dc3545"

        plain_content = f"""
Connection Request Update

{message}

You can log in to TargetAI to view your connections.

Best regards,
The TargetAI Team
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
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
        }}
        .status-box {{
            background: #f8f9fa;
            padding: 20px;
            border-left: 4px solid {color};
            border-radius: 8px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Connection Update</h1>
    </div>
    <div class="content">
        <div class="status-box">
            <p style="margin: 0; font-size: 16px;">{message}</p>
        </div>

        <p>You can log in to your TargetAI account to view all your connections.</p>
    </div>
</body>
</html>
"""

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            content=plain_content,
            html_content=html_content
        )

    async def send_welcome_email(
        self,
        email: str,
        name: str,
        role: str
    ) -> Dict[str, Any]:
        """Send welcome email after successful registration"""

        subject = "Welcome to TargetAI!"

        role_message = {
            'student': "Start building your college profile and discover your perfect matches.",
            'parent': "Connect with your child to support their college journey.",
            'counselor': "Manage your students and guide them to success.",
            'admin': "Welcome to the TargetAI admin panel."
        }.get(role, "Welcome to TargetAI!")

        plain_content = f"""
Welcome to TargetAI, {name}!

Your account has been created successfully.

{role_message}

Get started by logging in to your account:
{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login

Best regards,
The TargetAI Team
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
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }}
        .header h1 {{
            margin: 0;
            font-size: 32px;
        }}
        .content {{
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .features {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .features li {{
            margin: 10px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to TargetAI!</h1>
        <p>Your Path to the Perfect College Match</p>
    </div>
    <div class="content">
        <h2>Hi {name}! 🎉</h2>
        <p>Your account has been created successfully.</p>

        <p style="font-size: 16px; color: #667eea; font-weight: 500;">
            {role_message}
        </p>

        <div class="features">
            <p><strong>What you can do now:</strong></p>
            <ul>
                <li>Complete your profile</li>
                <li>Explore AI-powered assessments</li>
                <li>Get personalized college recommendations</li>
                <li>Track your application progress</li>
            </ul>
        </div>

        <p style="text-align: center;">
            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login" class="button">
                Get Started
            </a>
        </p>

        <p style="color: #666; font-size: 14px;">
            Need help? Contact us at support@targetai.com
        </p>
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

async def send_relationship_verification_email(
    self,
    to_email: str,
    student_name: str,
    relationship_type: str,  # 'parent' or 'counselor'
    verification_token: str,
    frontend_url: str
) -> Dict[str, Any]:
    """
    Send relationship verification email to parent or counselor

    Args:
        to_email: Email address to send to
        student_name: Full name of the student
        relationship_type: 'parent' or 'counselor'
        verification_token: Verification token
        frontend_url: Frontend base URL
    """

    # Create verification link
    verification_url = f"{frontend_url}/verify-relationship?token={verification_token}"

    # Customize subject and content based on relationship type
    if relationship_type == 'parent':
        subject = f"Verify Your Relationship with {student_name} on TargetAI"
        role_description = "parent"
        greeting = "Hi"
    else:  # counselor
        subject = f"Verify Your Counselor Relationship with {student_name} on TargetAI"
        role_description = "counselor"
        greeting = "Hi"

    # Plain text content
    plain_content = f"""
{greeting},

{student_name} has added you as their {role_description} on TargetAI, a college application management platform.

Please verify this relationship by clicking the link below:
{verification_url}

This link will expire in 7 days.

If you did not expect this email or have questions, please contact support@targetai.com.

Best regards,
The TargetAI Team
"""

    # HTML content
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
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.9;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .content p {{
            margin: 0 0 15px 0;
            font-size: 16px;
        }}
        .verification-box {{
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 25px 0;
            border-radius: 5px;
        }}
        .verification-box p {{
            margin: 0;
            font-weight: 500;
        }}
        .button-container {{
            text-align: center;
            margin: 30px 0;
        }}
        .button {{
            display: inline-block;
            padding: 15px 40px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }}
        .button:hover {{
            background: #5568d3;
        }}
        .warning {{
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 14px;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
        }}
        .footer p {{
            margin: 5px 0;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>TargetAI</h1>
            <p>College Application Management Platform</p>
        </div>

        <div class="content">
            <h2 style="color: #333; margin-top: 0;">Verify Your Relationship</h2>

            <p>{greeting},</p>

            <div class="verification-box">
                <p><strong>{student_name}</strong> has added you as their {role_description} on TargetAI.</p>
            </div>

            <p>Please verify this relationship by clicking the button below:</p>

            <div class="button-container">
                <a href="{verification_url}" class="button">
                    Verify Relationship
                </a>
            </div>

            <div class="warning">
                <strong>⏰ Important:</strong> This verification link will expire in 7 days for security reasons.
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you did not expect this email or have questions, please contact us at
                <a href="mailto:support@targetai.com" style="color: #667eea;">support@targetai.com</a>
            </p>
        </div>

        <div class="footer">
            <p><strong>TargetAI</strong></p>
            <p>&copy; 2024 TargetAI. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
"""

    return await self.send_email(
        to_email=to_email,
        subject=subject,
        content=plain_content,
        html_content=html_content
    )

email_service = EmailService()
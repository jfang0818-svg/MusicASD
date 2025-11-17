"""Test email service"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from services.email_service import email_service

async def test_email():
    print("Testing email service...")
    print(f"Email service configured: {email_service.is_configured}")
    print(f"SMTP Host: {email_service.smtp_host}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"SMTP User: {email_service.smtp_user}")
    print(f"From Email: {email_service.from_email}")

    try:
        result = await email_service.send_verification_code(
            email="test@example.com",
            code="123456"
        )
        print(f"\nResult: {result}")
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_email())

"""Test full verification flow"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from services.auth import auth_service, AuthService
from services.azure_storage import azure_storage
from services.email_service import email_service

async def test_flow():
    print("Testing full verification flow...")

    # Initialize Azure Storage
    try:
        await azure_storage.initialize()
        print("[OK] Azure Storage initialized")
    except Exception as e:
        print(f"[ERROR] Azure Storage initialization failed: {e}")
        return

    # Test send_verification_code
    test_email = "test@example.com"
    print(f"\nTesting send_verification_code for {test_email}...")

    try:
        result = await AuthService.send_verification_code(
            email=test_email,
            azure_storage=azure_storage,
            email_service=email_service
        )
        print(f"[OK] Result: {result}")
    except Exception as e:
        print(f"[ERROR] Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    # Check if verification code was saved
    try:
        verification = await azure_storage.get_verification_code(test_email)
        if verification:
            print(f"\n[OK] Verification code saved: {verification}")
        else:
            print("\n[ERROR] No verification code found in storage")
    except Exception as e:
        print(f"\n[ERROR] Error checking verification code: {e}")

    # Cleanup
    try:
        await azure_storage.close()
        print("\n[OK] Azure Storage closed")
    except:
        pass

if __name__ == "__main__":
    asyncio.run(test_flow())

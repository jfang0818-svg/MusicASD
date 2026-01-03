"""
Camera API endpoints
"""
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/camera", tags=["camera"])

# Pydantic model
class CameraToggle(BaseModel):
    enabled: bool

def get_state():
    from main import state
    return state

@router.post("/toggle")
def toggle_camera(toggle: CameraToggle):
    """Enable/disable camera for MediaPipe pose detection"""
    state = get_state()

    previous_state = state.camera_enabled
    state.camera_enabled = toggle.enabled

    # Log camera state change if session is active
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": f"Camera {'Enabled' if toggle.enabled else 'Disabled'}",
            "previous_state": previous_state,
            "current_state": toggle.enabled
        }
        state.logs.append(log_entry)

    logger.info("Camera %s", "enabled" if toggle.enabled else "disabled")

    return {
        "status": "success",
        "camera_enabled": state.camera_enabled,
        "previous_state": previous_state,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/status")
def camera_status():
    """Get camera status"""
    state = get_state()

    return {
        "enabled": state.camera_enabled,
        "session_active": state.session_active,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/enable")
def enable_camera():
    """Enable camera"""
    state = get_state()

    if state.camera_enabled:
        return {
            "status": "already_enabled",
            "message": "Camera is already enabled",
            "timestamp": datetime.now().isoformat()
        }

    state.camera_enabled = True

    # Log if session is active
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": "Camera Enabled"
        }
        state.logs.append(log_entry)

    logger.info("Camera enabled via direct endpoint")

    return {
        "status": "success",
        "camera_enabled": True,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/disable")
def disable_camera():
    """Disable camera"""
    state = get_state()

    if not state.camera_enabled:
        return {
            "status": "already_disabled",
            "message": "Camera is already disabled",
            "timestamp": datetime.now().isoformat()
        }

    state.camera_enabled = False

    # Log if session is active
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": "Camera Disabled"
        }
        state.logs.append(log_entry)

    logger.info("Camera disabled via direct endpoint")

    return {
        "status": "success",
        "camera_enabled": False,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/permissions")
def check_camera_permissions():
    """Check camera permissions (mock - actual implementation would check browser permissions)"""
    # This would typically interface with frontend to check browser permissions
    return {
        "has_permission": True,  # Mock value
        "permission_state": "granted",  # granted, denied, prompt
        "message": "Camera permissions check (mock implementation)"
    }

@router.post("/snapshot")
def capture_snapshot():
    """Capture a snapshot from camera (placeholder for future implementation)"""
    state = get_state()

    if not state.camera_enabled:
        raise HTTPException(status_code=400, detail="Camera is not enabled")

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session")

    # This would trigger actual snapshot capture in production
    snapshot_id = f"snapshot_{int(datetime.now().timestamp())}"

    # Log snapshot event
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Snapshot Captured",
        "snapshot_id": snapshot_id
    }
    state.logs.append(log_entry)

    return {
        "status": "success",
        "snapshot_id": snapshot_id,
        "message": "Snapshot capture simulated (placeholder)",
        "timestamp": datetime.now().isoformat()
    }

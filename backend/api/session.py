"""
Session API endpoints
"""

from datetime import datetime
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/session", tags=["session"])

# Pydantic models
class SessionStart(BaseModel):
    """Request model for starting a new therapy session"""
    child_id: str

class SessionLog(BaseModel):
    """Request model for logging session events"""
    event: str
    note: Optional[str] = ""
    engagement: Optional[str] = None
    music_style: Optional[str] = None
    suggestion: Optional[str] = None
    caregiver_action: Optional[str] = None
    child_response: Optional[str] = None

def get_state():
    """Get the global application state (for backwards compatibility)"""
    from main import state  # pylint: disable=import-outside-toplevel
    return state

@router.post("/start")
async def start_session(
    session_data: SessionStart,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Start a new therapy session for a specific child (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify child profile exists and belongs to user
    profile = await azure_storage.get_child_profile(user_id, session_data.child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create session using SessionManager (handles auto-ending previous sessions)
    try:
        session = await session_manager.create_session(
            user_id=user_id,
            child_id=session_data.child_id,
            child_name=profile["demographics"]["name"]
        )

        # Also update legacy global state for backwards compatibility
        state = get_state()
        state.session_active = True
        state.session_id = session["id"]
        state.child_id = session_data.child_id
        state.user_id = user_id
        state.logs = []

        logger.info(
            "Session started: %s for child %s",
            session['id'],
            session_data.child_id
        )

        return {
            "status": "started",
            "session_id": session["id"],
            "child_id": session["child_id"],
            "child_name": session["child_name"],
            "timestamp": session["timestamp"]
        }

    except Exception as e:
        logger.error("Failed to start session: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start session: {str(e)}"
        ) from e

@router.post("/stop")
async def stop_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Stop current therapy session (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()
    state = get_state()

    # Get active session ID
    active_session_id = session_manager.get_active_session(user_id)
    if not active_session_id and not state.session_active:
        return {
            "status": "no_active_session",
            "message": "No session to stop"
        }

    # Use session ID from SessionManager or fall back to state
    session_id = active_session_id or state.session_id

    # Stop music if playing
    if state.music_playing:
        try:
            import pygame
            pygame.mixer.music.stop()
            state.music_playing = False
            state.current_music = None
        except Exception as e:
            logger.error("Error stopping music: %s", str(e))

    # End session using SessionManager
    try:
        result = await session_manager.end_session(session_id, user_id)

        # Reset legacy global state
        state.session_active = False
        state.camera_enabled = False
        if hasattr(state, 'child_id'):
            delattr(state, 'child_id')
        if hasattr(state, 'user_id'):
            delattr(state, 'user_id')

        logger.info("Session stopped: %s", session_id)
        return {
            "status": "stopped",
            "session_id": session_id,
            "duration_seconds": result.get("duration_seconds", 0),
            "total_logs": result.get("total_logs", 0),
            "timestamp": datetime.now().isoformat()
        }

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail="Access denied - session belongs to another user"
        ) from exc
    except Exception as e:
        logger.error("Failed to stop session: %s", str(e))
        # Fall back to legacy behavior
        state.session_active = False
        return {
            "status": "stopped",
            "session_id": session_id,
            "message": "Session stopped (fallback mode)"
        }

@router.get("/status")
def session_status():
    """Get current session status"""
    state = get_state()

    return {
        "active": state.session_active,
        "session_id": state.session_id,
        "engagement": state.engagement_level,
        "music_playing": state.music_playing,
        "current_music": state.current_music,
        "camera_enabled": state.camera_enabled,
        "log_count": len(state.logs),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/log")
async def log_session(log: SessionLog, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Log session events (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()
    state = get_state()

    # Get active session
    session_id = session_manager.get_active_session(user_id) or state.session_id

    if not session_id:
        raise HTTPException(status_code=400, detail="No active session")

    # Prepare log entry
    log_entry = {
        "event": log.event,
        "note": log.note,
        "engagement": log.engagement,
        "music_style": log.music_style,
        "suggestion": log.suggestion,
        "caregiver_action": log.caregiver_action,
        "child_response": log.child_response
    }

    # Add log using SessionManager (handles ownership verification)
    try:
        await session_manager.add_log(session_id, user_id, log_entry)

        # Also add to legacy state for backwards compatibility
        state.logs.append({
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            **log.dict()
        })

        logger.info("Event logged: %s", log.event)
        return {"status": "logged", "timestamp": datetime.now().isoformat()}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except Exception as e:
        logger.error("Failed to log event: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to log event") from e

@router.get("/logs")
def get_logs():
    """Get session logs"""
    state = get_state()

    if not state.session_active and not state.logs:
        return {
            "logs": [],
            "count": 0,
            "session_id": None,
            "message": "No active session or logs"
        }

    return {
        "logs": state.logs,
        "count": len(state.logs),
        "session_id": state.session_id
    }

@router.get("/logs/{session_id}")
async def get_session_logs(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get logs for a specific session from Azure Blob Storage"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    try:
        # Get session data from Azure Blob Storage
        session_data = await azure_storage.find_session_by_id(session_id)

        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Verify user owns this session
        if session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied - session belongs to another user"
            )

        # Extract logs from session data
        logs = session_data.get("logs", [])

        return {
            "session_id": session_id,
            "logs": logs,
            "count": len(logs)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to retrieve logs: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve session logs"
        ) from e

@router.post("/pause")
def pause_session():
    """Pause current session"""
    state = get_state()

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session to pause")

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Paused"
    }
    state.logs.append(log_entry)

    return {
        "status": "paused",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/resume")
def resume_session():
    """Resume paused session"""
    state = get_state()

    if not state.session_id:
        raise HTTPException(status_code=400, detail="No session to resume")

    state.session_active = True

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Resumed"
    }
    state.logs.append(log_entry)

    return {
        "status": "resumed",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/caregiver/action")
def caregiver_action(request: dict = Body(...)):
    """Record caregiver action on GPT suggestion"""
    state = get_state()

    action = request.get("action")
    note = request.get("note")
    modified_style = request.get("modified_style")

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session")

    # Log the action
    log_entry = SessionLog(
        event=f"Caregiver Action: {action}",
        note=note or "",
        caregiver_action=action,
        music_style=modified_style
    )

    # Use existing log_session function logic
    timestamp = datetime.now()
    log_data = {
        "timestamp": timestamp.isoformat(),
        "session_id": state.session_id,
        **log_entry.dict()
    }
    state.logs.append(log_data)

    logger.info("Caregiver action recorded: %s", action)

    return {
        "status": "success",
        "action": action,
        "timestamp": timestamp.isoformat()
    }

@router.post("/gpt/suggest")
def get_gpt_suggestion():
    """Get GPT suggestion (mock for now, will integrate with gpt_client.py)"""
    state = get_state()

    # Mock implementation - will be replaced with actual GPT client
    suggestions = {
        "LOW": {
            "suggestion": "Try some uplifting music to gently increase engagement",
            "style": "happy",
            "phrase": "Let's listen to happy sounds together!"
        },
        "MED": {
            "suggestion": "Maintain the current balanced state with calm music",
            "style": "calm",
            "phrase": "You're doing great! Let's keep going."
        },
        "HIGH": {
            "suggestion": "Use calming music to help regulate energy",
            "style": "calm",
            "phrase": "Let's take a peaceful moment together."
        }
    }

    current_suggestion = suggestions.get(state.engagement_level, suggestions["MED"])

    # Log the suggestion
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": "GPT Suggestion Generated",
            "suggestion": current_suggestion["suggestion"],
            "music_style": current_suggestion["style"]
        }
        state.logs.append(log_entry)

    return current_suggestion

@router.post("/audio/mode")
def set_audio_mode(request: dict = Body(...)):
    """Set audio mode (files or generated)"""
    mode = request.get("mode", "files")

    if mode not in ["files", "generated"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'files' or 'generated'")

    # Store mode in state if needed
    return {"status": "success", "mode": mode}


@router.get("/sessions")
async def get_all_sessions(
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all sessions for the current user (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Get sessions from Azure Blob Storage
    sessions = await azure_storage.list_user_sessions(user_id, limit)

    # Map child_name to participantName for frontend compatibility
    for session in sessions:
        if "child_name" in session:
            session["participantName"] = session["child_name"]

    # Sort by start_time descending (most recent first)
    sessions.sort(key=lambda x: x.get("start_time", ""), reverse=True)

    return sessions


@router.get("/child/{child_id}/sessions")
async def get_child_sessions(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all sessions for a specific child (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child profile exists and belongs to user
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get sessions from Azure Blob Storage
    sessions = await azure_storage.list_child_sessions(child_id)

    # Sort by start_time descending (most recent first)
    sessions.sort(key=lambda x: x.get("start_time", ""), reverse=True)

    return {
        "child_id": child_id,
        "child_name": profile["demographics"]["name"],
        "sessions": sessions,
        "total_sessions": len(sessions)
    }


@router.post("/sessions/{session_id}/metrics")
async def update_session_metrics(
    session_id: str,
    metrics: list = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update session metrics (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    try:
        # Get session to verify ownership
        session = await session_manager.get_session(session_id)
        if not session:
            # Try loading from Azure if not in Redis
            session_data = await azure_storage.find_session_by_id(session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail="Session not found")
            session = session_data

        # Verify ownership
        if session.get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied - session belongs to another user"
            )

        # Update metrics
        await session_manager.update_session(session_id, {"metrics": metrics})

        # If session not in Redis (completed), update Azure directly
        if not await session_manager.get_session(session_id):
            session["metrics"] = metrics
            await azure_storage.save_session(
                session["child_id"],
                session_id,
                session
            )

        logger.info("Session %s metrics updated", session_id)
        return {
            "status": "success",
            "session_id": session_id,
            "metrics_count": len(metrics)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update metrics: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to update session metrics"
        ) from e


@router.post("/sessions/{session_id}/notes")
async def update_session_notes(
    session_id: str,
    notes: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update session quick notes (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    try:
        # Get session to verify ownership
        session = await session_manager.get_session(session_id)
        if not session:
            # Try loading from Azure if not in Redis
            session_data = await azure_storage.find_session_by_id(session_id)
            if not session_data:
                raise HTTPException(status_code=404, detail="Session not found")
            session = session_data

        # Verify ownership
        if session.get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied - session belongs to another user"
            )

        quick_notes = notes.get("quick_notes", "")

        # Update quick notes
        await session_manager.update_session(session_id, {"quick_notes": quick_notes})

        # If session not in Redis (completed), update Azure directly
        if not await session_manager.get_session(session_id):
            session["quick_notes"] = quick_notes
            await azure_storage.save_session(
                session["child_id"],
                session_id,
                session
            )

        logger.info("Session %s quick notes updated", session_id)
        return {
            "status": "success",
            "session_id": session_id,
            "notes_length": len(quick_notes)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update notes: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to update session notes"
        ) from e


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a session (requires authentication and ownership)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get all user sessions to find the one to delete
        all_sessions = await azure_storage.list_user_sessions(user_id, limit=1000)
        session = next((s for s in all_sessions if s.get("id") == session_id), None)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Verify ownership
        if session.get("user_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied - session belongs to another user"
            )

        # Delete the session
        child_id = session.get("child_id")
        success = await azure_storage.delete_session(child_id, session_id)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete session"
            )

        logger.info("Session deleted: %s by user %s", session_id, user_id)
        return {
            "status": "deleted",
            "session_id": session_id,
            "message": "Session deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete session: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session"
        ) from e

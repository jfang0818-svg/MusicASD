"""
Planned Sessions API endpoints
"""

from datetime import datetime
import logging
from typing import List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials

from models.schemas import PlannedSessionCreate, PlannedSessionUpdate, PlannedSessionResponse
from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/planned-sessions", tags=["planned-sessions"])


@router.post("", response_model=PlannedSessionResponse)
async def create_planned_session(
    session_data: PlannedSessionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new planned session (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child profile exists and belongs to user
    try:
        profile = await azure_storage.get_child_profile(user_id, session_data.childId)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
    except Exception as e:
        logger.error(f"Error verifying child profile: {e}")
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Create planned session document
    session_id = f"planned_session_{uuid.uuid4().hex[:12]}"
    current_time = datetime.utcnow().isoformat() + "Z"

    planned_session = {
        "id": session_id,
        "user_id": user_id,
        "childId": session_data.childId,
        "title": session_data.title,
        "scheduledDateTime": session_data.scheduledDateTime,
        "status": session_data.status,
        "goals": session_data.goals,
        "activities": session_data.activities,
        "musicStyles": session_data.musicStyles,
        "customPlaylist": session_data.customPlaylist,
        "notes": session_data.notes,
        "duration": session_data.duration,
        "isRecurring": session_data.isRecurring,
        "recurrencePattern": session_data.recurrencePattern,
        "createdAt": current_time,
        "updatedAt": current_time
    }

    try:
        await azure_storage.save_planned_session(user_id, session_id, planned_session)
        return PlannedSessionResponse(**planned_session)
    except Exception as e:
        logger.error(f"Error creating planned session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create planned session")


@router.get("", response_model=List[PlannedSessionResponse])
async def get_planned_sessions(
    childId: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all planned sessions, optionally filtered by child (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        sessions = await azure_storage.get_planned_sessions(user_id, childId)
        return [PlannedSessionResponse(**session) for session in sessions]
    except Exception as e:
        logger.error(f"Error fetching planned sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch planned sessions")


@router.get("/upcoming/{child_id}", response_model=List[PlannedSessionResponse])
async def get_upcoming_planned_sessions(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get upcoming planned sessions for a specific child (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child profile exists
    try:
        profile = await azure_storage.get_child_profile(user_id, child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
    except Exception as e:
        logger.error(f"Error verifying child profile: {e}")
        raise HTTPException(status_code=404, detail="Child profile not found")

    try:
        sessions = await azure_storage.get_upcoming_planned_sessions(user_id, child_id)
        return [PlannedSessionResponse(**session) for session in sessions]
    except Exception as e:
        logger.error(f"Error fetching upcoming planned sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming planned sessions")


@router.get("/{session_id}", response_model=PlannedSessionResponse)
async def get_planned_session(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific planned session by ID (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        session = await azure_storage.get_planned_session(user_id, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Planned session not found")
        return PlannedSessionResponse(**session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching planned session: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch planned session")


@router.put("/{session_id}", response_model=PlannedSessionResponse)
async def update_planned_session(
    session_id: str,
    session_data: PlannedSessionUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a planned session (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Get existing session
    try:
        existing_session = await azure_storage.get_planned_session(user_id, session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Planned session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching existing session: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch planned session")

    # Update only provided fields
    update_data = session_data.model_dump(exclude_unset=True)
    updated_session = {**existing_session, **update_data}
    updated_session["updatedAt"] = datetime.utcnow().isoformat() + "Z"

    try:
        await azure_storage.save_planned_session(user_id, session_id, updated_session)
        return PlannedSessionResponse(**updated_session)
    except Exception as e:
        logger.error(f"Error updating planned session: {e}")
        raise HTTPException(status_code=500, detail="Failed to update planned session")


@router.delete("/{session_id}")
async def delete_planned_session(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a planned session (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Verify session exists
    try:
        existing_session = await azure_storage.get_planned_session(user_id, session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Planned session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying planned session: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify planned session")

    try:
        await azure_storage.delete_planned_session(user_id, session_id)
        return {"message": "Planned session deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting planned session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete planned session")

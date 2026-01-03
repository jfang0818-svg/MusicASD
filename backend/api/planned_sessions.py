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
        logger.info(
            "Looking up child profile: user_id=%s, child_id=%s",
            user_id, session_data.childId
        )
        profile = await azure_storage.get_child_profile(user_id, session_data.childId)
        if not profile:
            logger.error(
                "Child profile not found: user_id=%s, child_id=%s",
                user_id, session_data.childId
            )
            raise HTTPException(
                status_code=404,
                detail=f"Child profile not found for child_id={session_data.childId}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error verifying child profile: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error verifying child profile: {str(e)}"
        ) from e

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
        result = await azure_storage.save_planned_session(user_id, session_id, planned_session)
        logger.info("POST /planned-sessions - saved=%s, user_id=%s, session_id=%s", result, user_id, session_id)
        return PlannedSessionResponse(**planned_session)
    except Exception as e:
        logger.error("Error creating planned session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create planned session") from e


@router.get("", response_model=List[PlannedSessionResponse])
async def get_planned_sessions(
    child_id: Optional[str] = Query(None, alias="childId"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all planned sessions, optionally filtered by child (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)
    logger.info("GET /planned-sessions - user_id=%s, child_id=%s", user_id, child_id)

    try:
        sessions = await azure_storage.get_planned_sessions(user_id, child_id)
        logger.info("Found %d planned sessions for user %s", len(sessions), user_id)
        return [PlannedSessionResponse(**session) for session in sessions]
    except Exception as e:
        logger.error("Error fetching planned sessions: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch planned sessions") from e


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
        logger.error("Error verifying child profile: %s", e)
        raise HTTPException(status_code=404, detail="Child profile not found") from e

    try:
        sessions = await azure_storage.get_upcoming_planned_sessions(user_id, child_id)
        return [PlannedSessionResponse(**session) for session in sessions]
    except Exception as e:
        logger.error("Error fetching upcoming planned sessions: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming planned sessions") from e


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
        logger.error("Error fetching planned session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch planned session") from e


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
        logger.error("Error fetching existing session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch planned session") from e

    # Update only provided fields
    update_data = session_data.model_dump(exclude_unset=True)
    updated_session = {**existing_session, **update_data}
    updated_session["updatedAt"] = datetime.utcnow().isoformat() + "Z"

    try:
        await azure_storage.save_planned_session(user_id, session_id, updated_session)
        return PlannedSessionResponse(**updated_session)
    except Exception as e:
        logger.error("Error updating planned session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update planned session") from e


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
        logger.error("Error verifying planned session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to verify planned session") from e

    try:
        await azure_storage.delete_planned_session(user_id, session_id)
        return {"message": "Planned session deleted successfully"}
    except Exception as e:
        logger.error("Error deleting planned session: %s", e)
        raise HTTPException(status_code=500, detail="Failed to delete planned session") from e

"""
Interactive Activities API

Turn-taking games and activities to build communication skills.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict
import uuid
from datetime import datetime

from models.interactive_activities import (
    ActivityDefinition,
    ActivitySession,
    TurnRecord,
    StartActivityRequest,
    RecordTurnRequest,
    CompleteActivityRequest,
    TurnStatus,
    ACTIVITY_TEMPLATES
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/activities", tags=["interactive_activities"])


@router.get("/templates", response_model=Dict[str, ActivityDefinition])
async def get_activity_templates():
    """Get all available activity templates"""
    return ACTIVITY_TEMPLATES


@router.get("/templates/{activity_type}", response_model=ActivityDefinition)
async def get_activity_template(activity_type: str):
    """Get a specific activity template"""
    if activity_type not in ACTIVITY_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity template '{activity_type}' not found"
        )
    return ACTIVITY_TEMPLATES[activity_type]


@router.post("/start", response_model=ActivitySession)
async def start_activity(
    request: StartActivityRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new interactive activity"""
    activity_session_id = f"activity_{request.session_id}_{uuid.uuid4().hex[:8]}"

    # Get activity template
    if request.activity_type.value not in ACTIVITY_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown activity type: {request.activity_type}"
        )

    template = ACTIVITY_TEMPLATES[request.activity_type.value]

    # Validate participant count
    if len(request.participants) < template.min_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least {template.min_participants} participants for {template.name}"
        )

    if len(request.participants) > template.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {template.max_participants} participants for {template.name}"
        )

    # Create activity session
    activity_session = ActivitySession(
        activity_session_id=activity_session_id,
        session_id=request.session_id,
        child_id=request.child_id,
        activity_type=request.activity_type,
        activity_name=template.name,
        participants=request.participants,
        status="active",
        current_turn_index=0,
        total_turns_taken=0
    )

    # Save to storage
    try:
        blob_path = f"activities/session_{request.session_id}/{activity_session_id}.json"
        await azure_storage._save_json(blob_path, activity_session.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start activity: {str(e)}"
        )

    return activity_session


@router.get("/{activity_session_id}", response_model=ActivitySession)
async def get_activity_session(
    activity_session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get activity session details"""
    try:
        # Search for activity across all sessions
        prefix = "activities/"
        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if activity_session_id in blob.name and blob.name.endswith(".json"):
                activity_data = await azure_storage._load_json(blob.name)
                if activity_data:
                    return ActivitySession(**activity_data)

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity session not found"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve activity: {str(e)}"
        )


@router.post("/turn/record", response_model=TurnRecord)
async def record_turn(
    request: RecordTurnRequest,
    current_user: dict = Depends(get_current_user)
):
    """Record a turn completion"""
    turn_id = f"turn_{request.activity_session_id}_{uuid.uuid4().hex[:6]}"

    # Load activity session to get turn number
    try:
        # Find the activity session
        prefix = "activities/"
        activity_blob_path = None
        activity_session = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if request.activity_session_id in blob.name and blob.name.endswith(".json"):
                activity_blob_path = blob.name
                activity_data = await azure_storage._load_json(blob.name)
                if activity_data:
                    activity_session = ActivitySession(**activity_data)
                break

        if not activity_session or not activity_blob_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity session not found"
            )

        # Create turn record
        turn_number = activity_session.total_turns_taken + 1
        turn_record = TurnRecord(
            turn_id=turn_id,
            activity_session_id=request.activity_session_id,
            participant_name=request.participant_name,
            turn_number=turn_number,
            turn_status=request.turn_status,
            engagement_level=request.engagement_level,
            completed_successfully=request.completed_successfully,
            notes=request.notes,
            completed_at=datetime.now().isoformat(),
            duration_seconds=0  # Can be calculated if needed
        )

        # Save turn record
        turn_blob_path = f"activities/turns/{request.activity_session_id}/{turn_id}.json"
        await azure_storage._save_json(turn_blob_path, turn_record.dict())

        # Update activity session
        activity_session.total_turns_taken = turn_number
        activity_session.current_turn_index = (activity_session.current_turn_index + 1) % len(activity_session.participants)

        await azure_storage._save_json(activity_blob_path, activity_session.dict())

        return turn_record

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record turn: {str(e)}"
        )


@router.get("/turns/{activity_session_id}", response_model=List[TurnRecord])
async def get_activity_turns(
    activity_session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all turns for an activity session"""
    try:
        turns = []
        prefix = f"activities/turns/{activity_session_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                turn_data = await azure_storage._load_json(blob.name)
                if turn_data:
                    turns.append(TurnRecord(**turn_data))

        # Sort by turn number
        turns.sort(key=lambda t: t.turn_number)
        return turns

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve turns: {str(e)}"
        )


@router.put("/complete", response_model=ActivitySession)
async def complete_activity(
    request: CompleteActivityRequest,
    current_user: dict = Depends(get_current_user)
):
    """Complete an activity session"""
    try:
        # Find and load activity session
        prefix = "activities/"
        activity_blob_path = None
        activity_session = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if request.activity_session_id in blob.name and blob.name.endswith(".json"):
                activity_blob_path = blob.name
                activity_data = await azure_storage._load_json(blob.name)
                if activity_data:
                    activity_session = ActivitySession(**activity_data)
                break

        if not activity_session or not activity_blob_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity session not found"
            )

        # Update activity session
        activity_session.status = "completed"
        activity_session.completed_at = datetime.now().isoformat()
        activity_session.engagement_rating = request.engagement_rating
        activity_session.therapist_notes = request.therapist_notes

        # Save updated session
        await azure_storage._save_json(activity_blob_path, activity_session.dict())

        return activity_session

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete activity: {str(e)}"
        )


@router.get("/session/{session_id}/all", response_model=List[ActivitySession])
async def get_session_activities(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all activities for a therapy session"""
    try:
        activities = []
        prefix = f"activities/session_{session_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                activity_data = await azure_storage._load_json(blob.name)
                if activity_data:
                    activities.append(ActivitySession(**activity_data))

        # Sort by start time
        activities.sort(key=lambda a: a.started_at)
        return activities

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve activities: {str(e)}"
        )


@router.get("/child/{child_id}/history", response_model=List[ActivitySession])
async def get_child_activity_history(
    child_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get activity history for a child"""
    try:
        activities = []
        prefix = "activities/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json") and "/turn" not in blob.name:
                activity_data = await azure_storage._load_json(blob.name)
                if activity_data and activity_data.get("child_id") == child_id:
                    activities.append(ActivitySession(**activity_data))

        # Sort by start time (most recent first)
        activities.sort(key=lambda a: a.started_at, reverse=True)
        return activities[:limit]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve activity history: {str(e)}"
        )

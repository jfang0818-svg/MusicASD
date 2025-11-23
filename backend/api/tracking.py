"""
Usage Tracking API
Tracks all music plays, activity usage, and resource access for analytics and personalization
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
import uuid

from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tracking", tags=["Usage Tracking"])


# ==================== Request Models ====================

class MusicPlayLog(BaseModel):
    child_id: str
    session_id: Optional[str] = None
    music_file: str
    music_title: str
    music_style: str  # calm, happy, energetic
    duration_played: int  # seconds
    completed: bool  # true if played to end
    skipped: bool
    replay: bool  # true if played again within 5 minutes
    context: Optional[str] = None  # e.g., "during_session", "library_preview"
    goal: Optional[str] = None  # therapy goal if in session
    reaction: Optional[str] = None  # positive, neutral, negative


class ActivityUsageLog(BaseModel):
    child_id: str
    session_id: Optional[str] = None
    activity_type: str  # sound_matching, ambient, storytelling, movement, emotion, recommendations
    activity_id: str
    activity_name: str
    duration_seconds: int
    completed: bool
    participation_level: Optional[str] = None  # full, partial, minimal, refused
    effectiveness_rating: Optional[int] = None  # 1-5
    context: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # activity-specific data


class ResourceAccessLog(BaseModel):
    child_id: str
    session_id: Optional[str] = None
    resource_type: str  # story, sound_pack, movement_routine, soundscape_preset
    resource_id: str
    resource_name: str
    action: str  # viewed, previewed, used, favorited
    duration_seconds: Optional[int] = None
    context: Optional[str] = None


# ==================== Endpoints ====================

@router.post("/music-play")
async def log_music_play(
    data: MusicPlayLog,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Log a music play event
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{data.child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Create log entry
    log_id = f"music_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    log_entry = {
        "log_id": log_id,
        "log_type": "music_play",
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        **data.dict()
    }

    # Save to Azure - organized by child and date
    date_str = datetime.now().strftime('%Y-%m-%d')
    blob_path = f"usage_logs/{data.child_id}/{date_str}/music/{log_id}.json"
    await azure_storage.save_json(blob_path, log_entry)

    logger.info(f"Logged music play: {data.music_title} for child {data.child_id}")

    return {
        "status": "logged",
        "log_id": log_id,
        "timestamp": log_entry["timestamp"]
    }


@router.post("/activity-usage")
async def log_activity_usage(
    data: ActivityUsageLog,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Log an activity usage event
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{data.child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Create log entry
    log_id = f"activity_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    log_entry = {
        "log_id": log_id,
        "log_type": "activity_usage",
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        **data.dict()
    }

    # Save to Azure
    date_str = datetime.now().strftime('%Y-%m-%d')
    blob_path = f"usage_logs/{data.child_id}/{date_str}/activities/{log_id}.json"
    await azure_storage.save_json(blob_path, log_entry)

    logger.info(f"Logged activity usage: {data.activity_name} for child {data.child_id}")

    return {
        "status": "logged",
        "log_id": log_id,
        "timestamp": log_entry["timestamp"]
    }


@router.post("/resource-access")
async def log_resource_access(
    data: ResourceAccessLog,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Log a resource access event
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{data.child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Create log entry
    log_id = f"resource_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    log_entry = {
        "log_id": log_id,
        "log_type": "resource_access",
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        **data.dict()
    }

    # Save to Azure
    date_str = datetime.now().strftime('%Y-%m-%d')
    blob_path = f"usage_logs/{data.child_id}/{date_str}/resources/{log_id}.json"
    await azure_storage.save_json(blob_path, log_entry)

    logger.info(f"Logged resource access: {data.resource_name} for child {data.child_id}")

    return {
        "status": "logged",
        "log_id": log_id,
        "timestamp": log_entry["timestamp"]
    }


@router.get("/child/{child_id}/history")
async def get_usage_history(
    child_id: str,
    days: int = 30,
    log_type: Optional[str] = None,  # music_play, activity_usage, resource_access
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get usage history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Collect logs from date range
    logs = []
    cutoff_date = datetime.now() - timedelta(days=days)

    # Search across date directories
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')

        # Search in each log type directory
        log_types = ['music', 'activities', 'resources']
        for lt in log_types:
            prefix = f"usage_logs/{child_id}/{date_str}/{lt}/"
            blob_names = []

            # List blobs in this directory
            try:
                async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
                    blob_names.append(blob.name)
            except Exception as e:
                logger.warning(f"Error listing blobs for {prefix}: {e}")
                continue

            # Load each log
            for blob_name in blob_names:
                log_data = await azure_storage.load_json(blob_name)
                if log_data:
                    # Filter by log_type if specified
                    if log_type is None or log_data.get("log_type") == log_type:
                        logs.append(log_data)

    # Sort by timestamp descending
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return {
        "child_id": child_id,
        "total_logs": len(logs),
        "date_range": {
            "start_date": cutoff_date.isoformat(),
            "end_date": datetime.now().isoformat()
        },
        "logs": logs[:100]  # Limit to 100 most recent
    }


@router.get("/child/{child_id}/analytics")
async def get_usage_analytics(
    child_id: str,
    days: int = 30,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get analytics and insights from usage data
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Get all logs
    all_logs = []
    cutoff_date = datetime.now() - timedelta(days=days)

    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')

        for lt in ['music', 'activities', 'resources']:
            prefix = f"usage_logs/{child_id}/{date_str}/{lt}/"

            try:
                async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
                    log_data = await azure_storage.load_json(blob.name)
                    if log_data:
                        all_logs.append(log_data)
            except Exception as e:
                logger.warning(f"Error loading analytics data: {e}")

    # Analyze logs
    music_plays = [log for log in all_logs if log.get("log_type") == "music_play"]
    activity_uses = [log for log in all_logs if log.get("log_type") == "activity_usage"]
    resource_accesses = [log for log in all_logs if log.get("log_type") == "resource_access"]

    # Music analytics
    music_by_style = {}
    total_music_time = 0
    for play in music_plays:
        style = play.get("music_style", "unknown")
        music_by_style[style] = music_by_style.get(style, 0) + 1
        total_music_time += play.get("duration_played", 0)

    # Activity analytics
    activity_by_type = {}
    total_activity_time = 0
    for activity in activity_uses:
        atype = activity.get("activity_type", "unknown")
        activity_by_type[atype] = activity_by_type.get(atype, 0) + 1
        total_activity_time += activity.get("duration_seconds", 0)

    # Most effective content
    completed_music = [p for p in music_plays if p.get("completed")]
    positive_activities = [a for a in activity_uses if a.get("effectiveness_rating", 0) >= 4]

    return {
        "child_id": child_id,
        "date_range": {
            "start_date": cutoff_date.isoformat(),
            "end_date": datetime.now().isoformat()
        },
        "totals": {
            "music_plays": len(music_plays),
            "activity_uses": len(activity_uses),
            "resource_accesses": len(resource_accesses),
            "total_music_minutes": round(total_music_time / 60, 1),
            "total_activity_minutes": round(total_activity_time / 60, 1)
        },
        "music_analytics": {
            "by_style": music_by_style,
            "completion_rate": round(len(completed_music) / len(music_plays) * 100, 1) if music_plays else 0,
            "most_played": sorted(
                [(p.get("music_title"), p.get("music_file")) for p in music_plays],
                key=lambda x: music_plays.count(x),
                reverse=True
            )[:5]
        },
        "activity_analytics": {
            "by_type": activity_by_type,
            "completion_rate": round(
                len([a for a in activity_uses if a.get("completed")]) / len(activity_uses) * 100, 1
            ) if activity_uses else 0,
            "highly_effective": len(positive_activities)
        },
        "recommendations": {
            "preferred_music_style": max(music_by_style, key=music_by_style.get) if music_by_style else None,
            "most_engaging_activity": max(activity_by_type, key=activity_by_type.get) if activity_by_type else None
        }
    }

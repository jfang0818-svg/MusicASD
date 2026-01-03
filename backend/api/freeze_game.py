"""
Freeze Game API endpoints
Handles the Musical Freeze Dance game activity
"""
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activities/freeze-game", tags=["Freeze Game"])


@router.post("/start")
async def start_freeze_game(
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    music_style: str = Body(default="calm", embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start a new freeze game activity
    """
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify session ownership
    session = await session_manager.get_session(session_id)
    if not session:
        # Try loading from Azure if not in Redis
        session_data = await azure_storage.find_session_by_id(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_data

    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create freeze game activity
    game_id = f"freeze_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    game_data = {
        "game_id": game_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "freeze_game",
        "music_style": music_style,
        "started_at": datetime.now().isoformat(),
        "ended_at": None,
        "total_rounds": 0,
        "successful_freezes": 0,
        "rounds": [],
        "status": "active"
    }

    # Add activity to session
    await session_manager.add_log(session_id, user_id, {
        "event": "Freeze Game Started",
        "activity_type": "freeze_game",
        "game_id": game_id,
        "music_style": music_style
    })

    logger.info("Started freeze game %s for session %s", game_id, session_id)

    return {
        "status": "started",
        "game_id": game_id,
        "session_id": session_id,
        "music_style": music_style,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/round")
async def record_freeze_round(
    game_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    music_duration: float = Body(..., embed=True),
    child_froze: bool = Body(..., embed=True),
    reaction_time: Optional[float] = Body(default=None, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record a single round of the freeze game
    """
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify session ownership
    session = await session_manager.get_session(session_id)
    if not session:
        session_data = await azure_storage.find_session_by_id(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_data

    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create round record
    round_data = {
        "round_number": None,  # Will be set when game ends
        "timestamp": datetime.now().isoformat(),
        "music_duration": music_duration,
        "child_froze": child_froze,
        "reaction_time": reaction_time,
        "notes": notes
    }

    # Log the round
    await session_manager.add_log(session_id, user_id, {
        "event": f"Freeze Game Round - {'Success' if child_froze else 'Miss'}",
        "game_id": game_id,
        "activity_type": "freeze_game",
        "round_result": "success" if child_froze else "miss",
        "music_duration": music_duration,
        "notes": notes
    })

    logger.info("Recorded freeze game round for game %s: %s", game_id, child_froze)

    return {
        "status": "recorded",
        "game_id": game_id,
        "round_result": "success" if child_froze else "miss",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/end")
async def end_freeze_game(
    game_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    total_rounds: int = Body(..., embed=True),
    successful_freezes: int = Body(..., embed=True),
    total_duration: float = Body(..., embed=True),
    overall_engagement: str = Body(default="moderate", embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    End a freeze game activity and save results
    """
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify session ownership
    session = await session_manager.get_session(session_id)
    if not session:
        session_data = await azure_storage.find_session_by_id(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_data

    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Calculate success rate
    success_rate = (successful_freezes / total_rounds * 100) if total_rounds > 0 else 0

    # Create game summary
    game_summary = {
        "game_id": game_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "freeze_game",
        "ended_at": datetime.now().isoformat(),
        "total_rounds": total_rounds,
        "successful_freezes": successful_freezes,
        "success_rate": success_rate,
        "total_duration": total_duration,
        "overall_engagement": overall_engagement,
        "notes": notes,
        "status": "completed"
    }

    # Save game summary to Azure
    blob_path = f"activities/freeze_game/{child_id}/{session_id}/{game_id}.json"
    await azure_storage.save_json(blob_path, game_summary)

    # Add completion log
    await session_manager.add_log(session_id, user_id, {
        "event": "Freeze Game Completed",
        "game_id": game_id,
        "activity_type": "freeze_game",
        "total_rounds": total_rounds,
        "successful_freezes": successful_freezes,
        "success_rate": success_rate,
        "notes": notes
    })

    logger.info("Ended freeze game %s: %s/%s success", game_id, successful_freezes, total_rounds)

    return {
        "status": "completed",
        "game_id": game_id,
        "summary": game_summary
    }


@router.get("/child/{child_id}/history")
async def get_freeze_game_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get freeze game history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # List all freeze game activities
    prefix = f"activities/freeze_game/{child_id}/"
    blob_names = await azure_storage.list_blobs_in_path(prefix)

    games = []
    for blob_name in blob_names[:limit]:
        data = await azure_storage.load_json(blob_name)
        if data:
            games.append(data)

    # Sort by date descending
    games.sort(key=lambda x: x.get("ended_at", ""), reverse=True)

    return {
        "child_id": child_id,
        "games": games,
        "total": len(games)
    }

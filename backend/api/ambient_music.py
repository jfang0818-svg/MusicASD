"""
Ambient Generative Music API endpoints
Real-time soundscape generation for calming and regulation
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging
import uuid

from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ambient-music", tags=["Ambient Music"])

# Preset environments with parameters
ENVIRONMENTS = {
    "rainforest": {
        "name": "Rainforest",
        "description": "Gentle rain, birds, distant thunder",
        "layers": ["rain_soft", "birds_tropical", "thunder_distant", "wind_light"],
        "density": 0.6,
        "brightness": 0.5,
        "movement": 0.4,
        "base_frequency": 200
    },
    "ocean": {
        "name": "Ocean Waves",
        "description": "Waves, seagulls, gentle breeze",
        "layers": ["waves_gentle", "seagulls", "wind_ocean", "water_bubbles"],
        "density": 0.5,
        "brightness": 0.6,
        "movement": 0.7,
        "base_frequency": 150
    },
    "space": {
        "name": "Space Journey",
        "description": "Ethereal drones, cosmic sounds",
        "layers": ["drone_deep", "shimmer_high", "pulse_slow", "ambient_pad"],
        "density": 0.3,
        "brightness": 0.4,
        "movement": 0.2,
        "base_frequency": 100
    },
    "garden": {
        "name": "Quiet Garden",
        "description": "Wind, leaves, distant bells",
        "layers": ["wind_soft", "leaves_rustle", "bells_distant", "crickets"],
        "density": 0.4,
        "brightness": 0.7,
        "movement": 0.3,
        "base_frequency": 250
    },
    "fireplace": {
        "name": "Cozy Fireplace",
        "description": "Crackling fire, warmth, comfort",
        "layers": ["fire_crackle", "wood_pop", "ember_glow", "warmth_drone"],
        "density": 0.5,
        "brightness": 0.5,
        "movement": 0.5,
        "base_frequency": 180
    },
    "cave": {
        "name": "Crystal Cave",
        "description": "Dripping water, echoes, resonance",
        "layers": ["water_drip", "echo_cave", "crystal_tone", "deep_resonance"],
        "density": 0.3,
        "brightness": 0.3,
        "movement": 0.2,
        "base_frequency": 120
    }
}


@router.get("/environments")
async def get_environments():
    """Get all available ambient environments"""
    return {
        "environments": ENVIRONMENTS,
        "total": len(ENVIRONMENTS)
    }


@router.post("/start")
async def start_ambient_music(
    child_id: str = Body(..., embed=True),
    session_id: Optional[str] = Body(default=None, embed=True),
    environment: str = Body(default="ocean", embed=True),
    duration_minutes: int = Body(default=5, embed=True),
    custom_params: Optional[Dict[str, float]] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start ambient music generation
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Validate environment
    if environment not in ENVIRONMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid environment. Choose from: {list(ENVIRONMENTS.keys())}"
        )

    # Create ambient session
    ambient_id = f"ambient_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # Get environment config
    env_config = ENVIRONMENTS[environment].copy()

    # Apply custom parameters if provided
    if custom_params:
        env_config.update(custom_params)

    ambient_session = {
        "ambient_id": ambient_id,
        "child_id": child_id,
        "session_id": session_id,
        "environment": environment,
        "started_at": datetime.now().isoformat(),
        "duration_minutes": duration_minutes,
        "parameters": env_config,
        "status": "active"
    }

    # Save to Azure
    blob_path = f"ambient_sessions/{child_id}/{ambient_id}.json"
    await azure_storage.save_json(blob_path, ambient_session)

    logger.info(f"Started ambient music {ambient_id} for child {child_id}")

    return {
        "status": "started",
        "ambient_id": ambient_id,
        "environment": environment,
        "parameters": env_config,
        "duration_minutes": duration_minutes,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/update-parameters")
async def update_ambient_parameters(
    ambient_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    parameters: Dict[str, float] = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Update ambient music parameters in real-time
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Load ambient session
    blob_path = f"ambient_sessions/{child_id}/{ambient_id}.json"
    ambient_session = await azure_storage.load_json(blob_path)

    if not ambient_session:
        raise HTTPException(status_code=404, detail="Ambient session not found")

    # Update parameters
    ambient_session["parameters"].update(parameters)
    ambient_session["last_updated"] = datetime.now().isoformat()

    # Save back
    await azure_storage.save_json(blob_path, ambient_session)

    logger.info(f"Updated parameters for ambient {ambient_id}")

    return {
        "status": "updated",
        "ambient_id": ambient_id,
        "parameters": ambient_session["parameters"],
        "timestamp": datetime.now().isoformat()
    }


@router.post("/stop")
async def stop_ambient_music(
    ambient_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    regulation_effect: str = Body(default="calming", embed=True),
    effectiveness: int = Body(default=3, ge=1, le=5, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Stop ambient music and record effectiveness
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Load ambient session
    blob_path = f"ambient_sessions/{child_id}/{ambient_id}.json"
    ambient_session = await azure_storage.load_json(blob_path)

    if not ambient_session:
        raise HTTPException(status_code=404, detail="Ambient session not found")

    # Calculate duration
    started_at = datetime.fromisoformat(ambient_session["started_at"])
    ended_at = datetime.now()
    actual_duration = (ended_at - started_at).total_seconds() / 60  # minutes

    # Update session
    ambient_session["ended_at"] = ended_at.isoformat()
    ambient_session["actual_duration_minutes"] = actual_duration
    ambient_session["regulation_effect"] = regulation_effect
    ambient_session["effectiveness"] = effectiveness
    ambient_session["notes"] = notes
    ambient_session["status"] = "completed"

    # Save back
    await azure_storage.save_json(blob_path, ambient_session)

    logger.info(f"Stopped ambient music {ambient_id}")

    return {
        "status": "stopped",
        "ambient_id": ambient_id,
        "actual_duration_minutes": actual_duration,
        "regulation_effect": regulation_effect,
        "effectiveness": effectiveness,
        "timestamp": ended_at.isoformat()
    }


@router.get("/child/{child_id}/history")
async def get_ambient_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get ambient music history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # List all sessions
    prefix = f"ambient_sessions/{child_id}/"
    blob_names = await azure_storage.list_blobs(prefix)

    sessions = []
    for blob_name in blob_names[:limit]:
        data = await azure_storage.load_json(blob_name)
        if data:
            sessions.append(data)

    # Sort by date descending
    sessions.sort(key=lambda x: x.get("started_at", ""), reverse=True)

    # Calculate statistics
    completed = [s for s in sessions if s.get("status") == "completed"]
    avg_effectiveness = sum(s.get("effectiveness", 0) for s in completed) / len(completed) if completed else 0
    most_used = max(set(s.get("environment") for s in sessions), key=lambda x: sum(1 for s in sessions if s.get("environment") == x)) if sessions else None

    return {
        "child_id": child_id,
        "sessions": sessions,
        "total": len(sessions),
        "statistics": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "avg_effectiveness": round(avg_effectiveness, 1),
            "most_used_environment": most_used
        }
    }


@router.post("/save-preset")
async def save_custom_preset(
    child_id: str = Body(..., embed=True),
    preset_name: str = Body(..., embed=True),
    environment_base: str = Body(..., embed=True),
    custom_parameters: Dict[str, float] = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Save custom ambient preset for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Initialize custom presets if not exists
    if "custom_ambient_presets" not in profile:
        profile["custom_ambient_presets"] = []

    # Create preset
    preset = {
        "id": f"preset_{uuid.uuid4().hex[:8]}",
        "name": preset_name,
        "environment_base": environment_base,
        "parameters": custom_parameters,
        "created_at": datetime.now().isoformat()
    }

    profile["custom_ambient_presets"].append(preset)
    profile["updated_at"] = datetime.now().isoformat()

    # Save profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save preset")

    logger.info(f"Saved custom ambient preset for child {child_id}")

    return {
        "status": "saved",
        "preset": preset
    }

"""
Emotion-Matching Music API endpoints
Adaptive music based on emotional state using iso-principle
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging
import uuid

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emotion-music", tags=["Emotion-Matching Music"])

# Emotion profiles with musical characteristics
EMOTION_PROFILES = {
    "very_anxious": {
        "emotion": "very_anxious",
        "label": "Very Anxious",
        "intensity": 5,
        "musical_characteristics": {
            "tempo": 110,  # Slightly elevated
            "key": "minor",
            "dynamics": "moderate",
            "texture": "simple",
            "predictability": "high"
        },
        "iso_principle_target": "anxious",  # Start here, move toward calm
        "recommended_duration": 3
    },
    "anxious": {
        "emotion": "anxious",
        "label": "Anxious",
        "intensity": 4,
        "musical_characteristics": {
            "tempo": 95,
            "key": "minor",
            "dynamics": "soft",
            "texture": "simple",
            "predictability": "high"
        },
        "iso_principle_target": "neutral",
        "recommended_duration": 4
    },
    "upset": {
        "emotion": "upset",
        "label": "Upset/Frustrated",
        "intensity": 4,
        "musical_characteristics": {
            "tempo": 100,
            "key": "minor",
            "dynamics": "moderate",
            "texture": "structured",
            "predictability": "high"
        },
        "iso_principle_target": "neutral",
        "recommended_duration": 4
    },
    "sad": {
        "emotion": "sad",
        "label": "Sad",
        "intensity": 3,
        "musical_characteristics": {
            "tempo": 70,
            "key": "minor",
            "dynamics": "soft",
            "texture": "gentle",
            "predictability": "medium"
        },
        "iso_principle_target": "calm",
        "recommended_duration": 5
    },
    "neutral": {
        "emotion": "neutral",
        "label": "Neutral/Calm",
        "intensity": 2,
        "musical_characteristics": {
            "tempo": 80,
            "key": "major",
            "dynamics": "moderate",
            "texture": "balanced",
            "predictability": "medium"
        },
        "iso_principle_target": "content",
        "recommended_duration": 3
    },
    "calm": {
        "emotion": "calm",
        "label": "Calm",
        "intensity": 2,
        "musical_characteristics": {
            "tempo": 72,
            "key": "major",
            "dynamics": "soft",
            "texture": "flowing",
            "predictability": "medium"
        },
        "iso_principle_target": "content",
        "recommended_duration": 4
    },
    "content": {
        "emotion": "content",
        "label": "Content/Happy",
        "intensity": 1,
        "musical_characteristics": {
            "tempo": 90,
            "key": "major",
            "dynamics": "moderate",
            "texture": "rich",
            "predictability": "low"
        },
        "iso_principle_target": "content",  # Maintain
        "recommended_duration": 3
    },
    "very_happy": {
        "emotion": "very_happy",
        "label": "Very Happy/Excited",
        "intensity": 5,
        "musical_characteristics": {
            "tempo": 130,
            "key": "major",
            "dynamics": "energetic",
            "texture": "complex",
            "predictability": "low"
        },
        "iso_principle_target": "content",  # May want to regulate down slightly
        "recommended_duration": 3
    },
    "overstimulated": {
        "emotion": "overstimulated",
        "label": "Overstimulated",
        "intensity": 5,
        "musical_characteristics": {
            "tempo": 85,
            "key": "major",
            "dynamics": "very_soft",
            "texture": "minimal",
            "predictability": "very_high"
        },
        "iso_principle_target": "calm",
        "recommended_duration": 6
    }
}

# Iso-principle transition paths
ISO_TRANSITIONS = {
    "very_anxious": ["anxious", "neutral", "calm"],
    "anxious": ["neutral", "calm", "content"],
    "upset": ["neutral", "calm", "content"],
    "sad": ["neutral", "calm", "content"],
    "neutral": ["calm", "content"],
    "calm": ["content"],
    "content": ["content"],  # Maintain
    "very_happy": ["content", "calm"],  # May need gentle regulation
    "overstimulated": ["calm", "neutral", "content"]
}


@router.get("/emotions")
async def get_emotion_profiles():
    """Get all available emotion profiles"""
    return {
        "emotions": EMOTION_PROFILES,
        "total": len(EMOTION_PROFILES),
        "categories": {
            "regulation_needed": ["very_anxious", "anxious", "upset", "overstimulated"],
            "stable": ["neutral", "calm", "content"],
            "may_need_calming": ["very_happy"]
        }
    }


@router.post("/detect-emotion")
async def detect_emotion_manual(
    child_id: str = Body(..., embed=True),
    observed_emotion: str = Body(..., embed=True),
    intensity: int = Body(default=3, ge=1, le=5, embed=True),
    behavioral_indicators: Optional[List[str]] = Body(default=None, embed=True),
    context: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Manually record observed emotion

    For future: This endpoint could be extended to accept facial analysis data
    from computer vision, but for now it's manual therapist observation
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Validate emotion
    if observed_emotion not in EMOTION_PROFILES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid emotion. Choose from: {list(EMOTION_PROFILES.keys())}"
        )

    # Create emotion detection record
    detection_id = f"emotion_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    emotion_record = {
        "detection_id": detection_id,
        "child_id": child_id,
        "detected_at": datetime.now().isoformat(),
        "emotion": observed_emotion,
        "intensity": intensity,
        "behavioral_indicators": behavioral_indicators or [],
        "context": context,
        "detection_method": "manual_observation"  # Future: "facial_analysis", "combined"
    }

    # Save detection
    blob_path = f"emotion_detections/{child_id}/{detection_id}.json"
    await azure_storage.save_json(blob_path, emotion_record)

    # Get emotion profile
    emotion_profile = EMOTION_PROFILES[observed_emotion]

    # Get recommended music transition path
    transition_path = ISO_TRANSITIONS.get(observed_emotion, [])

    logger.info(f"Detected emotion {observed_emotion} for child {child_id}")

    return {
        "detection_id": detection_id,
        "emotion": observed_emotion,
        "emotion_profile": emotion_profile,
        "iso_principle_path": transition_path,
        "recommended_action": _get_recommended_action(observed_emotion),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/start-session")
async def start_emotion_music_session(
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    initial_emotion: str = Body(..., embed=True),
    target_emotion: str = Body(default="content", embed=True),
    session_goal: str = Body(default="regulation", embed=True),  # regulation, maintenance, exploration
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start an emotion-matched music session using iso-principle
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

    # Validate emotions
    if initial_emotion not in EMOTION_PROFILES:
        raise HTTPException(status_code=400, detail="Invalid initial emotion")
    if target_emotion not in EMOTION_PROFILES:
        raise HTTPException(status_code=400, detail="Invalid target emotion")

    # Create emotion music session
    emotion_session_id = f"emotion_music_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # Calculate transition plan
    transition_plan = _calculate_transition_plan(initial_emotion, target_emotion)

    emotion_music_session = {
        "emotion_session_id": emotion_session_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "emotion_music",
        "started_at": datetime.now().isoformat(),
        "initial_emotion": initial_emotion,
        "target_emotion": target_emotion,
        "current_emotion": initial_emotion,
        "session_goal": session_goal,
        "transition_plan": transition_plan,
        "current_phase": 0,
        "emotion_checks": [],
        "music_played": [],
        "status": "active"
    }

    # Save session
    blob_path = f"activities/emotion_music/{child_id}/{session_id}/{emotion_session_id}.json"
    await azure_storage.save_json(blob_path, emotion_music_session)

    # Log start
    await session_manager.add_log(session_id, user_id, {
        "event": "Emotion-Matching Music Started",
        "activity_type": "emotion_music",
        "emotion_session_id": emotion_session_id,
        "initial_emotion": initial_emotion,
        "target_emotion": target_emotion
    })

    # Get first phase music characteristics
    first_phase = transition_plan[0]

    logger.info(f"Started emotion music session {emotion_session_id} for child {child_id}")

    return {
        "status": "started",
        "emotion_session_id": emotion_session_id,
        "initial_emotion": initial_emotion,
        "target_emotion": target_emotion,
        "transition_plan": transition_plan,
        "current_phase": first_phase,
        "recommended_music": _get_music_recommendations(first_phase["characteristics"]),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/emotion-check")
async def record_emotion_check(
    emotion_session_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    current_emotion: str = Body(..., embed=True),
    intensity: int = Body(default=3, ge=1, le=5, embed=True),
    behavioral_changes: Optional[List[str]] = Body(default=None, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record an emotion check during the session to track progress
    """
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify session
    session = await session_manager.get_session(session_id)
    if not session:
        session_data = await azure_storage.find_session_by_id(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_data

    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Load emotion music session
    blob_path = f"activities/emotion_music/{child_id}/{session_id}/{emotion_session_id}.json"
    emotion_session = await azure_storage.load_json(blob_path)

    if not emotion_session:
        raise HTTPException(status_code=404, detail="Emotion music session not found")

    # Record emotion check
    emotion_check = {
        "timestamp": datetime.now().isoformat(),
        "emotion": current_emotion,
        "intensity": intensity,
        "behavioral_changes": behavioral_changes or [],
        "notes": notes,
        "phase": emotion_session["current_phase"]
    }

    emotion_session["emotion_checks"].append(emotion_check)
    emotion_session["current_emotion"] = current_emotion

    # Check if we should advance to next phase
    should_advance = _should_advance_phase(emotion_session, current_emotion)

    if should_advance and emotion_session["current_phase"] < len(emotion_session["transition_plan"]) - 1:
        emotion_session["current_phase"] += 1
        next_phase = emotion_session["transition_plan"][emotion_session["current_phase"]]
        response_message = "Advancing to next phase"
        recommended_music = _get_music_recommendations(next_phase["characteristics"])
    else:
        current_phase = emotion_session["transition_plan"][emotion_session["current_phase"]]
        response_message = "Continuing current phase"
        recommended_music = _get_music_recommendations(current_phase["characteristics"])

    # Save back
    await azure_storage.save_json(blob_path, emotion_session)

    # Log emotion check
    await session_manager.add_log(session_id, user_id, {
        "event": "Emotion Check",
        "emotion_session_id": emotion_session_id,
        "activity_type": "emotion_music",
        "current_emotion": current_emotion,
        "intensity": intensity,
        "phase": emotion_session["current_phase"]
    })

    logger.info(f"Emotion check for {emotion_session_id}: {current_emotion} (intensity: {intensity})")

    return {
        "status": "recorded",
        "emotion_session_id": emotion_session_id,
        "current_emotion": current_emotion,
        "current_phase": emotion_session["current_phase"],
        "total_phases": len(emotion_session["transition_plan"]),
        "message": response_message,
        "recommended_music": recommended_music,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/end-session")
async def end_emotion_music_session(
    emotion_session_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    final_emotion: str = Body(..., embed=True),
    goal_achieved: bool = Body(..., embed=True),
    effectiveness: int = Body(default=3, ge=1, le=5, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    End emotion-matching music session and save summary
    """
    user_id = auth_service.get_current_user_id(credentials)
    session_manager = get_session_manager()

    # Verify session
    session = await session_manager.get_session(session_id)
    if not session:
        session_data = await azure_storage.find_session_by_id(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_data

    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Load emotion music session
    blob_path = f"activities/emotion_music/{child_id}/{session_id}/{emotion_session_id}.json"
    emotion_session = await azure_storage.load_json(blob_path)

    if not emotion_session:
        raise HTTPException(status_code=404, detail="Emotion music session not found")

    # Calculate duration
    started_at = datetime.fromisoformat(emotion_session["started_at"])
    ended_at = datetime.now()
    duration = (ended_at - started_at).total_seconds() / 60  # minutes

    # Calculate emotion progression
    emotion_progression = [emotion_session["initial_emotion"]]
    for check in emotion_session["emotion_checks"]:
        emotion_progression.append(check["emotion"])
    emotion_progression.append(final_emotion)

    # Update session
    emotion_session["ended_at"] = ended_at.isoformat()
    emotion_session["duration_minutes"] = duration
    emotion_session["final_emotion"] = final_emotion
    emotion_session["goal_achieved"] = goal_achieved
    emotion_session["effectiveness"] = effectiveness
    emotion_session["notes"] = notes
    emotion_session["status"] = "completed"
    emotion_session["summary"] = {
        "initial_emotion": emotion_session["initial_emotion"],
        "final_emotion": final_emotion,
        "target_emotion": emotion_session["target_emotion"],
        "emotion_progression": emotion_progression,
        "total_emotion_checks": len(emotion_session["emotion_checks"]),
        "phases_completed": emotion_session["current_phase"] + 1,
        "total_phases": len(emotion_session["transition_plan"]),
        "goal_achieved": goal_achieved,
        "effectiveness": effectiveness
    }

    # Save back
    await azure_storage.save_json(blob_path, emotion_session)

    # Log completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Emotion-Matching Music Completed",
        "emotion_session_id": emotion_session_id,
        "activity_type": "emotion_music",
        "initial_emotion": emotion_session["initial_emotion"],
        "final_emotion": final_emotion,
        "goal_achieved": goal_achieved,
        "effectiveness": effectiveness,
        "notes": notes
    })

    logger.info(f"Ended emotion music session {emotion_session_id}: {emotion_session['initial_emotion']} → {final_emotion}")

    return {
        "status": "completed",
        "emotion_session_id": emotion_session_id,
        "summary": emotion_session["summary"],
        "duration_minutes": duration,
        "timestamp": ended_at.isoformat()
    }


@router.get("/child/{child_id}/history")
async def get_emotion_music_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get emotion-matching music history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # List all sessions
    prefix = f"activities/emotion_music/{child_id}/"
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
    successful = [s for s in completed if s.get("goal_achieved")]
    avg_effectiveness = sum(s.get("effectiveness", 0) for s in completed) / len(completed) if completed else 0

    # Most common starting emotions
    from collections import Counter
    initial_emotions = [s.get("initial_emotion") for s in sessions]
    emotion_counts = Counter(initial_emotions)
    most_common_initial = emotion_counts.most_common(1)[0] if emotion_counts else None

    return {
        "child_id": child_id,
        "sessions": sessions,
        "total": len(sessions),
        "statistics": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "successful_sessions": len(successful),
            "success_rate": round(len(successful) / len(completed) * 100, 1) if completed else 0,
            "avg_effectiveness": round(avg_effectiveness, 2),
            "most_common_initial_emotion": most_common_initial[0] if most_common_initial else None
        }
    }


# Helper functions

def _get_recommended_action(emotion: str) -> str:
    """Get recommended action based on detected emotion"""
    actions = {
        "very_anxious": "Start with familiar, predictable music. Use iso-principle to gradually calm.",
        "anxious": "Use calming, structured music. Gradually slow tempo.",
        "upset": "Match current energy, then gradually regulate down.",
        "sad": "Gentle, supportive music. Slowly uplift mood.",
        "neutral": "Maintain with balanced, pleasant music.",
        "calm": "Sustain calmness with gentle, flowing music.",
        "content": "Maintain positive state with enjoyable music.",
        "very_happy": "May need gentle regulation to avoid overstimulation.",
        "overstimulated": "Minimal, very predictable music. Focus on calming."
    }
    return actions.get(emotion, "Observe and respond to child's cues")


def _calculate_transition_plan(initial: str, target: str) -> List[Dict[str, Any]]:
    """Calculate iso-principle transition phases"""
    phases = []

    # Get transition path
    path = ISO_TRANSITIONS.get(initial, [initial, target])

    # If target not in path, add it
    if target not in path:
        path.append(target)

    # Create phases
    for i, emotion in enumerate([initial] + path[:3]):  # Max 4 phases including initial
        if emotion == target:
            break
        phase = {
            "phase_number": i,
            "emotion": emotion,
            "characteristics": EMOTION_PROFILES[emotion]["musical_characteristics"],
            "duration_minutes": EMOTION_PROFILES[emotion]["recommended_duration"]
        }
        phases.append(phase)

    # Ensure target is final phase
    if phases[-1]["emotion"] != target:
        phases.append({
            "phase_number": len(phases),
            "emotion": target,
            "characteristics": EMOTION_PROFILES[target]["musical_characteristics"],
            "duration_minutes": EMOTION_PROFILES[target]["recommended_duration"]
        })

    return phases


def _should_advance_phase(emotion_session: Dict, current_emotion: str) -> bool:
    """Determine if session should advance to next phase"""
    # Simple logic: advance if current emotion matches next phase emotion
    current_phase_num = emotion_session["current_phase"]
    if current_phase_num >= len(emotion_session["transition_plan"]) - 1:
        return False  # Already at last phase

    next_phase = emotion_session["transition_plan"][current_phase_num + 1]
    return current_emotion == next_phase["emotion"]


def _get_music_recommendations(characteristics: Dict[str, Any]) -> List[str]:
    """Get music file recommendations based on characteristics"""
    # Mock implementation - in production, this would query music database
    # based on tempo, key, dynamics, etc.
    tempo = characteristics.get("tempo", 80)
    key = characteristics.get("key", "major")

    recommendations = []

    if tempo < 75:
        recommendations.append("calm_slow_piano.mp3")
        recommendations.append("gentle_strings_slow.mp3")
    elif tempo < 95:
        recommendations.append("peaceful_ambient.mp3")
        recommendations.append("soft_melody.mp3")
    elif tempo < 110:
        recommendations.append("moderate_rhythm.mp3")
        recommendations.append("balanced_music.mp3")
    else:
        recommendations.append("energetic_upbeat.mp3")
        recommendations.append("lively_tempo.mp3")

    if key == "minor":
        recommendations.append("minor_key_piece.mp3")
    else:
        recommendations.append("major_key_piece.mp3")

    return recommendations[:3]  # Return top 3

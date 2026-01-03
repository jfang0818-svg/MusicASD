"""
Movement Activities API endpoints
Guided movement sequences, dance prompts, and sensory regulation activities
"""
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activities/movement", tags=["Movement Activities"])

# Movement activity library
MOVEMENT_ACTIVITIES = {
    "animal_walks": {
        "id": "animal_walks",
        "name": "Animal Walks",
        "description": "Imitate different animal movements with music and sounds",
        "duration_minutes": 5,
        "therapeutic_goals": ["gross_motor", "imitation", "body_awareness", "playfulness"],
        "energy_level": "high",
        "movements": [
            {
                "id": "bear_walk",
                "name": "Bear Walk",
                "description": "Walk on hands and feet like a bear",
                "music_cue": "heavy_stomping_rhythm",
                "sound_effect": "bear_growl",
                "duration_seconds": 30,
                "instructions": "Put hands and feet on floor, walk slowly and heavily like a big bear!"
            },
            {
                "id": "bunny_hop",
                "name": "Bunny Hop",
                "description": "Hop with feet together like a bunny",
                "music_cue": "light_bouncing_music",
                "sound_effect": "bunny_hop",
                "duration_seconds": 30,
                "instructions": "Jump with both feet together, hop hop hop like a bunny!"
            },
            {
                "id": "crab_walk",
                "name": "Crab Walk",
                "description": "Walk sideways on hands and feet",
                "music_cue": "sideways_shuffle_beat",
                "sound_effect": "crab_clicking",
                "duration_seconds": 30,
                "instructions": "Sit down, lift bottom up, walk sideways like a crab!"
            },
            {
                "id": "bird_fly",
                "name": "Bird Flight",
                "description": "Flap arms and move around like a bird",
                "music_cue": "soaring_melody",
                "sound_effect": "bird_chirp",
                "duration_seconds": 30,
                "instructions": "Flap your wings and fly around the room like a bird!"
            },
            {
                "id": "snake_slither",
                "name": "Snake Slither",
                "description": "Lie on floor and wiggle forward",
                "music_cue": "slithering_rhythm",
                "sound_effect": "snake_hiss",
                "duration_seconds": 30,
                "instructions": "Lie on your tummy and slither forward like a snake!"
            },
            {
                "id": "frog_jump",
                "name": "Frog Jump",
                "description": "Squat down and jump forward",
                "music_cue": "bouncy_jump_music",
                "sound_effect": "frog_ribbit",
                "duration_seconds": 30,
                "instructions": "Squat down low, then jump forward like a frog! Ribbit!"
            }
        ]
    },
    "dance_prompts": {
        "id": "dance_prompts",
        "name": "Follow the Beat Dance",
        "description": "Dance movements following musical cues and prompts",
        "duration_minutes": 6,
        "therapeutic_goals": [
            "motor_planning", "following_instructions",
            "rhythmic_entrainment", "social_interaction"
        ],
        "energy_level": "medium_high",
        "movements": [
            {
                "id": "clap_hands",
                "name": "Clap Your Hands",
                "description": "Clap hands to the beat",
                "music_cue": "steady_clapping_beat",
                "duration_seconds": 30,
                "instructions": "Clap clap clap to the music!"
            },
            {
                "id": "stomp_feet",
                "name": "Stomp Your Feet",
                "description": "Stomp feet alternating",
                "music_cue": "heavy_beat_music",
                "duration_seconds": 30,
                "instructions": "Stomp your feet, left, right, left, right!"
            },
            {
                "id": "spin_around",
                "name": "Spin Around",
                "description": "Turn in circles",
                "music_cue": "spinning_waltz",
                "duration_seconds": 20,
                "instructions": "Spin around in a circle, nice and slow!"
            },
            {
                "id": "jump_up_down",
                "name": "Jump Up and Down",
                "description": "Jump with both feet",
                "music_cue": "bouncing_rhythm",
                "duration_seconds": 30,
                "instructions": "Jump! Jump! Jump! Up and down!"
            },
            {
                "id": "wave_arms",
                "name": "Wave Your Arms",
                "description": "Wave arms side to side",
                "music_cue": "flowing_wave_music",
                "duration_seconds": 30,
                "instructions": "Wave your arms like ocean waves!"
            },
            {
                "id": "march_place",
                "name": "March in Place",
                "description": "March lifting knees high",
                "music_cue": "marching_band_beat",
                "duration_seconds": 40,
                "instructions": "March march march! Lift those knees high!"
            },
            {
                "id": "shake_body",
                "name": "Shake Your Body",
                "description": "Shake whole body",
                "music_cue": "shaking_jingle_music",
                "duration_seconds": 30,
                "instructions": "Shake shake shake your whole body!"
            },
            {
                "id": "freeze_dance",
                "name": "Freeze!",
                "description": "Freeze when music stops",
                "music_cue": "sudden_stop",
                "duration_seconds": 10,
                "instructions": "FREEZE! Don't move!"
            }
        ]
    },
    "yoga_kids": {
        "id": "yoga_kids",
        "name": "Calming Kids Yoga",
        "description": "Simple yoga poses with breathing and relaxation",
        "duration_minutes": 8,
        "therapeutic_goals": ["body_awareness", "balance", "calming", "focus", "flexibility"],
        "energy_level": "low",
        "movements": [
            {
                "id": "mountain_pose",
                "name": "Mountain Pose",
                "description": "Stand tall and strong",
                "music_cue": "grounding_tone",
                "duration_seconds": 40,
                "instructions": "Stand tall like a mountain. Feel strong and steady. Breathe in... breathe out..."
            },
            {
                "id": "tree_pose",
                "name": "Tree Pose",
                "description": "Balance on one foot",
                "music_cue": "balancing_melody",
                "duration_seconds": 40,
                "instructions": "Stand on one foot. Put other foot on your leg. Reach up high like tree branches!"
            },
            {
                "id": "cat_cow",
                "name": "Cat-Cow Stretch",
                "description": "On hands and knees, arch and round back",
                "music_cue": "flowing_stretch_music",
                "duration_seconds": 50,
                "instructions": "On hands and knees. Arch back like a cat stretching. Then dip down like a cow."
            },
            {
                "id": "downward_dog",
                "name": "Downward Dog",
                "description": "Make triangle shape with body",
                "music_cue": "stretching_tone",
                "duration_seconds": 40,
                "instructions": "Hands and feet on floor, bottom up high. Make a triangle shape!"
            },
            {
                "id": "child_pose",
                "name": "Child's Pose",
                "description": "Rest position on knees",
                "music_cue": "resting_ambient",
                "duration_seconds": 60,
                "instructions": "Sit on your knees, put head down, arms forward. Rest and breathe."
            },
            {
                "id": "butterfly",
                "name": "Butterfly Pose",
                "description": "Sit with feet together",
                "music_cue": "gentle_fluttering",
                "duration_seconds": 40,
                "instructions": "Sit down, put feet together. Gently flap your knees like butterfly wings!"
            },
            {
                "id": "snake_stretch",
                "name": "Cobra Pose",
                "description": "Lie on belly and lift chest",
                "music_cue": "rising_melody",
                "duration_seconds": 40,
                "instructions": "Lie on tummy, push up with hands, lift your chest like a snake!"
            },
            {
                "id": "savasana",
                "name": "Resting Pose",
                "description": "Lie flat and relax",
                "music_cue": "deep_relaxation",
                "duration_seconds": 90,
                "instructions": "Lie on your back. Close your eyes. Relax every part of your body. Breathe slowly."
            }
        ]
    },
    "sensory_regulation": {
        "id": "sensory_regulation",
        "name": "Sensory Regulation Routine",
        "description": "Activities to help with sensory regulation and calming",
        "duration_minutes": 7,
        "therapeutic_goals": ["sensory_regulation", "self_calming", "body_awareness", "emotional_regulation"],
        "energy_level": "variable",
        "movements": [
            {
                "id": "heavy_work",
                "name": "Heavy Work",
                "description": "Push against wall",
                "music_cue": "strong_grounding_beat",
                "duration_seconds": 40,
                "instructions": "Push hard against the wall with your hands. Feel strong and grounded!"
            },
            {
                "id": "body_squeeze",
                "name": "Body Squeezes",
                "description": "Give yourself tight hugs",
                "music_cue": "comforting_melody",
                "duration_seconds": 40,
                "instructions": "Wrap your arms around yourself. Give yourself a big, tight squeeze!"
            },
            {
                "id": "joint_compressions",
                "name": "Gentle Bouncing",
                "description": "Bounce gently on feet",
                "music_cue": "soft_bouncing_rhythm",
                "duration_seconds": 40,
                "instructions": "Bend knees and bounce gently up and down. Nice and easy."
            },
            {
                "id": "deep_breathing",
                "name": "Deep Breathing",
                "description": "Slow breathing exercises",
                "music_cue": "breathing_guidance",
                "duration_seconds": 60,
                "instructions": "Breathe in slowly... count to 4... breathe out slowly... count to 4..."
            },
            {
                "id": "progressive_tense",
                "name": "Tense and Release",
                "description": "Tense then relax muscles",
                "music_cue": "tension_release_music",
                "duration_seconds": 60,
                "instructions": "Squeeze all muscles tight... hold... now let go and relax everything!"
            },
            {
                "id": "rocking",
                "name": "Gentle Rocking",
                "description": "Rock back and forth slowly",
                "music_cue": "lullaby_rock",
                "duration_seconds": 60,
                "instructions": "Rock gently side to side or front to back. Nice calm rhythm."
            },
            {
                "id": "grounding",
                "name": "Grounding Exercise",
                "description": "Feel connection to ground",
                "music_cue": "grounding_ambient",
                "duration_seconds": 60,
                "instructions": "Feel your feet on the floor. Press down. You are safe and grounded."
            },
            {
                "id": "calm_visualization",
                "name": "Calm Place",
                "description": "Visualize peaceful place",
                "music_cue": "peaceful_visualization",
                "duration_seconds": 80,
                "instructions": "Close your eyes. Imagine your favorite calm, safe place. Breathe slowly."
            }
        ]
    },
    "rhythm_games": {
        "id": "rhythm_games",
        "name": "Rhythm and Beat Games",
        "description": "Interactive rhythm activities for timing and coordination",
        "duration_minutes": 5,
        "therapeutic_goals": ["rhythmic_entrainment", "motor_timing", "coordination", "listening"],
        "energy_level": "medium",
        "movements": [
            {
                "id": "echo_clapping",
                "name": "Echo Clapping",
                "description": "Repeat clapping patterns",
                "music_cue": "pattern_demonstration",
                "duration_seconds": 60,
                "instructions": "Listen to the clapping pattern, then copy it!"
            },
            {
                "id": "drum_along",
                "name": "Drum Along",
                "description": "Hit drum or surface to beat",
                "music_cue": "steady_drum_beat",
                "duration_seconds": 50,
                "instructions": "Tap tap tap along with the drum beat!"
            },
            {
                "id": "fast_slow",
                "name": "Fast and Slow",
                "description": "Move to changing tempos",
                "music_cue": "tempo_changes",
                "duration_seconds": 60,
                "instructions": "Move fast when music is fast, slow when music is slow!"
            },
            {
                "id": "loud_quiet",
                "name": "Loud and Quiet",
                "description": "Respond to volume changes",
                "music_cue": "dynamic_changes",
                "duration_seconds": 50,
                "instructions": "Big movements for loud music, tiny movements for quiet music!"
            },
            {
                "id": "rhythm_walk",
                "name": "Rhythm Walking",
                "description": "Walk to steady beat",
                "music_cue": "walking_beat",
                "duration_seconds": 50,
                "instructions": "Walk around the room, one step for each beat!"
            },
            {
                "id": "freeze_game",
                "name": "Musical Freeze",
                "description": "Dance and freeze when music stops",
                "music_cue": "stop_start_music",
                "duration_seconds": 50,
                "instructions": "Dance when music plays, freeze when it stops!"
            }
        ]
    }
}


@router.get("/activities")
async def get_movement_activities():
    """Get all available movement activities"""
    return {
        "activities": MOVEMENT_ACTIVITIES,
        "total": len(MOVEMENT_ACTIVITIES),
        "categories": {
            "high_energy": ["animal_walks", "dance_prompts", "rhythm_games"],
            "calming": ["yoga_kids", "sensory_regulation"],
            "regulation": ["sensory_regulation", "yoga_kids"]
        }
    }


@router.get("/activities/{activity_id}")
async def get_activity_details(activity_id: str):
    """Get detailed information about a specific activity"""
    if activity_id not in MOVEMENT_ACTIVITIES:
        raise HTTPException(status_code=404, detail="Activity not found")

    return {
        "activity": MOVEMENT_ACTIVITIES[activity_id],
        "total_movements": len(MOVEMENT_ACTIVITIES[activity_id]["movements"]),
        "estimated_duration": MOVEMENT_ACTIVITIES[activity_id]["duration_minutes"]
    }


@router.post("/start")
async def start_movement_activity(
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    activity_id: str = Body(..., embed=True),
    modifications: Optional[List[str]] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start a movement activity session
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

    # Validate activity
    if activity_id not in MOVEMENT_ACTIVITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid activity. Choose from: {list(MOVEMENT_ACTIVITIES.keys())}"
        )

    # Create movement session
    movement_id = f"movement_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    activity_data = MOVEMENT_ACTIVITIES[activity_id].copy()

    movement_session = {
        "movement_id": movement_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "movement",
        "activity_id": activity_id,
        "activity_name": activity_data["name"],
        "started_at": datetime.now().isoformat(),
        "modifications": modifications or [],
        "current_movement": 0,
        "completed_movements": [],
        "status": "active"
    }

    # Save initial state
    blob_path = f"activities/movement/{child_id}/{session_id}/{movement_id}.json"
    await azure_storage.save_json(blob_path, movement_session)

    # Log start
    await session_manager.add_log(session_id, user_id, {
        "event": "Movement Activity Started",
        "activity_type": "movement",
        "movement_id": movement_id,
        "activity_id": activity_id,
        "activity_name": activity_data["name"]
    })

    logger.info("Started movement activity %s for session %s", movement_id, session_id)

    return {
        "status": "started",
        "movement_id": movement_id,
        "activity": activity_data,
        "total_movements": len(activity_data["movements"]),
        "first_movement": activity_data["movements"][0],
        "timestamp": datetime.now().isoformat()
    }


@router.post("/movement-complete")
async def complete_movement(
    movement_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    movement_index: int = Body(..., embed=True),
    participation: str = Body(default="full", embed=True),  # full, partial, minimal, refused
    quality: str = Body(default="good", embed=True),  # excellent, good, fair, needs_support
    modifications_needed: Optional[List[str]] = Body(default=None, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record completion of a movement
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

    # Load movement session
    blob_path = f"activities/movement/{child_id}/{session_id}/{movement_id}.json"
    movement_session = await azure_storage.load_json(blob_path)

    if not movement_session:
        raise HTTPException(status_code=404, detail="Movement session not found")

    # Record movement completion
    movement_completion = {
        "movement_index": movement_index,
        "completed_at": datetime.now().isoformat(),
        "participation": participation,
        "quality": quality,
        "modifications_needed": modifications_needed or [],
        "notes": notes
    }

    movement_session["completed_movements"].append(movement_completion)
    movement_session["current_movement"] = movement_index + 1

    # Save back
    await azure_storage.save_json(blob_path, movement_session)

    # Log movement completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Movement Completed",
        "movement_id": movement_id,
        "activity_type": "movement",
        "movement_index": movement_index,
        "participation": participation,
        "quality": quality
    })

    # Get activity data
    activity_id = movement_session["activity_id"]
    activity_data = MOVEMENT_ACTIVITIES[activity_id]

    # Check if activity is complete
    is_complete = movement_session["current_movement"] >= len(activity_data["movements"])
    next_movement = None if is_complete else activity_data["movements"][movement_session["current_movement"]]

    logger.info("Completed movement %s for activity %s", movement_index, movement_id)

    return {
        "status": "movement_completed",
        "movement_id": movement_id,
        "current_movement": movement_session["current_movement"],
        "total_movements": len(activity_data["movements"]),
        "is_complete": is_complete,
        "next_movement": next_movement,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/end")
async def end_movement_activity(
    movement_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    overall_engagement: str = Body(default="moderate", embed=True),
    overall_quality: str = Body(default="good", embed=True),
    child_mood_after: Optional[str] = Body(default=None, embed=True),
    therapeutic_notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    End movement activity and save summary
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

    # Load movement session
    blob_path = f"activities/movement/{child_id}/{session_id}/{movement_id}.json"
    movement_session = await azure_storage.load_json(blob_path)

    if not movement_session:
        raise HTTPException(status_code=404, detail="Movement session not found")

    # Calculate duration
    started_at = datetime.fromisoformat(movement_session["started_at"])
    ended_at = datetime.now()
    duration = (ended_at - started_at).total_seconds() / 60  # minutes

    # Calculate participation statistics
    participation_levels = [m["participation"] for m in movement_session["completed_movements"]]
    full_participation = participation_levels.count("full")
    partial_participation = participation_levels.count("partial")

    # Update session
    movement_session["ended_at"] = ended_at.isoformat()
    movement_session["duration_minutes"] = duration
    movement_session["overall_engagement"] = overall_engagement
    movement_session["overall_quality"] = overall_quality
    movement_session["child_mood_after"] = child_mood_after
    movement_session["therapeutic_notes"] = therapeutic_notes
    movement_session["status"] = "completed"
    movement_session["statistics"] = {
        "total_movements": len(movement_session["completed_movements"]),
        "full_participation": full_participation,
        "partial_participation": partial_participation,
        "completion_rate": (
            len(movement_session["completed_movements"])
            / len(MOVEMENT_ACTIVITIES[movement_session["activity_id"]]["movements"])
            * 100
        )
    }

    # Save back
    await azure_storage.save_json(blob_path, movement_session)

    # Log completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Movement Activity Completed",
        "movement_id": movement_id,
        "activity_type": "movement",
        "activity_id": movement_session["activity_id"],
        "movements_completed": len(movement_session["completed_movements"]),
        "overall_engagement": overall_engagement,
        "notes": therapeutic_notes
    })

    logger.info(
        "Ended movement activity %s: %s movements",
        movement_id,
        len(movement_session['completed_movements'])
    )

    return {
        "status": "completed",
        "movement_id": movement_id,
        "summary": {
            "activity_name": movement_session["activity_name"],
            "duration_minutes": duration,
            "movements_completed": len(movement_session["completed_movements"]),
            "statistics": movement_session["statistics"],
            "overall_engagement": overall_engagement,
            "overall_quality": overall_quality,
            "child_mood_after": child_mood_after
        },
        "timestamp": ended_at.isoformat()
    }


@router.get("/child/{child_id}/history")
async def get_movement_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get movement activity history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # List all sessions
    prefix = f"activities/movement/{child_id}/"
    blob_names = await azure_storage.list_blobs_in_path(prefix)

    sessions = []
    for blob_name in blob_names[:limit]:
        data = await azure_storage.load_json(blob_name)
        if data:
            sessions.append(data)

    # Sort by date descending
    sessions.sort(key=lambda x: x.get("started_at", ""), reverse=True)

    # Calculate statistics
    completed = [s for s in sessions if s.get("status") == "completed"]
    most_popular_activity = None
    if sessions:
        activity_ids = set(s.get("activity_id") for s in sessions)
        most_popular_activity = max(
            activity_ids,
            key=lambda x: sum(1 for s in sessions if s.get("activity_id") == x)
        )

    return {
        "child_id": child_id,
        "sessions": sessions,
        "total": len(sessions),
        "statistics": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "most_popular_activity": most_popular_activity,
            "most_popular_activity_name": (
                MOVEMENT_ACTIVITIES[most_popular_activity]["name"]
                if most_popular_activity else None
            )
        }
    }

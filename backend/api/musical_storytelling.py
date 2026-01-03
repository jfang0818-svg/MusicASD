"""
Musical Storytelling API endpoints
Interactive therapeutic stories with music and participation
"""
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activities/storytelling", tags=["Musical Storytelling"])

# Pre-built therapeutic stories
STORY_LIBRARY = {
    "morning_routine": {
        "id": "morning_routine",
        "title": "Good Morning Adventure",
        "description": "Social story about morning routines with musical cues",
        "duration_minutes": 5,
        "therapeutic_goals": ["routine_learning", "sequencing", "independence"],
        "music_style": "upbeat",
        "scenes": [
            {
                "id": "wake_up",
                "title": "Time to Wake Up!",
                "narrative": "The sun is rising! It's time to wake up and start our day.",
                "music_cue": "bright_rising_melody",
                "participation": {
                    "type": "movement",
                    "action": "stretch_arms",
                    "prompt": "Can you stretch up high like the sun?"
                },
                "duration_seconds": 30
            },
            {
                "id": "brush_teeth",
                "title": "Brushing Teeth",
                "narrative": "Now it's time to brush our teeth and make them sparkle!",
                "music_cue": "rhythmic_brushing_song",
                "participation": {
                    "type": "imitation",
                    "action": "brush_motion",
                    "prompt": "Let's brush together! Up and down!"
                },
                "duration_seconds": 45
            },
            {
                "id": "get_dressed",
                "title": "Getting Dressed",
                "narrative": "Let's pick out clothes and get dressed for the day.",
                "music_cue": "playful_dressing_tune",
                "participation": {
                    "type": "choice",
                    "action": "select_clothing",
                    "prompt": "What do you want to wear today?"
                },
                "duration_seconds": 40
            },
            {
                "id": "breakfast",
                "title": "Breakfast Time",
                "narrative": "Time for a healthy breakfast to give us energy!",
                "music_cue": "cheerful_eating_song",
                "participation": {
                    "type": "naming",
                    "action": "identify_foods",
                    "prompt": "What foods do you like for breakfast?"
                },
                "duration_seconds": 35
            },
            {
                "id": "ready_to_go",
                "title": "Ready for the Day!",
                "narrative": "Great job! We're all ready to start our adventure!",
                "music_cue": "triumphant_completion",
                "participation": {
                    "type": "celebration",
                    "action": "happy_dance",
                    "prompt": "Let's celebrate! Dance time!"
                },
                "duration_seconds": 30
            }
        ]
    },
    "bedtime_journey": {
        "id": "bedtime_journey",
        "title": "Peaceful Bedtime Journey",
        "description": "Calming bedtime routine story with soothing music",
        "duration_minutes": 6,
        "therapeutic_goals": ["calming", "routine_learning", "emotional_regulation"],
        "music_style": "calm",
        "scenes": [
            {
                "id": "dinner_done",
                "title": "After Dinner",
                "narrative": "The day is winding down. Time to get ready for bed.",
                "music_cue": "gentle_transition",
                "participation": {
                    "type": "reflection",
                    "action": "recall_day",
                    "prompt": "What was your favorite part of today?"
                },
                "duration_seconds": 35
            },
            {
                "id": "bath_time",
                "title": "Bath Time Bubbles",
                "narrative": "Let's have a warm, bubbly bath to wash away the day.",
                "music_cue": "flowing_water_melody",
                "participation": {
                    "type": "sensory",
                    "action": "imagine_water",
                    "prompt": "Can you pretend to splash in the water?"
                },
                "duration_seconds": 40
            },
            {
                "id": "pajamas",
                "title": "Cozy Pajamas",
                "narrative": "Time to put on our soft, cozy pajamas.",
                "music_cue": "soft_lullaby_start",
                "participation": {
                    "type": "imitation",
                    "action": "dressing_motions",
                    "prompt": "Let's put on pajamas together"
                },
                "duration_seconds": 30
            },
            {
                "id": "story_time",
                "title": "Story Time",
                "narrative": "Snuggle in for a quiet story before sleep.",
                "music_cue": "whisper_soft_music",
                "participation": {
                    "type": "listening",
                    "action": "sit_quietly",
                    "prompt": "Listen to the gentle music"
                },
                "duration_seconds": 45
            },
            {
                "id": "goodnight",
                "title": "Goodnight Moon",
                "narrative": "Goodnight stars, goodnight moon. Time for peaceful sleep.",
                "music_cue": "deep_sleep_lullaby",
                "participation": {
                    "type": "calming",
                    "action": "close_eyes",
                    "prompt": "Close your eyes and breathe slowly"
                },
                "duration_seconds": 50
            }
        ]
    },
    "friendship_story": {
        "id": "friendship_story",
        "title": "Making Friends",
        "description": "Social skills story about sharing and friendship",
        "duration_minutes": 5,
        "therapeutic_goals": ["social_skills", "turn_taking", "sharing", "emotional_recognition"],
        "music_style": "playful",
        "scenes": [
            {
                "id": "meet_friend",
                "title": "Meeting a New Friend",
                "narrative": "Today we meet a new friend at the park!",
                "music_cue": "friendly_greeting_tune",
                "participation": {
                    "type": "greeting",
                    "action": "wave_hello",
                    "prompt": "Can you wave hello?"
                },
                "duration_seconds": 30
            },
            {
                "id": "playing_together",
                "title": "Playing Together",
                "narrative": "Friends play together and share toys.",
                "music_cue": "cooperative_play_music",
                "participation": {
                    "type": "turn_taking",
                    "action": "pass_object",
                    "prompt": "My turn, your turn, let's share!"
                },
                "duration_seconds": 40
            },
            {
                "id": "feelings",
                "title": "Understanding Feelings",
                "narrative": "Sometimes friends feel happy, sometimes sad. That's okay!",
                "music_cue": "emotion_recognition_melody",
                "participation": {
                    "type": "expression",
                    "action": "show_emotions",
                    "prompt": "Can you show me a happy face? A sad face?"
                },
                "duration_seconds": 35
            },
            {
                "id": "helping",
                "title": "Helping Each Other",
                "narrative": "Good friends help each other when needed.",
                "music_cue": "caring_support_theme",
                "participation": {
                    "type": "problem_solving",
                    "action": "offer_help",
                    "prompt": "How can we help our friend?"
                },
                "duration_seconds": 35
            },
            {
                "id": "goodbye",
                "title": "Saying Goodbye",
                "narrative": "Time to say goodbye! We'll play again soon.",
                "music_cue": "cheerful_farewell",
                "participation": {
                    "type": "farewell",
                    "action": "wave_goodbye",
                    "prompt": "Wave goodbye and say 'See you soon!'"
                },
                "duration_seconds": 30
            }
        ]
    },
    "emotions_adventure": {
        "id": "emotions_adventure",
        "title": "The Feelings Adventure",
        "description": "Exploring and naming different emotions through music",
        "duration_minutes": 6,
        "therapeutic_goals": ["emotional_regulation", "emotion_recognition", "self_awareness"],
        "music_style": "varied",
        "scenes": [
            {
                "id": "happy_land",
                "title": "Happy Land",
                "narrative": "We arrive in Happy Land where everything is joyful!",
                "music_cue": "upbeat_happy_music",
                "participation": {
                    "type": "expression",
                    "action": "smile_dance",
                    "prompt": "Show me your biggest smile!"
                },
                "duration_seconds": 35
            },
            {
                "id": "sad_valley",
                "title": "Sad Valley",
                "narrative": "In Sad Valley, it's okay to feel sad sometimes.",
                "music_cue": "gentle_sad_melody",
                "participation": {
                    "type": "expression",
                    "action": "sad_face",
                    "prompt": "Can you show me how sad looks?"
                },
                "duration_seconds": 35
            },
            {
                "id": "angry_mountain",
                "title": "Angry Mountain",
                "narrative": "Angry Mountain is where we learn about angry feelings.",
                "music_cue": "intense_controlled_rhythm",
                "participation": {
                    "type": "regulation",
                    "action": "stomp_safely",
                    "prompt": "Stomp your feet, then take deep breaths"
                },
                "duration_seconds": 40
            },
            {
                "id": "scared_forest",
                "title": "Scared Forest",
                "narrative": "Sometimes we feel scared. Let's be brave together!",
                "music_cue": "suspenseful_to_comforting",
                "participation": {
                    "type": "coping",
                    "action": "hug_self",
                    "prompt": "Give yourself a safe hug"
                },
                "duration_seconds": 40
            },
            {
                "id": "calm_lake",
                "title": "Calm Lake",
                "narrative": "We end at Calm Lake where we feel peaceful and safe.",
                "music_cue": "serene_water_sounds",
                "participation": {
                    "type": "calming",
                    "action": "deep_breathing",
                    "prompt": "Breathe slowly like gentle waves"
                },
                "duration_seconds": 50
            }
        ]
    },
    "sensory_exploration": {
        "id": "sensory_exploration",
        "title": "The Sensory Garden",
        "description": "Exploring different sensory experiences through music",
        "duration_minutes": 5,
        "therapeutic_goals": ["sensory_awareness", "attention", "body_awareness"],
        "music_style": "varied",
        "scenes": [
            {
                "id": "sight_flowers",
                "title": "Colorful Flowers",
                "narrative": "Look at all the beautiful, colorful flowers!",
                "music_cue": "bright_visual_music",
                "participation": {
                    "type": "observation",
                    "action": "point_colors",
                    "prompt": "What colors do you see?"
                },
                "duration_seconds": 30
            },
            {
                "id": "sound_birds",
                "title": "Singing Birds",
                "narrative": "Listen to the birds singing their songs.",
                "music_cue": "bird_chirping_harmony",
                "participation": {
                    "type": "listening",
                    "action": "cup_ears",
                    "prompt": "Listen carefully to the sounds"
                },
                "duration_seconds": 35
            },
            {
                "id": "touch_textures",
                "title": "Different Textures",
                "narrative": "Feel the soft grass and rough tree bark.",
                "music_cue": "textural_sound_layers",
                "participation": {
                    "type": "touch",
                    "action": "feel_surfaces",
                    "prompt": "Touch something soft, then something rough"
                },
                "duration_seconds": 35
            },
            {
                "id": "smell_flowers",
                "title": "Fragrant Flowers",
                "narrative": "Smell the sweet flowers in the garden.",
                "music_cue": "airy_flowing_melody",
                "participation": {
                    "type": "breathing",
                    "action": "sniff_gently",
                    "prompt": "Take a big sniff"
                },
                "duration_seconds": 30
            },
            {
                "id": "movement_dance",
                "title": "Garden Dance",
                "narrative": "Move like the wind through the garden!",
                "music_cue": "flowing_movement_music",
                "participation": {
                    "type": "movement",
                    "action": "sway_spin",
                    "prompt": "Sway and spin gently"
                },
                "duration_seconds": 40
            }
        ]
    }
}


@router.get("/stories")
async def get_story_library():
    """Get all available stories"""
    return {
        "stories": STORY_LIBRARY,
        "total": len(STORY_LIBRARY),
        "categories": {
            "routine_learning": ["morning_routine", "bedtime_journey"],
            "social_skills": ["friendship_story"],
            "emotional_regulation": ["emotions_adventure", "bedtime_journey"],
            "sensory": ["sensory_exploration"]
        }
    }


@router.get("/stories/{story_id}")
async def get_story_details(story_id: str):
    """Get detailed information about a specific story"""
    if story_id not in STORY_LIBRARY:
        raise HTTPException(status_code=404, detail="Story not found")

    return {
        "story": STORY_LIBRARY[story_id],
        "total_scenes": len(STORY_LIBRARY[story_id]["scenes"]),
        "estimated_duration": STORY_LIBRARY[story_id]["duration_minutes"]
    }


@router.post("/start")
async def start_storytelling_session(
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    story_id: str = Body(..., embed=True),
    customization: Optional[Dict[str, Any]] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start a musical storytelling session
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

    # Validate story
    if story_id not in STORY_LIBRARY:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid story. Choose from: {list(STORY_LIBRARY.keys())}"
        )

    # Create storytelling session
    storytelling_id = f"story_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    story_data = STORY_LIBRARY[story_id].copy()

    storytelling_session = {
        "storytelling_id": storytelling_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "musical_storytelling",
        "story_id": story_id,
        "story_title": story_data["title"],
        "started_at": datetime.now().isoformat(),
        "customization": customization or {},
        "current_scene": 0,
        "completed_scenes": [],
        "participation_responses": [],
        "status": "active"
    }

    # Save initial state
    blob_path = f"activities/storytelling/{child_id}/{session_id}/{storytelling_id}.json"
    await azure_storage.save_json(blob_path, storytelling_session)

    # Log start
    await session_manager.add_log(session_id, user_id, {
        "event": "Musical Storytelling Started",
        "activity_type": "musical_storytelling",
        "storytelling_id": storytelling_id,
        "story_id": story_id,
        "story_title": story_data["title"]
    })

    logger.info("Started storytelling %s for session %s", storytelling_id, session_id)

    return {
        "status": "started",
        "storytelling_id": storytelling_id,
        "story": story_data,
        "total_scenes": len(story_data["scenes"]),
        "first_scene": story_data["scenes"][0],
        "timestamp": datetime.now().isoformat()
    }


@router.post("/scene-complete")
async def complete_scene(
    storytelling_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    scene_id: str = Body(..., embed=True),
    participation_level: str = Body(default="moderate", embed=True),  # high, moderate, low, none
    child_response: Optional[str] = Body(default=None, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record completion of a story scene
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

    # Load storytelling session
    blob_path = f"activities/storytelling/{child_id}/{session_id}/{storytelling_id}.json"
    storytelling_session = await azure_storage.load_json(blob_path)

    if not storytelling_session:
        raise HTTPException(status_code=404, detail="Storytelling session not found")

    # Record scene completion
    scene_completion = {
        "scene_id": scene_id,
        "completed_at": datetime.now().isoformat(),
        "participation_level": participation_level,
        "child_response": child_response,
        "notes": notes
    }

    storytelling_session["completed_scenes"].append(scene_completion)
    storytelling_session["current_scene"] += 1

    # Save back
    await azure_storage.save_json(blob_path, storytelling_session)

    # Log scene completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Story Scene Completed",
        "storytelling_id": storytelling_id,
        "activity_type": "musical_storytelling",
        "scene_id": scene_id,
        "participation_level": participation_level
    })

    # Get story data
    story_id = storytelling_session["story_id"]
    story_data = STORY_LIBRARY[story_id]

    # Check if story is complete
    is_complete = storytelling_session["current_scene"] >= len(story_data["scenes"])
    next_scene = None if is_complete else story_data["scenes"][storytelling_session["current_scene"]]

    logger.info("Completed scene %s for storytelling %s", scene_id, storytelling_id)

    return {
        "status": "scene_completed",
        "storytelling_id": storytelling_id,
        "current_scene": storytelling_session["current_scene"],
        "total_scenes": len(story_data["scenes"]),
        "is_complete": is_complete,
        "next_scene": next_scene,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/end")
async def end_storytelling_session(
    storytelling_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    overall_engagement: str = Body(default="moderate", embed=True),
    favorite_scene: Optional[str] = Body(default=None, embed=True),
    therapeutic_notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    End storytelling session and save summary
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

    # Load storytelling session
    blob_path = f"activities/storytelling/{child_id}/{session_id}/{storytelling_id}.json"
    storytelling_session = await azure_storage.load_json(blob_path)

    if not storytelling_session:
        raise HTTPException(status_code=404, detail="Storytelling session not found")

    # Calculate duration
    started_at = datetime.fromisoformat(storytelling_session["started_at"])
    ended_at = datetime.now()
    duration = (ended_at - started_at).total_seconds() / 60  # minutes

    # Calculate participation statistics
    participation_levels = [s["participation_level"] for s in storytelling_session["completed_scenes"]]
    high_participation = participation_levels.count("high")
    moderate_participation = participation_levels.count("moderate")

    # Update session
    storytelling_session["ended_at"] = ended_at.isoformat()
    storytelling_session["duration_minutes"] = duration
    storytelling_session["overall_engagement"] = overall_engagement
    storytelling_session["favorite_scene"] = favorite_scene
    storytelling_session["therapeutic_notes"] = therapeutic_notes
    storytelling_session["status"] = "completed"
    storytelling_session["statistics"] = {
        "total_scenes": len(storytelling_session["completed_scenes"]),
        "high_participation": high_participation,
        "moderate_participation": moderate_participation,
        "completion_rate": (
            len(storytelling_session["completed_scenes"])
            / len(STORY_LIBRARY[storytelling_session["story_id"]]["scenes"])
            * 100
        )
    }

    # Save back
    await azure_storage.save_json(blob_path, storytelling_session)

    # Log completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Musical Storytelling Completed",
        "storytelling_id": storytelling_id,
        "activity_type": "musical_storytelling",
        "story_id": storytelling_session["story_id"],
        "scenes_completed": len(storytelling_session["completed_scenes"]),
        "overall_engagement": overall_engagement,
        "notes": therapeutic_notes
    })

    logger.info(
        "Ended storytelling %s: %s scenes",
        storytelling_id,
        len(storytelling_session['completed_scenes'])
    )

    return {
        "status": "completed",
        "storytelling_id": storytelling_id,
        "summary": {
            "story_title": storytelling_session["story_title"],
            "duration_minutes": duration,
            "scenes_completed": len(storytelling_session["completed_scenes"]),
            "statistics": storytelling_session["statistics"],
            "overall_engagement": overall_engagement,
            "favorite_scene": favorite_scene
        },
        "timestamp": ended_at.isoformat()
    }


@router.get("/child/{child_id}/history")
async def get_storytelling_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get storytelling history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # List all sessions
    prefix = f"activities/storytelling/{child_id}/"
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
    most_popular_story = None
    if sessions:
        story_ids = set(s.get("story_id") for s in sessions)
        most_popular_story = max(
            story_ids,
            key=lambda x: sum(1 for s in sessions if s.get("story_id") == x)
        )

    return {
        "child_id": child_id,
        "sessions": sessions,
        "total": len(sessions),
        "statistics": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed),
            "most_popular_story": most_popular_story,
            "most_popular_story_title": (
                STORY_LIBRARY[most_popular_story]["title"] if most_popular_story else None
            )
        }
    }


@router.post("/save-custom-story")
async def save_custom_story(
    child_id: str = Body(..., embed=True),
    story_title: str = Body(..., embed=True),
    base_story_id: str = Body(..., embed=True),
    customizations: Dict[str, Any] = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Save a customized version of a story for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Initialize custom stories if not exists
    if "custom_stories" not in profile:
        profile["custom_stories"] = []

    # Create custom story
    custom_story = {
        "id": f"custom_{uuid.uuid4().hex[:8]}",
        "title": story_title,
        "base_story_id": base_story_id,
        "customizations": customizations,
        "created_at": datetime.now().isoformat()
    }

    profile["custom_stories"].append(custom_story)
    profile["updated_at"] = datetime.now().isoformat()

    # Save profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save custom story")

    logger.info("Saved custom story for child %s", child_id)

    return {
        "status": "saved",
        "custom_story": custom_story
    }

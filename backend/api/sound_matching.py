"""
Sound Matching Game API endpoints
Interactive game for auditory processing and matching skills
"""
import logging
import random
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.session_manager import get_session_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activities/sound-matching", tags=["Sound Matching Game"])

# Sound library with categories
SOUND_LIBRARY = {
    "instruments": [
        {"id": "piano", "name": "Piano", "file": "piano.mp3", "image": "piano.png"},
        {"id": "guitar", "name": "Guitar", "file": "guitar.mp3", "image": "guitar.png"},
        {"id": "drums", "name": "Drums", "file": "drums.mp3", "image": "drums.png"},
        {"id": "violin", "name": "Violin", "file": "violin.mp3", "image": "violin.png"},
        {"id": "trumpet", "name": "Trumpet", "file": "trumpet.mp3", "image": "trumpet.png"},
        {"id": "flute", "name": "Flute", "file": "flute.mp3", "image": "flute.png"},
    ],
    "animals": [
        {"id": "dog", "name": "Dog", "file": "dog_bark.mp3", "image": "dog.png"},
        {"id": "cat", "name": "Cat", "file": "cat_meow.mp3", "image": "cat.png"},
        {"id": "bird", "name": "Bird", "file": "bird_chirp.mp3", "image": "bird.png"},
        {"id": "cow", "name": "Cow", "file": "cow_moo.mp3", "image": "cow.png"},
        {"id": "lion", "name": "Lion", "file": "lion_roar.mp3", "image": "lion.png"},
        {"id": "elephant", "name": "Elephant", "file": "elephant.mp3", "image": "elephant.png"},
    ],
    "nature": [
        {"id": "rain", "name": "Rain", "file": "rain.mp3", "image": "rain.png"},
        {"id": "ocean", "name": "Ocean Waves", "file": "ocean_waves.mp3", "image": "ocean.png"},
        {"id": "thunder", "name": "Thunder", "file": "thunder.mp3", "image": "thunder.png"},
        {"id": "wind", "name": "Wind", "file": "wind.mp3", "image": "wind.png"},
        {"id": "fire", "name": "Fire Crackling", "file": "fire.mp3", "image": "fire.png"},
        {"id": "stream", "name": "Stream", "file": "stream.mp3", "image": "stream.png"},
    ],
    "everyday": [
        {"id": "doorbell", "name": "Doorbell", "file": "doorbell.mp3", "image": "doorbell.png"},
        {"id": "phone", "name": "Phone Ring", "file": "phone_ring.mp3", "image": "phone.png"},
        {"id": "car", "name": "Car Horn", "file": "car_horn.mp3", "image": "car.png"},
        {"id": "clock", "name": "Clock Ticking", "file": "clock.mp3", "image": "clock.png"},
        {"id": "knock", "name": "Door Knock", "file": "door_knock.mp3", "image": "door.png"},
        {"id": "keys", "name": "Keys Jingling", "file": "keys.mp3", "image": "keys.png"},
    ]
}


@router.get("/sounds")
async def get_sound_library():
    """Get available sounds for the game"""
    return {
        "categories": list(SOUND_LIBRARY.keys()),
        "sounds": SOUND_LIBRARY,
        "total_sounds": sum(len(sounds) for sounds in SOUND_LIBRARY.values())
    }


@router.post("/start")
async def start_sound_matching_game(
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    category: str = Body(default="instruments", embed=True),
    difficulty: str = Body(default="easy", embed=True),  # easy=3 choices, medium=4, hard=6
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Start a new sound matching game
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

    # Validate category
    if category not in SOUND_LIBRARY:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {list(SOUND_LIBRARY.keys())}"
        )

    # Create game
    game_id = f"sound_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    game_data = {
        "game_id": game_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "sound_matching",
        "category": category,
        "difficulty": difficulty,
        "started_at": datetime.now().isoformat(),
        "ended_at": None,
        "total_rounds": 0,
        "correct_matches": 0,
        "rounds": [],
        "status": "active"
    }

    # Log start
    await session_manager.add_log(session_id, user_id, {
        "event": "Sound Matching Game Started",
        "activity_type": "sound_matching",
        "game_id": game_id,
        "category": category,
        "difficulty": difficulty
    })

    logger.info("Started sound matching game %s for session %s", game_id, session_id)

    return {
        "status": "started",
        "game_id": game_id,
        "session_id": session_id,
        "category": category,
        "difficulty": difficulty,
        "available_sounds": SOUND_LIBRARY[category],
        "timestamp": datetime.now().isoformat()
    }


@router.post("/round")
async def record_sound_matching_round(
    game_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    target_sound: str = Body(..., embed=True),
    selected_sound: str = Body(..., embed=True),
    choices_shown: List[str] = Body(..., embed=True),
    response_time: float = Body(..., embed=True),
    was_correct: bool = Body(..., embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record a single round of sound matching
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

    # Record round
    round_data = {
        "round_number": None,  # Set when game ends
        "timestamp": datetime.now().isoformat(),
        "target_sound": target_sound,
        "selected_sound": selected_sound,
        "choices_shown": choices_shown,
        "response_time": response_time,
        "was_correct": was_correct,
        "notes": notes
    }

    # Log round
    await session_manager.add_log(session_id, user_id, {
        "event": f"Sound Matching Round - {'Correct' if was_correct else 'Incorrect'}",
        "game_id": game_id,
        "activity_type": "sound_matching",
        "target_sound": target_sound,
        "selected_sound": selected_sound,
        "response_time": response_time,
        "result": "correct" if was_correct else "incorrect"
    })

    logger.info("Recorded sound matching round for game %s: %s", game_id, was_correct)

    return {
        "status": "recorded",
        "game_id": game_id,
        "result": "correct" if was_correct else "incorrect",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/end")
async def end_sound_matching_game(
    game_id: str = Body(..., embed=True),
    session_id: str = Body(..., embed=True),
    child_id: str = Body(..., embed=True),
    total_rounds: int = Body(..., embed=True),
    correct_matches: int = Body(..., embed=True),
    total_duration: float = Body(..., embed=True),
    avg_response_time: float = Body(..., embed=True),
    overall_engagement: str = Body(default="moderate", embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    End sound matching game and save results
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

    # Calculate accuracy
    accuracy = (correct_matches / total_rounds * 100) if total_rounds > 0 else 0

    # Create summary
    game_summary = {
        "game_id": game_id,
        "session_id": session_id,
        "child_id": child_id,
        "activity_type": "sound_matching",
        "ended_at": datetime.now().isoformat(),
        "total_rounds": total_rounds,
        "correct_matches": correct_matches,
        "accuracy": accuracy,
        "avg_response_time": avg_response_time,
        "total_duration": total_duration,
        "overall_engagement": overall_engagement,
        "notes": notes,
        "status": "completed"
    }

    # Save to Azure
    blob_path = f"activities/sound_matching/{child_id}/{session_id}/{game_id}.json"
    await azure_storage.save_json(blob_path, game_summary)

    # Log completion
    await session_manager.add_log(session_id, user_id, {
        "event": "Sound Matching Game Completed",
        "game_id": game_id,
        "activity_type": "sound_matching",
        "total_rounds": total_rounds,
        "correct_matches": correct_matches,
        "accuracy": accuracy,
        "notes": notes
    })

    logger.info(
        "Ended sound matching game %s: %s/%s correct", game_id, correct_matches, total_rounds
    )

    return {
        "status": "completed",
        "game_id": game_id,
        "summary": game_summary
    }


@router.get("/child/{child_id}/history")
async def get_sound_matching_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get sound matching game history for a child
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # List all games
    prefix = f"activities/sound_matching/{child_id}/"
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


@router.post("/generate-round")
async def generate_round_options(
    category: str = Body(..., embed=True),
    difficulty: str = Body(default="easy", embed=True),
    exclude_sounds: List[str] = Body(default=[], embed=True)
):
    """
    Generate a new round with random sound choices
    """
    if category not in SOUND_LIBRARY:
        raise HTTPException(status_code=400, detail="Invalid category")

    # Get available sounds
    available_sounds = [s for s in SOUND_LIBRARY[category] if s["id"] not in exclude_sounds]

    if len(available_sounds) < 3:
        raise HTTPException(status_code=400, detail="Not enough sounds available")

    # Determine number of choices based on difficulty
    num_choices = {
        "easy": 3,
        "medium": 4,
        "hard": 6
    }.get(difficulty, 3)

    # Select random target
    target = random.choice(available_sounds)

    # Select distractors (wrong choices)
    distractors = [s for s in available_sounds if s["id"] != target["id"]]
    selected_distractors = random.sample(distractors, min(num_choices - 1, len(distractors)))

    # Combine and shuffle
    choices = [target] + selected_distractors
    random.shuffle(choices)

    return {
        "target": target,
        "choices": choices,
        "difficulty": difficulty,
        "category": category
    }

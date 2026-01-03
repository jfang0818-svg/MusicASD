"""
Favorites API endpoints
Handles favorite songs management for child profiles
"""
from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post("/child/{child_id}/add")
async def add_to_favorites(
    child_id: str,
    music_file: str = Body(..., embed=True),
    music_style: str = Body(..., embed=True),
    context_tags: List[str] = Body(default=[], embed=True),
    quality_score: Optional[float] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Add a song to child's favorites
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Initialize favorites if not exist
    if "favorites" not in profile:
        profile["favorites"] = []

    # Check if already favorited
    existing = next(
        (f for f in profile["favorites"] if f["music_file"] == music_file),
        None
    )

    if existing:
        raise HTTPException(status_code=400, detail="Song already in favorites")

    # Create favorite entry
    favorite = {
        "id": f"fav_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "music_file": music_file,
        "music_style": music_style,
        "date_added": datetime.now().isoformat(),
        "tags": context_tags,
        "play_count": 0,
        "total_duration_played": 0,
        "quality_scores": [quality_score] if quality_score else [],
        "last_played": None
    }

    profile["favorites"].append(favorite)
    profile["updated_at"] = datetime.now().isoformat()

    # Save updated profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update favorites")

    logger.info("Added favorite '%s' for child %s", music_file, child_id)

    return {
        "status": "success",
        "favorite": favorite,
        "total_favorites": len(profile["favorites"])
    }


@router.get("/child/{child_id}")
async def get_favorites(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get all favorites for a child, sorted by quality score or play count
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    favorites = profile.get("favorites", [])

    # Calculate average quality score for each favorite
    for fav in favorites:
        scores = fav.get("quality_scores", [])
        fav["avg_quality_score"] = sum(scores) / len(scores) if scores else 0

    # Sort by quality score descending, then play count
    favorites.sort(
        key=lambda x: (x.get("avg_quality_score", 0), x.get("play_count", 0)),
        reverse=True
    )

    return {
        "child_id": child_id,
        "child_name": profile["demographics"]["name"],
        "favorites": favorites,
        "total": len(favorites)
    }


@router.delete("/child/{child_id}/favorite/{favorite_id}")
async def remove_from_favorites(
    child_id: str,
    favorite_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Remove a song from child's favorites
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Find and remove favorite
    favorites = profile.get("favorites", [])
    original_count = len(favorites)

    profile["favorites"] = [f for f in favorites if f["id"] != favorite_id]

    if len(profile["favorites"]) == original_count:
        raise HTTPException(status_code=404, detail="Favorite not found")

    profile["updated_at"] = datetime.now().isoformat()

    # Save updated profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update favorites")

    logger.info("Removed favorite %s for child %s", favorite_id, child_id)

    return {
        "status": "success",
        "message": "Favorite removed",
        "total_favorites": len(profile["favorites"])
    }


@router.post("/child/{child_id}/favorite/{favorite_id}/track-play")
async def track_favorite_play(
    child_id: str,
    favorite_id: str,
    duration: float = Body(..., embed=True),
    quality_score: Optional[float] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Track when a favorite is played (updates play count, duration, quality scores)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Find favorite
    favorites = profile.get("favorites", [])
    favorite = next((f for f in favorites if f["id"] == favorite_id), None)

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    # Update play stats
    favorite["play_count"] = favorite.get("play_count", 0) + 1
    favorite["total_duration_played"] = favorite.get("total_duration_played", 0) + duration
    favorite["last_played"] = datetime.now().isoformat()

    if quality_score is not None:
        if "quality_scores" not in favorite:
            favorite["quality_scores"] = []
        favorite["quality_scores"].append(quality_score)

    profile["updated_at"] = datetime.now().isoformat()

    # Save updated profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update favorite stats")

    # Calculate updated average
    scores = favorite.get("quality_scores", [])
    avg_quality = sum(scores) / len(scores) if scores else 0

    logger.info("Tracked play for favorite %s, child %s", favorite_id, child_id)

    return {
        "status": "success",
        "favorite_id": favorite_id,
        "play_count": favorite["play_count"],
        "avg_quality_score": avg_quality
    }


@router.put("/child/{child_id}/favorite/{favorite_id}/tags")
async def update_favorite_tags(
    child_id: str,
    favorite_id: str,
    tags: List[str] = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Update context tags for a favorite (e.g., "morning_routine", "calming", "transition")
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Find favorite
    favorites = profile.get("favorites", [])
    favorite = next((f for f in favorites if f["id"] == favorite_id), None)

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    # Update tags
    favorite["tags"] = tags
    profile["updated_at"] = datetime.now().isoformat()

    # Save updated profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update tags")

    logger.info("Updated tags for favorite %s, child %s", favorite_id, child_id)

    return {
        "status": "success",
        "favorite_id": favorite_id,
        "tags": tags
    }

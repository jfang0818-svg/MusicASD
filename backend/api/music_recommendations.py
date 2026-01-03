"""
AI Music Recommendations API endpoints
Smart song suggestions based on favorites, metrics, and context
"""
import logging
import uuid
from collections import defaultdict, Counter
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommendations", tags=["AI Music Recommendations"])


def calculate_song_score(
    song: Dict[str, Any],
    child_profile: Dict[str, Any],
    context: Dict[str, Any],
    favorites: List[Dict[str, Any]],
    response_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate a recommendation score for a song based on multiple factors
    """
    score = 0.0
    reasons = []

    # Factor 1: Favorites match (40% weight)
    favorite_styles = [f["music_style"] for f in favorites if "music_style" in f]
    if song.get("style") in favorite_styles:
        style_frequency = favorite_styles.count(song["style"])
        favorites_score = min(style_frequency / len(favorites) * 40, 40) if favorites else 0
        score += favorites_score
        reasons.append(f"Matches favorite style ({song.get('style')})")

    # Factor 2: Response quality history (30% weight)
    style_responses = [r for r in response_history if r.get("music_style") == song.get("style")]
    if style_responses:
        avg_quality = sum(r.get("quality_score", 0) for r in style_responses) / len(style_responses)
        quality_score = (avg_quality / 5) * 30  # Normalize to 30 points
        score += quality_score
        if avg_quality >= 4:
            reasons.append(f"High quality responses to {song.get('style')} music")
        elif avg_quality >= 3:
            reasons.append(f"Moderate success with {song.get('style')} music")

    # Factor 3: Time-of-day appropriateness (15% weight)
    current_hour = datetime.now().hour
    time_context = context.get("time_of_day", "any")

    if time_context == "morning" and 6 <= current_hour < 12:
        if song.get("energy", "medium") in ["high", "medium"]:
            score += 15
            reasons.append("Good for morning energy")
    elif time_context == "evening" and 18 <= current_hour < 22:
        if song.get("energy", "medium") in ["low", "medium"]:
            score += 15
            reasons.append("Calming for evening")
    elif time_context == "any":
        score += 7.5  # Neutral score

    # Factor 4: Goal alignment (15% weight)
    session_goal = context.get("goal", "")
    song_tags = song.get("tags", [])

    goal_tag_map = {
        "calming": ["calm", "soothing", "peaceful", "relaxing"],
        "energizing": ["upbeat", "energetic", "playful", "active"],
        "focus": ["structured", "rhythmic", "steady"],
        "regulation": ["calm", "steady", "grounding"],
        "exploration": ["varied", "diverse", "interesting"]
    }

    if session_goal in goal_tag_map:
        matching_tags = set(song_tags) & set(goal_tag_map[session_goal])
        if matching_tags:
            score += 15
            reasons.append(f"Aligned with {session_goal} goal")
        else:
            score += 5

    # Bonus: Recency factor - slightly prefer less recently played songs
    song_name = song.get("name", "")
    recent_plays = [f for f in favorites if f.get("music_file") == song_name]
    if recent_plays:
        last_played = recent_plays[-1].get("last_played")
        if last_played:
            days_since = (datetime.now() - datetime.fromisoformat(last_played)).days
            if days_since > 7:
                score += 5
                reasons.append("Fresh - not played recently")
            elif days_since < 2:
                score -= 5
                reasons.append("Recently played")

    return {
        "score": round(score, 2),
        "reasons": reasons,
        "confidence": "high" if score >= 70 else "medium" if score >= 50 else "low"
    }


@router.post("/suggest")
async def get_music_recommendations(
    child_id: str = Body(..., embed=True),
    # goal, time_of_day, mood, activity_type
    context: Dict[str, Any] = Body(..., embed=True),
    limit: int = Body(default=5, embed=True),
    exclude_songs: List[str] = Body(default=[], embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get AI-powered music recommendations for a child

    Context can include:
    - goal: "calming", "energizing", "focus", "regulation", "exploration"
    - time_of_day: "morning", "afternoon", "evening", "any"
    - mood: "happy", "anxious", "calm", "energetic"
    - activity_type: "free_play", "structured", "evaluation"
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Get favorites
    favorites = profile.get("favorites", [])

    # Get response history
    response_history = []
    prefix = f"music_responses/{child_id}/"
    response_blobs = await azure_storage.list_blobs_in_path(prefix)
    for blob_name in response_blobs[:50]:  # Last 50 responses
        data = await azure_storage.load_json(blob_name)
        if data:
            response_history.append(data)

    # Get available music library (mock - in real app, fetch from actual library)
    music_library = _get_music_library_mock()

    # Filter out excluded songs
    available_songs = [s for s in music_library if s["name"] not in exclude_songs]

    # Score each song
    scored_songs = []
    for song in available_songs:
        song_with_score = song.copy()
        scoring = calculate_song_score(song, profile, context, favorites, response_history)
        song_with_score["recommendation_score"] = scoring["score"]
        song_with_score["recommendation_reasons"] = scoring["reasons"]
        song_with_score["confidence"] = scoring["confidence"]
        scored_songs.append(song_with_score)

    # Sort by score and return top recommendations
    scored_songs.sort(key=lambda x: x["recommendation_score"], reverse=True)
    recommendations = scored_songs[:limit]

    # Log recommendation request
    logger.info(
        "Generated %d recommendations for child %s with context: %s",
        len(recommendations), child_id, context
    )

    return {
        "child_id": child_id,
        "context": context,
        "recommendations": recommendations,
        "total_analyzed": len(available_songs),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/child/{child_id}/insights")
async def get_music_insights(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get insights about child's music preferences and patterns
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Get favorites
    favorites = profile.get("favorites", [])

    # Get response history
    response_history = []
    prefix = f"music_responses/{child_id}/"
    response_blobs = await azure_storage.list_blobs_in_path(prefix)
    for blob_name in response_blobs[:100]:  # Last 100 responses
        data = await azure_storage.load_json(blob_name)
        if data:
            response_history.append(data)

    # Analyze favorite styles
    favorite_styles = [f.get("music_style") for f in favorites if f.get("music_style")]
    style_counts = Counter(favorite_styles)
    top_styles = [{"style": style, "count": count} for style, count in style_counts.most_common(5)]

    # Analyze quality scores by style
    quality_by_style = defaultdict(list)
    for response in response_history:
        style = response.get("music_style")
        quality = response.get("quality_score")
        if style and quality:
            quality_by_style[style].append(quality)

    style_performance = []
    for style, qualities in quality_by_style.items():
        avg_quality = sum(qualities) / len(qualities)
        style_performance.append({
            "style": style,
            "avg_quality": round(avg_quality, 2),
            "total_sessions": len(qualities),
            "consistency": (
                "high" if max(qualities) - min(qualities) <= 1
                else "moderate" if max(qualities) - min(qualities) <= 2
                else "varied"
            )
        })
    style_performance.sort(key=lambda x: x["avg_quality"], reverse=True)

    # Analyze engagement patterns
    engagement_types = [r.get("engagement_type") for r in response_history if r.get("engagement_type")]
    engagement_counts = Counter(engagement_types)
    top_engagement = [{"type": eng, "count": count} for eng, count in engagement_counts.most_common(3)]

    # Time-of-day patterns
    time_patterns = defaultdict(int)
    for response in response_history:
        timestamp = response.get("timestamp")
        if timestamp:
            hour = datetime.fromisoformat(timestamp).hour
            if 6 <= hour < 12:
                time_patterns["morning"] += 1
            elif 12 <= hour < 18:
                time_patterns["afternoon"] += 1
            else:
                time_patterns["evening"] += 1

    # Best performing songs
    song_quality = defaultdict(list)
    for response in response_history:
        song = response.get("music_file")
        quality = response.get("quality_score")
        if song and quality:
            song_quality[song].append(quality)

    best_songs = []
    for song, qualities in song_quality.items():
        if len(qualities) >= 2:  # At least 2 plays
            avg_quality = sum(qualities) / len(qualities)
            best_songs.append({
                "song": song,
                "avg_quality": round(avg_quality, 2),
                "play_count": len(qualities)
            })
    best_songs.sort(key=lambda x: (x["avg_quality"], x["play_count"]), reverse=True)
    best_songs = best_songs[:10]

    # Generate recommendations based on insights
    recommendations = []
    if style_performance:
        best_style = style_performance[0]["style"]
        recommendations.append(f"Child responds best to {best_style} music - consider using it more often")

    if top_engagement and top_engagement[0]["count"] > len(engagement_types) * 0.4:
        top_eng_type = top_engagement[0]["type"]
        recommendations.append(f"Primary engagement type is {top_eng_type} - tailor activities accordingly")

    if time_patterns:
        best_time = max(time_patterns, key=time_patterns.get)
        recommendations.append(f"Most successful sessions occur in the {best_time}")

    avg_overall_quality = sum(r.get("quality_score", 0) for r in response_history) / len(response_history) if response_history else 0

    return {
        "child_id": child_id,
        "analysis_period": {
            "total_sessions": len(response_history),
            "total_favorites": len(favorites),
            "avg_quality_score": round(avg_overall_quality, 2)
        },
        "favorite_styles": top_styles,
        "style_performance": style_performance,
        "engagement_patterns": top_engagement,
        "time_of_day_patterns": dict(time_patterns),
        "best_performing_songs": best_songs,
        "recommendations": recommendations,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/child/{child_id}/feedback")
async def record_recommendation_feedback(
    child_id: str,
    song_name: str = Body(..., embed=True),
    was_played: bool = Body(..., embed=True),
    was_successful: Optional[bool] = Body(default=None, embed=True),
    quality_score: Optional[int] = Body(default=None, embed=True),
    notes: Optional[str] = Body(default=None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Record feedback on a recommendation to improve future suggestions
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Initialize recommendation feedback if not exists
    if "recommendation_feedback" not in profile:
        profile["recommendation_feedback"] = []

    # Create feedback entry
    feedback = {
        "id": f"feedback_{uuid.uuid4().hex[:8]}",
        "song_name": song_name,
        "was_played": was_played,
        "was_successful": was_successful,
        "quality_score": quality_score,
        "notes": notes,
        "timestamp": datetime.now().isoformat()
    }

    profile["recommendation_feedback"].append(feedback)
    profile["updated_at"] = datetime.now().isoformat()

    # Save profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    logger.info(
        "Recorded recommendation feedback for child %s: %s", child_id, song_name
    )

    return {
        "status": "recorded",
        "feedback": feedback
    }


@router.get("/child/{child_id}/learning-progress")
async def get_learning_progress(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get how the recommendation algorithm is learning and improving over time
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify child belongs to user
    profile = await azure_storage.load_json(f"profiles/{user_id}/{child_id}/profile.json")
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Get feedback history
    feedback_history = profile.get("recommendation_feedback", [])

    if not feedback_history:
        return {
            "child_id": child_id,
            "status": "insufficient_data",
            "message": "Not enough feedback data to show learning progress",
            "total_feedback": 0
        }

    # Calculate metrics over time
    total_recommendations = len(feedback_history)
    played_count = sum(1 for f in feedback_history if f.get("was_played"))
    successful_count = sum(1 for f in feedback_history if f.get("was_successful"))

    play_rate = (played_count / total_recommendations * 100) if total_recommendations > 0 else 0
    success_rate = (successful_count / played_count * 100) if played_count > 0 else 0

    # Quality score trend
    feedback_with_quality = [f for f in feedback_history if f.get("quality_score") is not None]
    if feedback_with_quality:
        recent_quality = [f["quality_score"] for f in feedback_with_quality[-10:]]
        avg_recent_quality = sum(recent_quality) / len(recent_quality)
    else:
        avg_recent_quality = 0

    # Calculate improvement
    if len(feedback_with_quality) >= 10:
        early_quality = [f["quality_score"] for f in feedback_with_quality[:5]]
        late_quality = [f["quality_score"] for f in feedback_with_quality[-5:]]
        avg_early = sum(early_quality) / len(early_quality)
        avg_late = sum(late_quality) / len(late_quality)
        improvement = avg_late - avg_early
    else:
        improvement = 0

    return {
        "child_id": child_id,
        "total_feedback": total_recommendations,
        "metrics": {
            "play_rate": round(play_rate, 1),
            "success_rate": round(success_rate, 1),
            "avg_recent_quality": round(avg_recent_quality, 2),
            "quality_improvement": round(improvement, 2)
        },
        "learning_status": {
            "is_improving": improvement > 0.5,
            "confidence_level": (
                "high" if total_recommendations >= 20
                else "medium" if total_recommendations >= 10
                else "low"
            ),
            "data_points": total_recommendations
        },
        "recommendation": (
            "Continue providing feedback to improve recommendations"
            if total_recommendations < 20
            else "Algorithm is well-tuned to child's preferences"
        ),
        "timestamp": datetime.now().isoformat()
    }


def _get_music_library_mock() -> List[Dict[str, Any]]:
    """
    Mock music library - in production, this would fetch from actual music database
    """
    return [
        {"name": "calm_piano_01.mp3", "style": "calm", "energy": "low", "tags": ["peaceful", "soothing", "piano"]},
        {"name": "calm_strings_02.mp3", "style": "calm", "energy": "low", "tags": ["calm", "strings", "relaxing"]},
        {"name": "upbeat_drums_01.mp3", "style": "upbeat", "energy": "high", "tags": ["energetic", "drums", "active"]},
        {"name": "upbeat_guitar_02.mp3", "style": "upbeat", "energy": "high", "tags": ["playful", "guitar", "upbeat"]},
        {"name": "playful_xylophone_01.mp3", "style": "playful", "energy": "medium", "tags": ["playful", "fun", "xylophone"]},
        {"name": "playful_flute_02.mp3", "style": "playful", "energy": "medium", "tags": ["playful", "light", "flute"]},
        {"name": "rhythmic_percussion_01.mp3", "style": "rhythmic", "energy": "medium", "tags": ["structured", "rhythmic", "steady"]},
        {"name": "rhythmic_clapping_02.mp3", "style": "rhythmic", "energy": "medium", "tags": ["rhythmic", "interactive", "steady"]},
        {"name": "nature_rain_01.mp3", "style": "ambient", "energy": "low", "tags": ["calm", "nature", "grounding"]},
        {"name": "nature_ocean_02.mp3", "style": "ambient", "energy": "low", "tags": ["peaceful", "nature", "soothing"]},
        {"name": "classical_violin_01.mp3", "style": "classical", "energy": "medium", "tags": ["structured", "violin", "elegant"]},
        {"name": "classical_cello_02.mp3", "style": "classical", "energy": "low", "tags": ["calm", "cello", "rich"]},
        {"name": "jazz_piano_01.mp3", "style": "jazz", "energy": "medium", "tags": ["interesting", "varied", "piano"]},
        {"name": "jazz_saxophone_02.mp3", "style": "jazz", "energy": "medium", "tags": ["diverse", "expressive", "saxophone"]},
        {"name": "folk_acoustic_01.mp3", "style": "folk", "energy": "medium", "tags": ["warm", "acoustic", "friendly"]},
        {"name": "folk_banjo_02.mp3", "style": "folk", "energy": "medium", "tags": ["playful", "upbeat", "banjo"]},
        {"name": "electronic_ambient_01.mp3", "style": "electronic", "energy": "low", "tags": ["modern", "calm", "atmospheric"]},
        {"name": "electronic_beats_02.mp3", "style": "electronic", "energy": "high", "tags": ["energetic", "structured", "modern"]},
        {"name": "world_drums_01.mp3", "style": "world", "energy": "high", "tags": ["rhythmic", "cultural", "drums"]},
        {"name": "world_flute_02.mp3", "style": "world", "energy": "medium", "tags": ["diverse", "cultural", "flute"]},
    ]

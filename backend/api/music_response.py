"""
Music Response Metrics API endpoints
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from api.auth import get_current_user
from models.schemas import (
    MusicResponseAggregateMetrics,
    MusicResponseMetricsCreate,
    MusicResponseMetricsResponse,
)
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/music-response", tags=["music-response"])


@router.post("/assess", response_model=MusicResponseMetricsResponse)
async def create_music_response_assessment(
    data: MusicResponseMetricsCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a music response assessment after music playback.

    This endpoint captures detailed therapeutic metrics about how the child
    responded to a specific piece of music during a session.
    """
    try:
        # Verify child belongs to user
        profile_path = f"profiles/{current_user['id']}/{data.child_id}/profile.json"
        child_profile = await azure_storage.load_json(profile_path)
        if not child_profile:
            raise HTTPException(
                status_code=404,
                detail="Child profile not found or access denied"
            )

        # Generate unique response ID
        timestamp = datetime.now()
        response_id = (
            f"response_{timestamp.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        )

        # Create response document
        response_data = {
            "response_id": response_id,
            "session_id": data.session_id,
            "child_id": data.child_id,
            "music_file": data.music_file,
            "music_style": data.music_style,
            "duration_played": data.duration_played,
            "timestamp": timestamp.isoformat(),

            # Binary metrics
            "initiation": data.initiation,
            "response_to_prompt": data.response_to_prompt,
            "communication": data.communication,
            "motor_movement": data.motor_movement,
            "aversion": data.aversion,

            # Categorical metrics
            "task_persistence": data.task_persistence,
            "rhythmic_sync": data.rhythmic_sync,
            "emotion": data.emotion,
            "deviance_from_typical": data.deviance_from_typical,

            # Notes
            "observer_notes": data.observer_notes,

            # Metadata
            "created_by": current_user['id'],
            "created_at": timestamp.isoformat()
        }

        # Save to Azure Storage
        blob_path = f"music_responses/{data.child_id}/{data.session_id}/{response_id}.json"
        await azure_storage.save_json(blob_path, response_data)

        logger.info(
            "Music response assessment created: %s for child %s",
            response_id,
            data.child_id
        )

        return MusicResponseMetricsResponse(
            response_id=response_id,
            session_id=data.session_id,
            child_id=data.child_id,
            music_file=data.music_file,
            music_style=data.music_style,
            duration_played=data.duration_played,
            timestamp=timestamp,
            initiation=data.initiation,
            response_to_prompt=data.response_to_prompt,
            communication=data.communication,
            motor_movement=data.motor_movement,
            aversion=data.aversion,
            task_persistence=data.task_persistence,
            rhythmic_sync=data.rhythmic_sync,
            emotion=data.emotion,
            deviance_from_typical=data.deviance_from_typical,
            observer_notes=data.observer_notes
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating music response assessment: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/child/{child_id}/session/{session_id}",
    response_model=List[MusicResponseMetricsResponse]
)
async def get_session_assessments(
    child_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all music response assessments for a specific session.
    """
    try:
        # Verify child belongs to user
        profile_path = f"profiles/{current_user['id']}/{child_id}/profile.json"
        child_profile = await azure_storage.load_json(profile_path)
        if not child_profile:
            raise HTTPException(
                status_code=404,
                detail="Child profile not found or access denied"
            )

        # List all assessments for this session
        prefix = f"music_responses/{child_id}/{session_id}/"
        blob_names = await azure_storage.list_blobs_in_path(prefix)

        assessments = []
        for blob_name in blob_names:
            data = await azure_storage.load_json(blob_name)
            if data:
                assessments.append(MusicResponseMetricsResponse(
                    response_id=data["response_id"],
                    session_id=data["session_id"],
                    child_id=data["child_id"],
                    music_file=data["music_file"],
                    music_style=data["music_style"],
                    duration_played=data["duration_played"],
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    initiation=data.get("initiation"),
                    response_to_prompt=data.get("response_to_prompt"),
                    communication=data.get("communication"),
                    motor_movement=data.get("motor_movement"),
                    aversion=data.get("aversion"),
                    task_persistence=data.get("task_persistence"),
                    rhythmic_sync=data.get("rhythmic_sync"),
                    emotion=data.get("emotion"),
                    deviance_from_typical=data.get("deviance_from_typical"),
                    observer_notes=data.get("observer_notes")
                ))

        return assessments

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving session assessments: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/child/{child_id}/aggregate",
    response_model=MusicResponseAggregateMetrics
)
async def get_aggregate_metrics(
    child_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    Get aggregated music response metrics for a child over a time period.

    Computes statistics and quality scores from all assessments.
    """
    try:
        # Verify child belongs to user
        profile_path = f"profiles/{current_user['id']}/{child_id}/profile.json"
        child_profile = await azure_storage.load_json(profile_path)
        if not child_profile:
            raise HTTPException(
                status_code=404,
                detail="Child profile not found or access denied"
            )

        # Get all assessments for this child
        prefix = f"music_responses/{child_id}/"
        blob_names = await azure_storage.list_blobs_in_path(prefix)

        # Filter by date range
        cutoff_date = datetime.now() - timedelta(days=days)
        assessments = []

        for blob_name in blob_names:
            data = await azure_storage.load_json(blob_name)
            if data:
                timestamp = datetime.fromisoformat(data["timestamp"])
                if timestamp >= cutoff_date:
                    assessments.append(data)

        if not assessments:
            # Return empty metrics
            return MusicResponseAggregateMetrics(
                child_id=child_id,
                total_assessments=0,
                date_range={
                    "start_date": cutoff_date.isoformat(),
                    "end_date": datetime.now().isoformat()
                },
                initiation_rate=0.0,
                response_to_prompt_rate=0.0,
                communication_rate=0.0,
                motor_movement_rate=0.0,
                aversion_rate=0.0,
                avg_task_persistence=0.0,
                avg_rhythmic_sync=0.0,
                avg_emotion=0.0,
                avg_deviance=0.0,
                overall_quality_score=0.0,
                metrics_by_style={},
                top_tracks=[]
            )

        # Calculate binary metrics percentages
        total = len(assessments)
        initiation_count = sum(
            1 for a in assessments if a.get("initiation") is True
        )
        response_count = sum(
            1 for a in assessments if a.get("response_to_prompt") is True
        )
        communication_count = sum(
            1 for a in assessments if a.get("communication") is True
        )
        motor_count = sum(
            1 for a in assessments if a.get("motor_movement") is True
        )
        aversion_count = sum(
            1 for a in assessments if a.get("aversion") is True
        )

        # Calculate categorical metrics averages (normalized 0-1)
        persistence_map = {
            "none": 0, "partial": 0.33, "majority": 0.67, "full": 1.0
        }
        sync_map = {"none": 0, "brief": 0.5, "continuous": 1.0}
        emotion_map = {"disengaged": 0, "neutral": 0.5, "positive": 1.0}
        deviance_map = {
            "significantly_less": 0,
            "somewhat_less": 0.25,
            "typical": 0.5,
            "somewhat_greater": 0.75,
            "significantly_greater": 1.0
        }

        persistence_scores = [
            persistence_map.get(a.get("task_persistence"), 0.5)
            for a in assessments if a.get("task_persistence")
        ]
        sync_scores = [
            sync_map.get(a.get("rhythmic_sync"), 0)
            for a in assessments if a.get("rhythmic_sync")
        ]
        emotion_scores = [
            emotion_map.get(a.get("emotion"), 0.5)
            for a in assessments if a.get("emotion")
        ]
        deviance_scores = [
            deviance_map.get(a.get("deviance_from_typical"), 0.5)
            for a in assessments if a.get("deviance_from_typical")
        ]

        if persistence_scores:
            avg_persistence = sum(persistence_scores) / len(persistence_scores)
        else:
            avg_persistence = 0.5
        avg_sync = sum(sync_scores) / len(sync_scores) if sync_scores else 0.0
        if emotion_scores:
            avg_emotion = sum(emotion_scores) / len(emotion_scores)
        else:
            avg_emotion = 0.5
        if deviance_scores:
            avg_deviance = sum(deviance_scores) / len(deviance_scores)
        else:
            avg_deviance = 0.5

        # Calculate overall quality score (0-100)
        quality_score = (
            (initiation_count / total) * 15 +
            avg_persistence * 25 +
            (response_count / total) * 10 +
            (communication_count / total) * 15 +
            (motor_count / total) * 10 +
            avg_sync * 10 +
            avg_emotion * 10 +
            (1 - aversion_count / total) * 5
        ) * 100

        # Metrics by style
        metrics_by_style = {}
        for style in ["calm", "happy", "energetic"]:
            style_assessments = [
                a for a in assessments if a.get("music_style") == style
            ]
            if style_assessments:
                style_total = len(style_assessments)
                init_rate = sum(
                    1 for a in style_assessments if a.get("initiation") is True
                ) / style_total
                comm_rate = sum(
                    1 for a in style_assessments
                    if a.get("communication") is True
                ) / style_total
                avers_rate = sum(
                    1 for a in style_assessments if a.get("aversion") is True
                ) / style_total
                metrics_by_style[style] = {
                    "count": style_total,
                    "quality_score": calculate_quality_score_for_assessments(
                        style_assessments
                    ),
                    "initiation_rate": init_rate,
                    "communication_rate": comm_rate,
                    "aversion_rate": avers_rate
                }

        # Top performing tracks
        track_scores = {}
        for a in assessments:
            track = a.get("music_file")
            if track not in track_scores:
                track_scores[track] = []
            track_scores[track].append(a)

        top_tracks = []
        for track, track_assessments in track_scores.items():
            score = calculate_quality_score_for_assessments(track_assessments)
            top_tracks.append({
                "music_file": track,
                "music_style": track_assessments[0].get("music_style"),
                "play_count": len(track_assessments),
                "quality_score": score
            })

        # Sort by quality score and take top 10
        top_tracks = sorted(
            top_tracks, key=lambda x: x["quality_score"], reverse=True
        )[:10]

        return MusicResponseAggregateMetrics(
            child_id=child_id,
            total_assessments=total,
            date_range={
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat()
            },
            initiation_rate=initiation_count / total,
            response_to_prompt_rate=response_count / total,
            communication_rate=communication_count / total,
            motor_movement_rate=motor_count / total,
            aversion_rate=aversion_count / total,
            avg_task_persistence=avg_persistence,
            avg_rhythmic_sync=avg_sync,
            avg_emotion=avg_emotion,
            avg_deviance=avg_deviance,
            overall_quality_score=quality_score,
            metrics_by_style=metrics_by_style,
            top_tracks=top_tracks
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error calculating aggregate metrics: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


def calculate_quality_score_for_assessments(
    assessments: List[Dict[str, Any]]
) -> float:
    """Helper function to calculate quality score for a list of assessments"""
    if not assessments:
        return 0.0

    total = len(assessments)

    # Binary metrics
    initiation_count = sum(
        1 for a in assessments if a.get("initiation") is True
    )
    response_count = sum(
        1 for a in assessments if a.get("response_to_prompt") is True
    )
    communication_count = sum(
        1 for a in assessments if a.get("communication") is True
    )
    motor_count = sum(
        1 for a in assessments if a.get("motor_movement") is True
    )
    aversion_count = sum(
        1 for a in assessments if a.get("aversion") is True
    )

    # Categorical metrics
    persistence_map = {
        "none": 0, "partial": 0.33, "majority": 0.67, "full": 1.0
    }
    sync_map = {"none": 0, "brief": 0.5, "continuous": 1.0}
    emotion_map = {"disengaged": 0, "neutral": 0.5, "positive": 1.0}

    persistence_scores = [
        persistence_map.get(a.get("task_persistence"), 0.5)
        for a in assessments if a.get("task_persistence")
    ]
    sync_scores = [
        sync_map.get(a.get("rhythmic_sync"), 0)
        for a in assessments if a.get("rhythmic_sync")
    ]
    emotion_scores = [
        emotion_map.get(a.get("emotion"), 0.5)
        for a in assessments if a.get("emotion")
    ]

    if persistence_scores:
        avg_persistence = sum(persistence_scores) / len(persistence_scores)
    else:
        avg_persistence = 0.5
    avg_sync = sum(sync_scores) / len(sync_scores) if sync_scores else 0.0
    avg_emotion = sum(emotion_scores) / len(emotion_scores) if emotion_scores else 0.5

    # Calculate quality score (0-100)
    quality_score = (
        (initiation_count / total) * 15 +
        avg_persistence * 25 +
        (response_count / total) * 10 +
        (communication_count / total) * 15 +
        (motor_count / total) * 10 +
        avg_sync * 10 +
        avg_emotion * 10 +
        (1 - aversion_count / total) * 5
    ) * 100

    return round(quality_score, 2)

"""
Child Analytics API

Provides comprehensive analytics and progress tracking for individual children.
Aggregates data from goals, sessions, notes, and engagement metrics.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status

from api.auth import get_current_user
from services.azure_storage import azure_storage
from models.goals import TherapyGoal, GoalProgress
from models.session_notes import SessionNote, NoteType

router = APIRouter(prefix="/child-analytics", tags=["child-analytics"])


@router.get("/{child_id}/progress-summary")
async def get_child_progress_summary(
    child_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive progress summary for a child

    Includes:
    - Goal progress statistics
    - Session frequency and duration
    - Breakthrough moments count
    - Music effectiveness analysis
    - Engagement trends
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Check if azure storage is initialized
        if not azure_storage.container_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage service not available"
            )

        # === FETCH GOALS DATA ===
        goals = []
        goals_prefix = f"goals/child_{child_id}/"

        blobs = azure_storage.container_client.list_blobs(name_starts_with=goals_prefix)
        async for blob in blobs:
            if blob.name.endswith(".json") and "_progress_" not in blob.name:
                goal_data = await azure_storage._load_json(blob.name)
                if goal_data:
                    goals.append(TherapyGoal(**goal_data))

        # Calculate goal statistics
        total_goals = len(goals)
        active_goals = len([g for g in goals if g.status == "in_progress"])
        achieved_goals = len([g for g in goals if g.status == "achieved"])

        # Calculate average progress toward targets
        progress_percentages = []
        for goal in goals:
            if goal.target - goal.baseline != 0:
                diff = goal.target - goal.baseline
                progress = ((goal.current_value - goal.baseline) / diff) * 100
                progress_percentages.append(min(progress, 100))

        if progress_percentages:
            avg_goal_progress = sum(progress_percentages) / len(progress_percentages)
        else:
            avg_goal_progress = 0

        # === FETCH SESSION NOTES ===
        notes = []
        notes_prefix = "session_notes/"

        blobs = azure_storage.container_client.list_blobs(name_starts_with=notes_prefix)
        async for blob in blobs:
            if blob.name.endswith(".json"):
                note_data = await azure_storage._load_json(blob.name)
                if note_data and note_data.get("child_id") == child_id:
                    try:
                        note = SessionNote(**note_data)
                        if note.timestamp:
                            note_timestamp = datetime.fromisoformat(note.timestamp)
                            if note_timestamp >= start_date:
                                notes.append(note)
                    except (ValueError, TypeError):
                        # Skip notes with invalid data
                        pass

        # Categorize notes
        breakthrough_count = len([n for n in notes if n.note_type == NoteType.BREAKTHROUGH])
        challenge_count = len([n for n in notes if n.note_type == NoteType.CHALLENGE])
        safety_count = len([n for n in notes if n.note_type == NoteType.SAFETY])

        # === FETCH SESSION DATA ===
        sessions = []
        sessions_prefix = f"sessions/child_{child_id}/"

        blobs = azure_storage.container_client.list_blobs(name_starts_with=sessions_prefix)
        async for blob in blobs:
            if blob.name.endswith(".json"):
                session_data = await azure_storage._load_json(blob.name)
                if session_data and session_data.get("start_time"):
                    try:
                        session_timestamp = datetime.fromisoformat(session_data["start_time"])
                        if session_timestamp >= start_date:
                            sessions.append(session_data)
                    except (ValueError, TypeError):
                        # Skip sessions with invalid timestamps
                        pass

        total_sessions = len(sessions)
        total_minutes = sum(s.get("duration_seconds", 0) for s in sessions) / 60

        # Music effectiveness analysis
        music_usage = defaultdict(int)
        music_engagement = defaultdict(list)

        for note in notes:
            if note.music_style:
                music_usage[note.music_style] += 1
                if note.engagement_level:
                    # Convert engagement to numeric
                    engagement_map = {"LOW": 1, "MED": 2, "HIGH": 3}
                    eng_val = engagement_map.get(note.engagement_level, 2)
                    music_engagement[note.music_style].append(eng_val)

        # Calculate average engagement per music style
        music_effectiveness = {}
        for style, engagements in music_engagement.items():
            avg_engagement = sum(engagements) / len(engagements) if engagements else 0
            music_effectiveness[style] = {
                "usage_count": music_usage[style],
                "avg_engagement": round(avg_engagement, 2),
                # Convert to 0-100 scale
                "effectiveness_score": round(avg_engagement * 33.33, 1)
            }

        # Recent breakthrough moments
        recent_breakthroughs = [
            {
                "content": n.content,
                "timestamp": n.timestamp,
                "session_id": n.session_id
            }
            for n in sorted([n for n in notes if n.note_type == NoteType.BREAKTHROUGH],
                          key=lambda x: x.timestamp, reverse=True)[:5]
        ]

        return {
            "child_id": child_id,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "goals": {
                "total": total_goals,
                "active": active_goals,
                "achieved": achieved_goals,
                "avg_progress_percent": round(avg_goal_progress, 1)
            },
            "sessions": {
                "total": total_sessions,
                "total_minutes": round(total_minutes, 1),
                "avg_duration_minutes": (
                    round(total_minutes / total_sessions, 1) if total_sessions > 0 else 0
                )
            },
            "notes": {
                "total": len(notes),
                "breakthroughs": breakthrough_count,
                "challenges": challenge_count,
                "safety_concerns": safety_count
            },
            "music_effectiveness": music_effectiveness,
            "recent_breakthroughs": recent_breakthroughs
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate progress summary: {str(e)}"
        ) from e


@router.get("/{child_id}/goal-progress-timeline")
async def get_goal_progress_timeline(
    child_id: str,
    goal_id: Optional[str] = None,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    Get timeline of goal progress for visualization
    Returns data points for charting goal progress over time
    """
    try:
        if not azure_storage.container_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage service not available"
            )

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Fetch all goals or specific goal
        goals_to_analyze = []
        goals_prefix = f"goals/child_{child_id}/"

        blobs = azure_storage.container_client.list_blobs(name_starts_with=goals_prefix)
        async for blob in blobs:
            if blob.name.endswith(".json") and "_progress_" not in blob.name:
                goal_data = await azure_storage._load_json(blob.name)
                if goal_data:
                    goal = TherapyGoal(**goal_data)
                    if goal_id is None or goal.goal_id == goal_id:
                        goals_to_analyze.append(goal)

        timeline_data = []

        for goal in goals_to_analyze:
            # Fetch progress entries for this goal
            progress_entries = []
            progress_prefix = f"goals/child_{child_id}/{goal.goal_id}_progress_"

            blobs = azure_storage.container_client.list_blobs(
                name_starts_with=progress_prefix
            )
            async for blob in blobs:
                if blob.name.endswith(".json"):
                    progress_data = await azure_storage._load_json(blob.name)
                    if progress_data:
                        try:
                            progress = GoalProgress(**progress_data)
                            if progress.timestamp:
                                progress_timestamp = datetime.fromisoformat(progress.timestamp)
                                if progress_timestamp >= start_date:
                                    progress_entries.append(progress)
                        except (ValueError, TypeError):
                            # Skip entries with invalid data
                            pass

            # Sort by timestamp
            progress_entries.sort(key=lambda p: p.timestamp)

            # Create timeline data points
            data_points = [
                {
                    "date": p.timestamp,
                    "value": p.measured_value,
                    "relative_to_baseline": p.relative_to_baseline,
                    "relative_to_target": p.relative_to_target,
                    "session_id": p.session_id
                }
                for p in progress_entries
            ]

            timeline_data.append({
                "goal_id": goal.goal_id,
                "goal_title": goal.title,
                "category": goal.category,
                "baseline": goal.baseline,
                "target": goal.target,
                "current_value": goal.current_value,
                "unit": goal.unit,
                "data_points": data_points
            })

        return {
            "child_id": child_id,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "goals": timeline_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate goal timeline: {str(e)}"
        ) from e


@router.get("/{child_id}/session-insights")
async def get_session_insights(
    child_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """
    Get insights from session notes and patterns

    Returns:
    - Common challenges and solutions
    - Most effective strategies
    - Engagement patterns
    - Recommended focus areas
    """
    try:
        if not azure_storage.container_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage service not available"
            )

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Fetch session notes
        notes = []
        notes_prefix = "session_notes/"

        blobs = azure_storage.container_client.list_blobs(name_starts_with=notes_prefix)
        async for blob in blobs:
            if blob.name.endswith(".json"):
                note_data = await azure_storage._load_json(blob.name)
                if note_data and note_data.get("child_id") == child_id:
                    try:
                        note = SessionNote(**note_data)
                        if note.timestamp:
                            note_timestamp = datetime.fromisoformat(note.timestamp)
                            if note_timestamp >= start_date:
                                notes.append(note)
                    except (ValueError, TypeError):
                        # Skip notes with invalid data
                        pass

        # Analyze patterns
        strategy_notes = [n for n in notes if n.note_type == NoteType.STRATEGY]
        breakthrough_notes = [
            n for n in notes if n.note_type == NoteType.BREAKTHROUGH
        ]
        challenge_notes = [n for n in notes if n.note_type == NoteType.CHALLENGE]

        # Engagement level analysis
        engagement_by_phase = defaultdict(list)
        for note in notes:
            if note.engagement_level and note.session_phase:
                engagement_map = {"LOW": 1, "MED": 2, "HIGH": 3}
                eng_val = engagement_map.get(note.engagement_level, 2)
                engagement_by_phase[note.session_phase].append(eng_val)

        # Calculate average engagement per phase
        engagement_summary = {}
        for phase, levels in engagement_by_phase.items():
            avg = sum(levels) / len(levels) if levels else 0
            engagement_summary[phase] = {
                "avg_engagement": round(avg, 2),
                "sample_size": len(levels)
            }

        # Generate AI insights
        insights = []

        if breakthrough_notes:
            insights.append({
                "type": "positive",
                "title": f"{len(breakthrough_notes)} Breakthrough Moments",
                "description": (
                    f"Child has demonstrated {len(breakthrough_notes)} breakthrough "
                    f"moments in the past {days} days. "
                    "This indicates positive therapeutic progress."
                ),
                "priority": "high"
            })

        if len(challenge_notes) > len(breakthrough_notes):
            insights.append({
                "type": "concern",
                "title": "Challenges Exceed Breakthroughs",
                "description": (
                    "Consider reviewing intervention strategies "
                    "and consulting with therapy team."
                ),
                "priority": "high"
            })

        if strategy_notes:
            insights.append({
                "type": "info",
                "title": f"{len(strategy_notes)} Strategies Documented",
                "description": (
                    "Good documentation of intervention strategies. "
                    "Review which strategies correlate with breakthroughs."
                ),
                "priority": "medium"
            })

        return {
            "child_id": child_id,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "note_summary": {
                "total_notes": len(notes),
                "breakthroughs": len(breakthrough_notes),
                "challenges": len(challenge_notes),
                "strategies": len(strategy_notes)
            },
            "engagement_by_phase": engagement_summary,
            "insights": insights,
            "recent_challenges": [
                {"content": n.content, "timestamp": n.timestamp}
                for n in sorted(
                    challenge_notes, key=lambda x: x.timestamp, reverse=True
                )[:3]
            ],
            "effective_strategies": [
                {"content": n.content, "timestamp": n.timestamp}
                for n in sorted(
                    strategy_notes, key=lambda x: x.timestamp, reverse=True
                )[:3]
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate session insights: {str(e)}"
        ) from e

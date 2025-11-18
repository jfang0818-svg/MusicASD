"""
Goal Tracking API Endpoints

Provides CRUD operations for therapy goals and progress tracking.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid
from datetime import datetime

from models.goals import (
    TherapyGoal,
    GoalProgress,
    GoalSummary,
    CreateGoalRequest,
    UpdateGoalRequest,
    RecordProgressRequest,
    GoalCategory,
    GoalStatus,
    MeasurementType,
    GOAL_TEMPLATES
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/templates")
async def get_goal_templates():
    """Get predefined goal templates for quick setup"""
    return {
        "templates": GOAL_TEMPLATES,
        "categories": [category.value for category in GoalCategory]
    }


@router.post("/create", response_model=TherapyGoal)
async def create_goal(
    request: CreateGoalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new therapy goal"""
    goal_id = f"goal_{request.child_id}_{uuid.uuid4().hex[:8]}"

    goal = TherapyGoal(
        goal_id=goal_id,
        child_id=request.child_id,
        category=request.category,
        title=request.title,
        description=request.description,
        measurement_type=request.measurement_type,
        baseline=request.baseline,
        target=request.target,
        unit=request.unit,
        current_value=request.baseline,  # Start at baseline
        target_date=request.target_date,
        notes=request.notes,
        intervention_strategies=request.intervention_strategies
    )

    # Save to Azure Storage
    try:
        blob_path = f"goals/child_{request.child_id}/{goal_id}.json"
        await azure_storage._save_json(blob_path, goal.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save goal: {str(e)}"
        )

    return goal


@router.get("/child/{child_id}", response_model=List[TherapyGoal])
async def get_child_goals(
    child_id: str,
    status_filter: Optional[GoalStatus] = None,
    category_filter: Optional[GoalCategory] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all goals for a specific child"""
    try:
        goals = []
        prefix = f"goals/child_{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json") and "_progress_" not in blob.name:
                goal_data = await azure_storage._load_json(blob.name)
                if goal_data:
                    goal = TherapyGoal(**goal_data)

                    # Apply filters
                    if status_filter and goal.status != status_filter:
                        continue
                    if category_filter and goal.category != category_filter:
                        continue

                    goals.append(goal)

        # Sort by creation date (newest first)
        goals.sort(key=lambda g: g.created_date, reverse=True)
        return goals

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve goals: {str(e)}"
        )


@router.get("/{goal_id}", response_model=TherapyGoal)
async def get_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific goal by ID"""
    # Extract child_id from goal_id (format: goal_<child_id>_<hash>)
    parts = goal_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format"
        )

    child_id = parts[1]
    blob_path = f"goals/child_{child_id}/{goal_id}.json"

    try:
        goal_data = await azure_storage._load_json(blob_path)
        if not goal_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )
        return TherapyGoal(**goal_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve goal: {str(e)}"
        )


@router.put("/{goal_id}", response_model=TherapyGoal)
async def update_goal(
    goal_id: str,
    request: UpdateGoalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing goal"""
    # Get existing goal
    parts = goal_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format"
        )

    child_id = parts[1]
    blob_path = f"goals/child_{child_id}/{goal_id}.json"

    try:
        goal_data = await azure_storage._load_json(blob_path)
        if not goal_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )

        goal = TherapyGoal(**goal_data)

        # Update fields
        if request.title is not None:
            goal.title = request.title
        if request.description is not None:
            goal.description = request.description
        if request.target is not None:
            goal.target = request.target
        if request.target_date is not None:
            goal.target_date = request.target_date
        if request.status is not None:
            goal.status = request.status
        if request.notes is not None:
            goal.notes = request.notes
        if request.intervention_strategies is not None:
            goal.intervention_strategies = request.intervention_strategies

        # Save updated goal
        await azure_storage._save_json(blob_path, goal.dict())
        return goal

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update goal: {str(e)}"
        )


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a goal and all its progress data"""
    parts = goal_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format"
        )

    child_id = parts[1]
    blob_path = f"goals/child_{child_id}/{goal_id}.json"

    try:
        # Delete goal
        blob_client = azure_storage.container_client.get_blob_client(blob_path)
        await blob_client.delete_blob()

        # Delete all progress entries
        prefix = f"goals/child_{child_id}/{goal_id}_progress_"
        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            await azure_storage.container_client.delete_blob(blob.name)

        return {"message": "Goal and all progress data deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete goal: {str(e)}"
        )


@router.post("/progress/record", response_model=GoalProgress)
async def record_progress(
    request: RecordProgressRequest,
    current_user: dict = Depends(get_current_user)
):
    """Record progress measurement for a goal"""
    # Get goal to calculate relative metrics
    parts = request.goal_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format"
        )

    child_id = parts[1]
    goal_blob_path = f"goals/child_{child_id}/{request.goal_id}.json"

    try:
        goal_data = await azure_storage._load_json(goal_blob_path)
        if not goal_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )

        goal = TherapyGoal(**goal_data)

        # Create progress entry
        progress_id = f"{request.goal_id}_progress_{uuid.uuid4().hex[:8]}"

        # Calculate relative metrics
        if goal.baseline != 0:
            relative_to_baseline = ((request.measured_value - goal.baseline) / goal.baseline) * 100
        else:
            relative_to_baseline = 0.0

        if goal.target - goal.baseline != 0:
            relative_to_target = ((request.measured_value - goal.baseline) / (goal.target - goal.baseline)) * 100
        else:
            relative_to_target = 0.0

        progress = GoalProgress(
            progress_id=progress_id,
            goal_id=request.goal_id,
            session_id=request.session_id,
            measured_value=request.measured_value,
            measurement_type=goal.measurement_type,
            notes=request.notes,
            music_style_used=request.music_style_used,
            engagement_level=request.engagement_level,
            relative_to_baseline=relative_to_baseline,
            relative_to_target=relative_to_target
        )

        # Save progress
        progress_blob_path = f"goals/child_{child_id}/{progress_id}.json"
        await azure_storage._save_json(progress_blob_path, progress.dict())

        # Update goal's current value and session count
        goal.current_value = request.measured_value
        goal.sessions_tracked += 1

        # Check if goal is achieved
        if request.measured_value >= goal.target and goal.status == GoalStatus.IN_PROGRESS:
            goal.status = GoalStatus.ACHIEVED

        await azure_storage._save_json(goal_blob_path, goal.dict())

        return progress

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record progress: {str(e)}"
        )


@router.get("/{goal_id}/summary", response_model=GoalSummary)
async def get_goal_summary(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive summary and analytics for a goal"""
    parts = goal_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format"
        )

    child_id = parts[1]
    goal_blob_path = f"goals/child_{child_id}/{goal_id}.json"

    try:
        # Get goal
        goal_data = await azure_storage._load_json(goal_blob_path)
        if not goal_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )

        goal = TherapyGoal(**goal_data)

        # Get all progress entries
        progress_entries = []
        prefix = f"goals/child_{child_id}/{goal_id}_progress_"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                progress_data = await azure_storage._load_json(blob.name)
                if progress_data:
                    progress_entries.append(GoalProgress(**progress_data))

        # Sort by timestamp
        progress_entries.sort(key=lambda p: p.timestamp)

        # Calculate statistics
        if progress_entries:
            values = [p.measured_value for p in progress_entries]
            average_value = sum(values) / len(values)
            latest_value = values[-1]

            # Improvement from baseline
            if goal.baseline != 0:
                improvement_percent = ((latest_value - goal.baseline) / goal.baseline) * 100
            else:
                improvement_percent = 0.0

            # Progress toward target
            if goal.target - goal.baseline != 0:
                target_progress_percent = ((latest_value - goal.baseline) / (goal.target - goal.baseline)) * 100
            else:
                target_progress_percent = 0.0

            # Trend analysis
            if len(values) >= 3:
                recent_trend = values[-3:]
                if recent_trend[-1] > recent_trend[0]:
                    trend = "improving"
                elif recent_trend[-1] < recent_trend[0]:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "insufficient_data"

            # Count sessions above/below target
            sessions_above_target = sum(1 for v in values if v >= goal.target)
            sessions_below_target = len(values) - sessions_above_target

            # Generate AI recommendation
            ai_recommendation = generate_goal_recommendation(goal, progress_entries, trend, target_progress_percent)

        else:
            # No data yet
            average_value = goal.baseline
            latest_value = goal.baseline
            improvement_percent = 0.0
            target_progress_percent = 0.0
            trend = "insufficient_data"
            sessions_above_target = 0
            sessions_below_target = 0
            ai_recommendation = "No progress data yet. Start tracking in your next session!"

        return GoalSummary(
            goal=goal,
            progress_entries=progress_entries,
            total_sessions=len(progress_entries),
            average_value=average_value,
            latest_value=latest_value,
            improvement_percent=improvement_percent,
            target_progress_percent=target_progress_percent,
            trend=trend,
            sessions_above_target=sessions_above_target,
            sessions_below_target=sessions_below_target,
            ai_recommendation=ai_recommendation
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve goal summary: {str(e)}"
        )


def generate_goal_recommendation(
    goal: TherapyGoal,
    progress_entries: List[GoalProgress],
    trend: str,
    target_progress: float
) -> str:
    """Generate AI recommendation based on goal progress"""

    if target_progress >= 100:
        return f"🎉 Goal achieved! Consider setting a new, more challenging target or maintaining this level."

    if trend == "improving" and target_progress >= 70:
        return f"Great progress! You're {target_progress:.0f}% toward the target. Keep using current strategies."

    if trend == "improving" and target_progress < 70:
        return f"Positive trend! Continue with current intervention strategies. Consider increasing session frequency."

    if trend == "stable" and target_progress >= 50:
        return f"Progress has plateaued at {target_progress:.0f}%. Try introducing new intervention strategies or activities."

    if trend == "stable" and target_progress < 50:
        return f"Limited progress. Consider: 1) Adjusting the target, 2) Trying different music styles, 3) Consulting with a therapist."

    if trend == "declining":
        return f"Recent decline observed. Review: 1) Environmental changes, 2) Session timing, 3) Potential stressors. Consider professional consultation."

    return "Continue tracking progress to identify patterns and trends."

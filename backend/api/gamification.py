"""
Gamification API

Achievement and reward system to motivate engagement.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timedelta

from models.gamification import (
    AchievementDefinition,
    UnlockedAchievement,
    ChildProgress,
    UnlockAchievementRequest,
    UpdateProgressRequest,
    ACHIEVEMENTS
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/gamification", tags=["gamification"])


def calculate_level(points: int) -> tuple[int, int]:
    """Calculate level and points to next level"""
    # Level up every 100 points
    level = (points // 100) + 1
    points_in_current_level = points % 100
    points_to_next = 100 - points_in_current_level
    return level, points_to_next


@router.get("/achievements", response_model=Dict[str, AchievementDefinition])
async def get_all_achievements():
    """Get all available achievements"""
    return ACHIEVEMENTS


@router.get("/achievements/{achievement_id}", response_model=AchievementDefinition)
async def get_achievement(achievement_id: str):
    """Get specific achievement details"""
    if achievement_id not in ACHIEVEMENTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Achievement not found"
        )
    return ACHIEVEMENTS[achievement_id]


@router.get("/child/{child_id}/progress", response_model=ChildProgress)
async def get_child_progress(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get child's gamification progress"""
    blob_path = f"gamification/progress/{child_id}.json"

    try:
        progress_data = await azure_storage._load_json(blob_path)
        if not progress_data:
            # Return default progress
            return ChildProgress(child_id=child_id)
        return ChildProgress(**progress_data)
    except Exception:
        return ChildProgress(child_id=child_id)


@router.put("/child/{child_id}/progress", response_model=ChildProgress)
async def update_child_progress(
    child_id: str,
    request: UpdateProgressRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update child's progress and check for new achievements"""
    blob_path = f"gamification/progress/{child_id}.json"

    try:
        # Load existing progress
        progress_data = await azure_storage._load_json(blob_path)
        if progress_data:
            progress = ChildProgress(**progress_data)
        else:
            progress = ChildProgress(child_id=child_id)

        # Update counters
        progress.total_sessions += request.sessions_increment
        progress.total_activities_completed += request.activities_increment
        progress.total_goals_achieved += request.goals_increment

        # Update streak
        if request.update_streak:
            today = datetime.now().date().isoformat()
            if progress.last_session_date:
                last_date = datetime.fromisoformat(progress.last_session_date).date()
                days_diff = (datetime.now().date() - last_date).days

                if days_diff == 1:
                    # Continue streak
                    progress.current_streak_days += 1
                elif days_diff == 0:
                    # Same day, no change
                    pass
                else:
                    # Streak broken
                    progress.current_streak_days = 1
            else:
                progress.current_streak_days = 1

            progress.last_session_date = today

            # Update longest streak
            if progress.current_streak_days > progress.longest_streak_days:
                progress.longest_streak_days = progress.current_streak_days

        # Update level
        progress.level, progress.points_to_next_level = calculate_level(progress.total_points)
        progress.updated_at = datetime.now().isoformat()

        # Save progress
        await azure_storage._save_json(blob_path, progress.dict())

        # Check for automatic achievement unlocks
        await check_and_unlock_achievements(child_id, progress)

        return progress

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )


async def check_and_unlock_achievements(child_id: str, progress: ChildProgress):
    """Check if child has met requirements for any achievements"""
    unlocked_ids = await get_unlocked_achievement_ids(child_id)

    for achievement_id, achievement in ACHIEVEMENTS.items():
        # Skip if already unlocked
        if achievement_id in unlocked_ids:
            continue

        # Check requirements
        should_unlock = False

        if achievement.requirement_type == "session_count":
            should_unlock = progress.total_sessions >= achievement.requirement_value
        elif achievement.requirement_type == "streak_days":
            should_unlock = progress.current_streak_days >= achievement.requirement_value
        elif achievement.requirement_type == "goal_achieved":
            should_unlock = progress.total_goals_achieved >= achievement.requirement_value
        elif achievement.requirement_type == "activity_count":
            should_unlock = progress.total_activities_completed >= achievement.requirement_value

        # Unlock if requirements met
        if should_unlock:
            await unlock_achievement_internal(
                child_id=child_id,
                achievement_id=achievement_id,
                unlocked_by="automatic",
                session_id=None
            )


async def get_unlocked_achievement_ids(child_id: str) -> set:
    """Get set of unlocked achievement IDs for a child"""
    try:
        unlocked_ids = set()
        prefix = f"gamification/unlocked/{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                unlock_data = await azure_storage._load_json(blob.name)
                if unlock_data:
                    unlocked_ids.add(unlock_data["achievement_id"])

        return unlocked_ids
    except:
        return set()


async def unlock_achievement_internal(
    child_id: str,
    achievement_id: str,
    unlocked_by: str,
    session_id: Optional[str]
) -> UnlockedAchievement:
    """Internal function to unlock an achievement"""
    if achievement_id not in ACHIEVEMENTS:
        raise ValueError(f"Unknown achievement: {achievement_id}")

    achievement = ACHIEVEMENTS[achievement_id]
    unlock_id = f"unlock_{child_id}_{achievement_id}_{uuid.uuid4().hex[:6]}"

    unlocked = UnlockedAchievement(
        unlock_id=unlock_id,
        child_id=child_id,
        achievement_id=achievement_id,
        achievement_name=achievement.name,
        achievement_icon=achievement.icon,
        unlocked_by=unlocked_by,
        session_id=session_id,
        points_awarded=achievement.points
    )

    # Save unlock record
    blob_path = f"gamification/unlocked/{child_id}/{unlock_id}.json"
    await azure_storage._save_json(blob_path, unlocked.dict())

    # Update child's total points and achievement count
    progress_path = f"gamification/progress/{child_id}.json"
    progress_data = await azure_storage._load_json(progress_path)
    if progress_data:
        progress = ChildProgress(**progress_data)
    else:
        progress = ChildProgress(child_id=child_id)

    progress.total_points += achievement.points
    progress.total_achievements += 1
    progress.level, progress.points_to_next_level = calculate_level(progress.total_points)
    progress.updated_at = datetime.now().isoformat()

    await azure_storage._save_json(progress_path, progress.dict())

    return unlocked


@router.post("/unlock", response_model=UnlockedAchievement)
async def unlock_achievement(
    request: UnlockAchievementRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually unlock an achievement (e.g., for breakthrough moments)"""
    try:
        # Check if already unlocked
        unlocked_ids = await get_unlocked_achievement_ids(request.child_id)
        if request.achievement_id in unlocked_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Achievement already unlocked"
            )

        return await unlock_achievement_internal(
            child_id=request.child_id,
            achievement_id=request.achievement_id,
            unlocked_by=request.unlocked_by,
            session_id=request.session_id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unlock achievement: {str(e)}"
        )


@router.get("/child/{child_id}/unlocked", response_model=List[UnlockedAchievement])
async def get_unlocked_achievements(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all achievements unlocked by a child"""
    try:
        unlocked = []
        prefix = f"gamification/unlocked/{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                unlock_data = await azure_storage._load_json(blob.name)
                if unlock_data:
                    unlocked.append(UnlockedAchievement(**unlock_data))

        # Sort by unlock date (newest first)
        unlocked.sort(key=lambda u: u.unlocked_at, reverse=True)
        return unlocked

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve unlocked achievements: {str(e)}"
        )


@router.get("/child/{child_id}/new-achievements", response_model=List[UnlockedAchievement])
async def get_new_achievements(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get achievements that haven't been seen by child yet"""
    try:
        new_achievements = []
        prefix = f"gamification/unlocked/{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                unlock_data = await azure_storage._load_json(blob.name)
                if unlock_data and not unlock_data.get("seen_by_child", False):
                    new_achievements.append(UnlockedAchievement(**unlock_data))

        return new_achievements

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve new achievements: {str(e)}"
        )


@router.put("/achievement/{unlock_id}/mark-seen")
async def mark_achievement_seen(
    unlock_id: str,
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an achievement as seen by child"""
    try:
        # Find the unlock record
        prefix = f"gamification/unlocked/{child_id}/"
        unlock_blob_path = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if unlock_id in blob.name and blob.name.endswith(".json"):
                unlock_blob_path = blob.name
                break

        if not unlock_blob_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Achievement unlock not found"
            )

        # Update seen status
        unlock_data = await azure_storage._load_json(unlock_blob_path)
        if unlock_data:
            unlocked = UnlockedAchievement(**unlock_data)
            unlocked.seen_by_child = True
            await azure_storage._save_json(unlock_blob_path, unlocked.dict())

        return {"message": "Achievement marked as seen"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark achievement as seen: {str(e)}"
        )

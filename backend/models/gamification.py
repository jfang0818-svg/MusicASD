"""
Gamification and Rewards Models

Achievement system to motivate engagement and celebrate progress.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class AchievementCategory(str, Enum):
    """Categories of achievements"""
    PARTICIPATION = "participation"      # Attendance milestones
    ENGAGEMENT = "engagement"            # High engagement sessions
    COMMUNICATION = "communication"      # Communication milestones
    SOCIAL = "social"                    # Social interaction achievements
    MUSICAL = "musical"                  # Musical skill achievements
    GOALS = "goals"                      # Goal completion achievements
    STREAK = "streak"                    # Consistency achievements


class AchievementTier(str, Enum):
    """Achievement difficulty tiers"""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class AchievementDefinition(BaseModel):
    """Pre-defined achievement template"""
    achievement_id: str = Field(description="Unique achievement ID")
    name: str = Field(description="Achievement name")
    description: str = Field(description="What must be done to earn it")
    icon: str = Field(description="Emoji icon")
    category: AchievementCategory
    tier: AchievementTier

    # Requirements
    requirement_type: str = Field(
        description="Type: session_count, streak_days, goal_achieved, engagement_threshold"
    )
    requirement_value: int = Field(description="Threshold to unlock")

    # Rewards
    points: int = Field(description="Points awarded")
    reward_message: str = Field(description="Celebration message")


# Pre-defined achievements
ACHIEVEMENTS: Dict[str, AchievementDefinition] = {
    # Participation
    "first_session": AchievementDefinition(
        achievement_id="first_session",
        name="First Session! 🎉",
        description="Complete your very first music therapy session",
        icon="🎵",
        category=AchievementCategory.PARTICIPATION,
        tier=AchievementTier.BRONZE,
        requirement_type="session_count",
        requirement_value=1,
        points=10,
        reward_message="Amazing! You completed your first session!"
    ),
    "five_sessions": AchievementDefinition(
        achievement_id="five_sessions",
        name="Music Explorer 🌟",
        description="Complete 5 music therapy sessions",
        icon="🎸",
        category=AchievementCategory.PARTICIPATION,
        tier=AchievementTier.SILVER,
        requirement_type="session_count",
        requirement_value=5,
        points=50,
        reward_message="5 sessions completed! You're becoming a music therapy pro!"
    ),
    "ten_sessions": AchievementDefinition(
        achievement_id="ten_sessions",
        name="Music Champion 🏆",
        description="Complete 10 music therapy sessions",
        icon="🏆",
        category=AchievementCategory.PARTICIPATION,
        tier=AchievementTier.GOLD,
        requirement_type="session_count",
        requirement_value=10,
        points=100,
        reward_message="10 sessions! You're a music therapy champion!"
    ),

    # Engagement
    "super_engaged": AchievementDefinition(
        achievement_id="super_engaged",
        name="Super Engaged! ⭐",
        description="Complete a session with high engagement",
        icon="⭐",
        category=AchievementCategory.ENGAGEMENT,
        tier=AchievementTier.BRONZE,
        requirement_type="engagement_threshold",
        requirement_value=80,
        points=20,
        reward_message="You were super engaged today! Amazing focus!"
    ),

    # Streaks
    "three_day_streak": AchievementDefinition(
        achievement_id="three_day_streak",
        name="Consistency Star 🌟",
        description="Complete sessions 3 days in a row",
        icon="📅",
        category=AchievementCategory.STREAK,
        tier=AchievementTier.SILVER,
        requirement_type="streak_days",
        requirement_value=3,
        points=50,
        reward_message="3 days in a row! You're building great habits!"
    ),
    "weekly_streak": AchievementDefinition(
        achievement_id="weekly_streak",
        name="Weekly Warrior 💪",
        description="Complete sessions 7 days in a row",
        icon="💪",
        category=AchievementCategory.STREAK,
        tier=AchievementTier.GOLD,
        requirement_type="streak_days",
        requirement_value=7,
        points=150,
        reward_message="7 days straight! You're unstoppable!"
    ),

    # Goals
    "first_goal": AchievementDefinition(
        achievement_id="first_goal",
        name="Goal Getter! 🎯",
        description="Achieve your first therapy goal",
        icon="🎯",
        category=AchievementCategory.GOALS,
        tier=AchievementTier.GOLD,
        requirement_type="goal_achieved",
        requirement_value=1,
        points=100,
        reward_message="You reached your first goal! Incredible progress!"
    ),

    # Communication
    "first_vocalization": AchievementDefinition(
        achievement_id="first_vocalization",
        name="Finding My Voice 🎤",
        description="First spontaneous vocalization during session",
        icon="🎤",
        category=AchievementCategory.COMMUNICATION,
        tier=AchievementTier.GOLD,
        requirement_type="manual_unlock",
        requirement_value=1,
        points=100,
        reward_message="You used your voice! That's wonderful!"
    ),

    # Social
    "turn_taking_pro": AchievementDefinition(
        achievement_id="turn_taking_pro",
        name="Turn-Taking Pro 🔄",
        description="Complete 5 turn-taking activities",
        icon="🔄",
        category=AchievementCategory.SOCIAL,
        tier=AchievementTier.SILVER,
        requirement_type="activity_count",
        requirement_value=5,
        points=75,
        reward_message="You're great at taking turns!"
    )
}


class UnlockedAchievement(BaseModel):
    """Achievement that a child has unlocked"""
    unlock_id: str = Field(description="Unique unlock ID")
    child_id: str
    achievement_id: str
    achievement_name: str
    achievement_icon: str

    # Unlock details
    unlocked_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    unlocked_by: str = Field(description="How it was unlocked: automatic or manual")
    session_id: Optional[str] = Field(None, description="Session during which unlocked")

    # Rewards
    points_awarded: int
    seen_by_child: bool = Field(default=False, description="Has child seen the achievement")


class ChildProgress(BaseModel):
    """Overall gamification progress for a child"""
    child_id: str
    total_points: int = Field(default=0)
    total_achievements: int = Field(default=0)

    # Streaks
    current_streak_days: int = Field(default=0)
    longest_streak_days: int = Field(default=0)
    last_session_date: Optional[str] = None

    # Session stats
    total_sessions: int = Field(default=0)
    total_activities_completed: int = Field(default=0)
    total_goals_achieved: int = Field(default=0)

    # Level (based on points)
    level: int = Field(default=1)
    points_to_next_level: int = Field(default=100)

    # Updated
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class RewardItem(BaseModel):
    """Virtual reward item that can be collected"""
    reward_id: str
    name: str
    description: str
    icon: str
    rarity: str = Field(description="common, rare, epic, legendary")
    points_cost: int = Field(description="Points needed to unlock")


class UnlockAchievementRequest(BaseModel):
    """Request to unlock an achievement"""
    child_id: str
    achievement_id: str
    session_id: Optional[str] = None
    unlocked_by: str = "manual"


class UpdateProgressRequest(BaseModel):
    """Request to update child's progress"""
    child_id: str
    sessions_increment: int = 0
    activities_increment: int = 0
    goals_increment: int = 0
    update_streak: bool = False

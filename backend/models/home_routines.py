"""
Home Routines Models

Supports generalization of music therapy to home environment.
Provides structured music routines for daily activities and transitions.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import time, datetime
from enum import Enum


class RoutineType(str, Enum):
    """Types of home routines"""
    DAILY = "daily"              # Daily recurring (wake up, meals, bedtime)
    TRANSITION = "transition"    # Transition activities (leaving house, etc.)
    CALMING = "calming"          # Calming/regulation routines
    ACTIVITY = "activity"        # Activity-specific (homework, bath time)
    CUSTOM = "custom"            # Custom parent-defined


class TimeOfDay(str, Enum):
    """Time of day categories"""
    MORNING = "morning"          # Wake up, breakfast
    MIDDAY = "midday"            # Lunch, afternoon
    EVENING = "evening"          # Dinner, evening activities
    BEDTIME = "bedtime"          # Bedtime routine
    ANYTIME = "anytime"          # Flexible timing


class HomeRoutine(BaseModel):
    """Individual home routine definition"""
    routine_id: str = Field(description="Unique routine identifier")
    child_id: str = Field(description="Associated child ID")

    # Routine details
    name: str = Field(description="Routine name", max_length=100)
    routine_type: RoutineType
    time_of_day: TimeOfDay
    description: str = Field(description="What this routine is for")

    # Music configuration
    music_style: str = Field(description="calm, happy, or energetic")
    duration_minutes: int = Field(description="How long to play", ge=1, le=60)

    # Schedule
    scheduled_time: Optional[str] = Field(None, description="HH:MM format (e.g., '07:30')")
    days_of_week: List[str] = Field(
        default_factory=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        description="Days this routine is active"
    )

    # Visual supports
    icon: str = Field(default="🎵", description="Emoji icon for visual schedule")
    color: str = Field(default="blue", description="Card color for visual")

    # Status
    active: bool = Field(default=True, description="Is this routine currently in use")
    created_date: str = Field(default_factory=lambda: datetime.now().isoformat())

    # Parent notes
    notes: Optional[str] = Field(None, description="Parent observations or adjustments")


class MusicPlaylist(BaseModel):
    """Exportable music playlist"""
    playlist_id: str = Field(description="Unique playlist ID")
    child_id: str = Field(description="Associated child ID")

    # Playlist details
    name: str = Field(description="Playlist name", max_length=100)
    description: str = Field(description="What this playlist is for")
    music_style: str = Field(description="calm, happy, or energetic")

    # Tracks
    tracks: List[Dict[str, str]] = Field(
        default_factory=list,
        description="List of music tracks with name and file"
    )

    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.now().isoformat())
    session_id: Optional[str] = Field(None, description="Source session if exported from session")

    # Sharing
    qr_code_data: Optional[str] = Field(None, description="Base64 QR code image")
    share_url: Optional[str] = Field(None, description="Shareable URL")


class CreateRoutineRequest(BaseModel):
    """Request to create a home routine"""
    child_id: str
    name: str = Field(max_length=100)
    routine_type: RoutineType
    time_of_day: TimeOfDay
    description: str
    music_style: str
    duration_minutes: int = Field(ge=1, le=60)
    scheduled_time: Optional[str] = None
    days_of_week: List[str] = Field(default_factory=list)
    icon: str = Field(default="🎵")
    color: str = Field(default="blue")
    notes: Optional[str] = None


class UpdateRoutineRequest(BaseModel):
    """Request to update a home routine"""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    music_style: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=60)
    scheduled_time: Optional[str] = None
    days_of_week: Optional[List[str]] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class CreatePlaylistRequest(BaseModel):
    """Request to create/export a playlist"""
    child_id: str
    name: str = Field(max_length=100)
    description: str
    music_style: str
    session_id: Optional[str] = None


# Predefined routine templates
ROUTINE_TEMPLATES = {
    "morning": [
        {
            "name": "Wake Up Routine",
            "routine_type": "daily",
            "time_of_day": "morning",
            "description": "Gentle music to start the day",
            "music_style": "calm",
            "duration_minutes": 10,
            "scheduled_time": "07:00",
            "icon": "☀️",
            "color": "yellow"
        },
        {
            "name": "Breakfast Time",
            "routine_type": "daily",
            "time_of_day": "morning",
            "description": "Upbeat music during breakfast",
            "music_style": "happy",
            "duration_minutes": 15,
            "scheduled_time": "07:30",
            "icon": "🍳",
            "color": "orange"
        }
    ],
    "transitions": [
        {
            "name": "Getting Dressed",
            "routine_type": "transition",
            "time_of_day": "anytime",
            "description": "Music to help with dressing routine",
            "music_style": "happy",
            "duration_minutes": 5,
            "icon": "👕",
            "color": "blue"
        },
        {
            "name": "Leaving the House",
            "routine_type": "transition",
            "time_of_day": "anytime",
            "description": "Transition music before going out",
            "music_style": "energetic",
            "duration_minutes": 3,
            "icon": "🚪",
            "color": "green"
        },
        {
            "name": "Coming Home",
            "routine_type": "transition",
            "time_of_day": "anytime",
            "description": "Calming music after arriving home",
            "music_style": "calm",
            "duration_minutes": 5,
            "icon": "🏠",
            "color": "purple"
        }
    ],
    "bedtime": [
        {
            "name": "Bedtime Routine",
            "routine_type": "daily",
            "time_of_day": "bedtime",
            "description": "Calming music for sleep preparation",
            "music_style": "calm",
            "duration_minutes": 20,
            "scheduled_time": "19:30",
            "icon": "🌙",
            "color": "indigo"
        }
    ],
    "calming": [
        {
            "name": "Emotional Regulation",
            "routine_type": "calming",
            "time_of_day": "anytime",
            "description": "Use when child needs to calm down",
            "music_style": "calm",
            "duration_minutes": 10,
            "icon": "🧘",
            "color": "blue"
        },
        {
            "name": "Sensory Break",
            "routine_type": "calming",
            "time_of_day": "anytime",
            "description": "Quiet music during sensory overload",
            "music_style": "calm",
            "duration_minutes": 15,
            "icon": "🎧",
            "color": "purple"
        }
    ]
}

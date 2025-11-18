"""
Session Notes Models

Allows therapists to capture qualitative observations during therapy sessions.
Complements quantitative data (goals, engagement) with clinical insights.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class NoteType(str, Enum):
    """Types of session notes"""
    OBSERVATION = "observation"      # General observation
    BREAKTHROUGH = "breakthrough"    # Positive milestone or progress
    CHALLENGE = "challenge"          # Difficulty or struggle
    SAFETY = "safety"                # Safety concern or alert
    STRATEGY = "strategy"            # Intervention strategy used
    RESPONSE = "response"            # Child's specific response


class SessionNote(BaseModel):
    """Individual session note/observation"""
    note_id: str = Field(description="Unique note identifier")
    session_id: str = Field(description="Associated session ID")
    child_id: str = Field(description="Associated child ID")

    # Note content
    note_type: NoteType = Field(description="Type of note")
    content: str = Field(
        description="Note content",
        min_length=1,
        max_length=1000
    )

    # Context
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="When note was recorded"
    )
    session_time_elapsed: Optional[int] = Field(
        None,
        description="Seconds elapsed in session when note was created"
    )

    # Session context (optional)
    music_style: Optional[str] = Field(None, description="Music playing when note was created")
    engagement_level: Optional[str] = Field(None, description="Engagement level at time of note")
    session_phase: Optional[str] = Field(None, description="Session phase (hello/activity/goodbye)")

    # Metadata
    created_by: Optional[str] = Field(None, description="User who created the note")
    tags: List[str] = Field(default_factory=list, description="Optional tags for categorization")


class CreateNoteRequest(BaseModel):
    """Request to create a session note"""
    session_id: str
    child_id: str
    note_type: NoteType
    content: str = Field(min_length=1, max_length=1000)
    session_time_elapsed: Optional[int] = None
    music_style: Optional[str] = None
    engagement_level: Optional[str] = None
    session_phase: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class UpdateNoteRequest(BaseModel):
    """Request to update a session note"""
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    note_type: Optional[NoteType] = None
    tags: Optional[List[str]] = None


class SessionNotesSummary(BaseModel):
    """Summary of session notes"""
    session_id: str
    total_notes: int
    notes_by_type: dict
    breakthrough_moments: List[SessionNote]
    challenges: List[SessionNote]
    safety_concerns: List[SessionNote]
    all_notes: List[SessionNote]

"""
Interactive Activities Models

Turn-taking activities to build communication and social interaction skills.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class ActivityType(str, Enum):
    """Types of interactive activities"""
    DRUM_CIRCLE = "drum_circle"           # Taking turns on drums/percussion
    CALL_RESPONSE = "call_response"       # Singing call-and-response
    INSTRUMENT_PASS = "instrument_pass"   # Passing instruments in circle
    RHYTHM_COPY = "rhythm_copy"          # Copy the rhythm game
    FREEZE_DANCE = "freeze_dance"        # Music starts/stops, freeze on stop
    SOUND_HUNT = "sound_hunt"            # Find the sound game
    SONG_CHOICE = "song_choice"          # Child chooses next song


class TurnStatus(str, Enum):
    """Status of a turn"""
    WAITING = "waiting"       # Waiting for turn
    ACTIVE = "active"         # Currently their turn
    COMPLETED = "completed"   # Turn completed
    SKIPPED = "skipped"       # Turn skipped (optional participation)


class ActivityDefinition(BaseModel):
    """Pre-defined activity template"""
    activity_type: ActivityType
    name: str = Field(description="Display name")
    description: str = Field(description="How to play")
    icon: str = Field(description="Emoji icon")
    color: str = Field(description="Theme color")

    # Gameplay
    min_participants: int = Field(default=2, description="Minimum participants")
    max_participants: int = Field(default=6, description="Maximum participants")
    turn_duration_seconds: int = Field(default=10, description="Suggested turn length")
    supports_parallel: bool = Field(default=False, description="Can multiple play at once")

    # Clinical goals
    targets_skills: List[str] = Field(
        default_factory=list,
        description="Skills targeted: turn_taking, joint_attention, imitation, etc."
    )


# Pre-defined activity templates
ACTIVITY_TEMPLATES: Dict[str, ActivityDefinition] = {
    "drum_circle": ActivityDefinition(
        activity_type=ActivityType.DRUM_CIRCLE,
        name="Drum Circle",
        description="Take turns playing the drum. Therapist models rhythm, child imitates.",
        icon="🥁",
        color="orange",
        turn_duration_seconds=8,
        targets_skills=["turn_taking", "joint_attention", "imitation", "motor_skills"]
    ),
    "call_response": ActivityDefinition(
        activity_type=ActivityType.CALL_RESPONSE,
        name="Sing With Me",
        description="Therapist sings a phrase, child responds (or echoes).",
        icon="🎤",
        color="blue",
        turn_duration_seconds=5,
        targets_skills=["turn_taking", "vocalization", "imitation", "joint_attention"]
    ),
    "instrument_pass": ActivityDefinition(
        activity_type=ActivityType.INSTRUMENT_PASS,
        name="Pass the Shaker",
        description="Pass instrument around circle. Play when you receive it.",
        icon="🎺",
        color="purple",
        turn_duration_seconds=6,
        targets_skills=["turn_taking", "joint_attention", "social_engagement"]
    ),
    "rhythm_copy": ActivityDefinition(
        activity_type=ActivityType.RHYTHM_COPY,
        name="Copy My Rhythm",
        description="Therapist claps/taps rhythm, child copies.",
        icon="👏",
        color="green",
        turn_duration_seconds=10,
        targets_skills=["imitation", "auditory_processing", "attention"]
    ),
    "freeze_dance": ActivityDefinition(
        activity_type=ActivityType.FREEZE_DANCE,
        name="Freeze Dance",
        description="Dance when music plays, freeze when it stops!",
        icon="🕺",
        color="pink",
        turn_duration_seconds=15,
        supports_parallel=True,
        targets_skills=["motor_skills", "attention", "inhibitory_control", "joint_attention"]
    ),
    "song_choice": ActivityDefinition(
        activity_type=ActivityType.SONG_CHOICE,
        name="You Choose!",
        description="Child picks next song from visual choices.",
        icon="🎵",
        color="yellow",
        turn_duration_seconds=5,
        targets_skills=["communication", "choice_making", "joint_attention"]
    )
}


class ActivitySession(BaseModel):
    """An active or completed activity session"""
    activity_session_id: str = Field(description="Unique session ID")
    session_id: str = Field(description="Parent therapy session ID")
    child_id: str = Field(description="Child participant")

    # Activity details
    activity_type: ActivityType
    activity_name: str

    # Participants
    participants: List[str] = Field(
        default_factory=list,
        description="List of participant names/IDs (child, parent, therapist)"
    )

    # Status
    status: str = Field(default="active", description="active, completed, cancelled")
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None

    # Turns tracking
    current_turn_index: int = Field(default=0, description="Index of whose turn it is")
    total_turns_taken: int = Field(default=0)

    # Outcome
    engagement_rating: Optional[int] = Field(None, ge=1, le=5, description="1-5 rating")
    therapist_notes: Optional[str] = None


class TurnRecord(BaseModel):
    """Record of a single turn in an activity"""
    turn_id: str = Field(description="Unique turn ID")
    activity_session_id: str = Field(description="Parent activity session")

    # Turn details
    participant_name: str = Field(description="Who took this turn")
    turn_number: int = Field(description="Turn sequence number")
    turn_status: TurnStatus

    # Timing
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None

    # Observations
    engagement_level: Optional[str] = Field(None, description="high, medium, low")
    completed_successfully: bool = Field(default=True)
    notes: Optional[str] = Field(None, description="Brief observation")


class StartActivityRequest(BaseModel):
    """Request to start a new activity"""
    session_id: str
    child_id: str
    activity_type: ActivityType
    participants: List[str] = Field(description="Names of participants in order")


class RecordTurnRequest(BaseModel):
    """Request to record a turn completion"""
    activity_session_id: str
    participant_name: str
    turn_status: TurnStatus
    engagement_level: Optional[str] = None
    completed_successfully: bool = True
    notes: Optional[str] = None


class CompleteActivityRequest(BaseModel):
    """Request to complete an activity"""
    activity_session_id: str
    engagement_rating: int = Field(ge=1, le=5)
    therapist_notes: Optional[str] = None

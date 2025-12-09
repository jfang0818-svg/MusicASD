"""
Activity Template Models for AI-Generated ASD Music Therapy Activities

Based on evidence-based research (2024):
- Rhythm-based interventions: g=1.5 effect size for communication/social
- Active music-making > passive listening
- Short sessions (5-15 min) match attention spans
- Multi-sensory engagement activates multiple brain systems
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


# ===================== ENUMS =====================

class ActivityCategory(str, Enum):
    """Evidence-based activity categories for ASD music therapy"""
    RHYTHMIC = "rhythmic"           # Rhythm entrainment, motor timing
    SOCIAL = "social"               # Turn-taking, joint attention
    SENSORY = "sensory"             # Regulation, calming, arousal modulation
    COMMUNICATION = "communication" # Vocalization, language, verbal cues
    EMOTIONAL = "emotional"         # Expression, identification, regulation
    COGNITIVE = "cognitive"         # Focus, memory, sequencing


class DifficultyLevel(str, Enum):
    """Activity difficulty levels"""
    INTRODUCTORY = "introductory"   # First time, building comfort
    BEGINNER = "beginner"           # Basic participation
    INTERMEDIATE = "intermediate"   # Active engagement expected
    ADVANCED = "advanced"           # Complex sequences/interactions


class SensoryIntensity(str, Enum):
    """Sensory intensity levels"""
    LOW = "low"           # Minimal stimulation, quiet, slow
    MODERATE = "moderate" # Balanced stimulation
    HIGH = "high"         # Active, louder, faster
    VARIABLE = "variable" # Changes throughout activity


class ParticipantRole(str, Enum):
    """Roles in activity"""
    CHILD = "child"
    CAREGIVER = "caregiver"
    THERAPIST = "therapist"
    PEER = "peer"


# ===================== SUB-MODELS =====================

class ActivityPhase(BaseModel):
    """A phase/step within an activity"""
    phase_number: int
    name: str
    duration_seconds: int = Field(ge=10, le=300)
    description: str
    caregiver_instruction: str
    music_cue: Optional[str] = None  # e.g., "Play calming music", "Pause music"
    visual_support: Optional[str] = None  # Description of visual aid if needed
    adaptations: Optional[Dict[str, str]] = None  # Difficulty level -> adaptation


class TherapeuticGoal(BaseModel):
    """A therapeutic goal with evidence base"""
    goal: str
    description: str
    evidence_base: Optional[str] = None  # Research reference


class SensoryRequirements(BaseModel):
    """Sensory profile requirements for activity"""
    auditory_intensity: SensoryIntensity = SensoryIntensity.MODERATE
    visual_intensity: SensoryIntensity = SensoryIntensity.MODERATE
    tactile_involvement: bool = False
    movement_required: bool = False
    warnings: List[str] = []  # Potential triggers


class MaterialItem(BaseModel):
    """A material/prop for the activity"""
    name: str
    required: bool = True
    alternatives: List[str] = []


# ===================== MAIN ACTIVITY TEMPLATE =====================

class ActivityTemplate(BaseModel):
    """
    Complete activity template for ASD music therapy
    Designed for AI generation and caregiver customization
    """
    # Identity
    id: str = Field(description="Unique identifier")
    name: str = Field(max_length=100)
    description: str = Field(max_length=500)
    icon: str = Field(default="🎵", max_length=10)

    # Classification
    category: ActivityCategory
    subcategory: str = Field(max_length=50)
    tags: List[str] = []

    # Therapeutic Goals (evidence-based)
    primary_goals: List[TherapeuticGoal]
    secondary_goals: List[TherapeuticGoal] = []

    # Activity Structure
    phases: List[ActivityPhase]
    total_duration_minutes: int = Field(ge=1, le=30)

    # Adaptability
    difficulty_levels: List[DifficultyLevel] = [DifficultyLevel.BEGINNER]
    min_age: int = Field(default=3, ge=2, le=18)
    max_age: int = Field(default=12, ge=2, le=18)

    # Sensory Profile
    sensory_requirements: SensoryRequirements

    # Music Integration
    music_style: str  # Maps to MusicStyle enum
    tempo_bpm: int = Field(default=100, ge=40, le=180)
    volume_level: str = Field(default="moderate")  # soft, moderate, dynamic

    # Participants
    min_participants: int = Field(default=2, ge=1, le=10)
    max_participants: int = Field(default=4, ge=1, le=10)
    participant_roles: List[ParticipantRole] = [ParticipantRole.CHILD, ParticipantRole.CAREGIVER]

    # Caregiver Support
    setup_instructions: str = ""
    caregiver_tips: List[str] = []
    adaptation_suggestions: List[str] = []
    warning_signs: List[str] = []  # Signs of overstimulation

    # Materials
    materials: List[MaterialItem] = []

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = "ai_generator"
    source_child_id: Optional[str] = None  # If generated for specific child
    is_template: bool = True  # True = global template, False = child-specific
    version: str = "1.0"

    class Config:
        json_schema_extra = {
            "example": {
                "id": "drum_echo_001",
                "name": "Drum Echo Game",
                "description": "Call-and-response rhythm game to build joint attention and motor timing",
                "icon": "🥁",
                "category": "rhythmic",
                "subcategory": "call_response",
                "tags": ["drums", "imitation", "turn-taking"],
                "primary_goals": [
                    {"goal": "Joint attention", "description": "Focus on shared musical activity"}
                ],
                "phases": [
                    {
                        "phase_number": 1,
                        "name": "Introduction",
                        "duration_seconds": 30,
                        "description": "Show the drum and demonstrate a simple beat",
                        "caregiver_instruction": "Tap the drum slowly 3 times. Say 'Your turn!'"
                    }
                ],
                "total_duration_minutes": 5,
                "sensory_requirements": {
                    "auditory_intensity": "moderate",
                    "movement_required": True
                },
                "music_style": "social_interactive",
                "tempo_bpm": 80
            }
        }


# ===================== API REQUEST/RESPONSE MODELS =====================

class GenerateActivityRequest(BaseModel):
    """Request to generate a new activity via AI"""
    child_id: Optional[str] = None  # If generating for specific child
    category: Optional[ActivityCategory] = None
    therapeutic_goals: List[str] = []  # Goals to focus on
    duration_minutes: int = Field(default=5, ge=2, le=15)
    difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
    sensory_considerations: Optional[str] = None  # e.g., "sound sensitive"
    available_materials: List[str] = []  # What caregiver has available
    additional_context: Optional[str] = None  # Any other preferences


class GenerateActivityResponse(BaseModel):
    """Response with generated activity"""
    activity: ActivityTemplate
    reasoning: str  # AI explanation of why this activity fits
    alternatives: List[str] = []  # Other activity ideas


class ActivityChatRequest(BaseModel):
    """Chat request for activity generation wizard"""
    child_id: Optional[str] = None
    conversation_history: List[Dict[str, str]]  # [{"role": "user/assistant", "content": "..."}]
    user_message: str


class ActivityChatResponse(BaseModel):
    """Chat response from activity generation wizard"""
    message: str
    activity: Optional[ActivityTemplate] = None  # Included when ready
    follow_up_questions: List[str] = []
    is_complete: bool = False


class SaveActivityRequest(BaseModel):
    """Request to save a generated activity"""
    activity: ActivityTemplate
    save_as_global: bool = True  # False = save only for this child


class ListActivitiesRequest(BaseModel):
    """Request to list activities"""
    category: Optional[ActivityCategory] = None
    child_id: Optional[str] = None  # Filter by child compatibility
    tags: List[str] = []
    difficulty: Optional[DifficultyLevel] = None
    limit: int = Field(default=20, ge=1, le=100)

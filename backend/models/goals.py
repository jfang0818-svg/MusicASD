"""
Therapy Goal Tracking Models

Supports individualized goal-based therapy for ASD children.
Goals are measurable, trackable, and aligned with evidence-based interventions.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class GoalCategory(str, Enum):
    """Evidence-based goal categories for ASD music therapy"""
    COMMUNICATION = "communication"
    JOINT_ATTENTION = "joint_attention"
    EMOTIONAL_REGULATION = "emotional_regulation"
    SOCIAL_SKILLS = "social_skills"
    MOTOR_SKILLS = "motor_skills"
    SENSORY_PROCESSING = "sensory_processing"


class MeasurementType(str, Enum):
    """How to measure goal progress"""
    COUNT = "count"  # Count occurrences (e.g., vocalizations)
    DURATION = "duration"  # Duration in seconds (e.g., attention span)
    FREQUENCY = "frequency"  # Times per session
    QUALITY_SCALE = "quality_1_5"  # 1-5 quality rating
    PERCENTAGE = "percentage"  # 0-100%
    BOOLEAN = "yes_no"  # Yes/No achievement


class GoalStatus(str, Enum):
    """Goal achievement status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    REVISED = "revised"
    DISCONTINUED = "discontinued"


class TherapyGoal(BaseModel):
    """Individual therapy goal definition"""
    goal_id: str = Field(description="Unique goal identifier")
    child_id: str = Field(description="Associated child profile ID")
    category: GoalCategory = Field(description="Goal category")

    # Goal definition
    title: str = Field(
        description="Short goal title",
        max_length=100,
        examples=["Increase vocalizations during music"]
    )
    description: str = Field(
        description="Detailed goal description",
        examples=["Child will produce 5+ vocalizations per session during musical activities"]
    )

    # Measurement
    measurement_type: MeasurementType = Field(description="How to measure progress")
    baseline: float = Field(
        description="Starting baseline value",
        examples=[2.0]  # e.g., 2 vocalizations at baseline
    )
    target: float = Field(
        description="Target value to achieve",
        examples=[5.0]  # e.g., 5 vocalizations target
    )
    unit: str = Field(
        description="Unit of measurement",
        examples=["vocalizations", "seconds", "times", "rating"]
    )

    # Status and tracking
    status: GoalStatus = GoalStatus.IN_PROGRESS
    current_value: float = Field(
        default=0.0,
        description="Current progress value"
    )
    sessions_tracked: int = Field(
        default=0,
        description="Number of sessions tracked"
    )

    # Metadata
    created_date: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Goal creation date"
    )
    target_date: Optional[str] = Field(
        None,
        description="Target achievement date (optional)"
    )
    notes: Optional[str] = Field(
        None,
        description="Additional notes or context"
    )

    # Clinical context
    intervention_strategies: List[str] = Field(
        default_factory=list,
        description="Strategies to support this goal",
        examples=[["Use call-and-response songs", "Pause and wait for child response"]]
    )


class GoalProgress(BaseModel):
    """Single progress measurement for a goal"""
    progress_id: str = Field(description="Unique progress entry ID")
    goal_id: str = Field(description="Associated goal ID")
    session_id: str = Field(description="Associated session ID")

    # Measurement
    measured_value: float = Field(description="Value measured in this session")
    measurement_type: MeasurementType
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat()
    )

    # Context
    notes: Optional[str] = Field(
        None,
        description="Observation notes for this measurement"
    )
    music_style_used: Optional[str] = Field(
        None,
        description="Music style during measurement"
    )
    engagement_level: Optional[str] = Field(
        None,
        description="Child's engagement level during measurement"
    )

    # Analysis
    relative_to_baseline: Optional[float] = Field(
        None,
        description="Percentage change from baseline"
    )
    relative_to_target: Optional[float] = Field(
        None,
        description="Percentage progress toward target"
    )


class GoalSummary(BaseModel):
    """Summary statistics for a goal"""
    goal: TherapyGoal
    progress_entries: List[GoalProgress]

    # Statistics
    total_sessions: int
    average_value: float
    latest_value: float
    improvement_percent: float  # From baseline
    target_progress_percent: float  # Progress toward target

    # Trend analysis
    trend: Literal["improving", "stable", "declining", "insufficient_data"]
    sessions_above_target: int
    sessions_below_target: int

    # Recommendations
    ai_recommendation: Optional[str] = Field(
        None,
        description="AI-generated recommendation based on progress"
    )


class CreateGoalRequest(BaseModel):
    """Request to create a new goal"""
    child_id: str
    category: GoalCategory
    title: str = Field(max_length=100)
    description: str
    measurement_type: MeasurementType
    baseline: float
    target: float
    unit: str
    target_date: Optional[str] = None
    notes: Optional[str] = None
    intervention_strategies: List[str] = Field(default_factory=list)


class UpdateGoalRequest(BaseModel):
    """Request to update a goal"""
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    target: Optional[float] = None
    target_date: Optional[str] = None
    status: Optional[GoalStatus] = None
    notes: Optional[str] = None
    intervention_strategies: Optional[List[str]] = None


class RecordProgressRequest(BaseModel):
    """Request to record goal progress"""
    goal_id: str
    session_id: str
    measured_value: float
    notes: Optional[str] = None
    music_style_used: Optional[str] = None
    engagement_level: Optional[str] = None


# Predefined goal templates for quick setup
GOAL_TEMPLATES = {
    GoalCategory.COMMUNICATION: [
        {
            "title": "Increase vocalizations",
            "description": "Child will produce spontaneous vocalizations during musical activities",
            "measurement_type": MeasurementType.COUNT,
            "unit": "vocalizations",
            "baseline": 2.0,
            "target": 5.0,
            "intervention_strategies": [
                "Use call-and-response songs",
                "Pause and wait for child to vocalize",
                "Model vocalizations during songs"
            ]
        },
        {
            "title": "Improve speech clarity",
            "description": "Child will produce clear, understandable words during singing",
            "measurement_type": MeasurementType.QUALITY_SCALE,
            "unit": "clarity rating (1-5)",
            "baseline": 2.0,
            "target": 4.0,
            "intervention_strategies": [
                "Use slow-tempo songs with clear lyrics",
                "Repeat key words multiple times",
                "Encourage mouth movements"
            ]
        }
    ],
    GoalCategory.JOINT_ATTENTION: [
        {
            "title": "Increase eye contact duration",
            "description": "Child will maintain eye contact with caregiver during musical activities",
            "measurement_type": MeasurementType.DURATION,
            "unit": "seconds",
            "baseline": 3.0,
            "target": 10.0,
            "intervention_strategies": [
                "Position instrument at eye level",
                "Sing facing child",
                "Use animated facial expressions"
            ]
        },
        {
            "title": "Respond to name calls",
            "description": "Child will respond when name is called during music",
            "measurement_type": MeasurementType.FREQUENCY,
            "unit": "responses per session",
            "baseline": 1.0,
            "target": 4.0,
            "intervention_strategies": [
                "Incorporate child's name in songs",
                "Pair name with favorite instrument",
                "Wait for response before continuing"
            ]
        }
    ],
    GoalCategory.EMOTIONAL_REGULATION: [
        {
            "title": "Reduce meltdown frequency",
            "description": "Child will experience fewer meltdowns during session",
            "measurement_type": MeasurementType.COUNT,
            "unit": "meltdowns",
            "baseline": 3.0,
            "target": 1.0,
            "intervention_strategies": [
                "Use calming music proactively",
                "Provide predictable routine",
                "Offer sensory breaks"
            ]
        },
        {
            "title": "Increase self-regulation time",
            "description": "Child will self-regulate after overstimulation",
            "measurement_type": MeasurementType.DURATION,
            "unit": "seconds to calm",
            "baseline": 120.0,
            "target": 60.0,
            "intervention_strategies": [
                "Teach deep breathing to music",
                "Use slow tempo for calming",
                "Create quiet space"
            ]
        }
    ],
    GoalCategory.SOCIAL_SKILLS: [
        {
            "title": "Engage in turn-taking",
            "description": "Child will successfully complete turn-taking exchanges",
            "measurement_type": MeasurementType.COUNT,
            "unit": "successful turns",
            "baseline": 1.0,
            "target": 5.0,
            "intervention_strategies": [
                "Use drum turn-taking games",
                "Visual 'your turn/my turn' cues",
                "Celebrate each successful turn"
            ]
        }
    ],
    GoalCategory.MOTOR_SKILLS: [
        {
            "title": "Improve rhythm imitation",
            "description": "Child will imitate simple rhythmic patterns",
            "measurement_type": MeasurementType.PERCENTAGE,
            "unit": "accuracy percentage",
            "baseline": 30.0,
            "target": 70.0,
            "intervention_strategies": [
                "Start with 2-beat patterns",
                "Use visual rhythm cards",
                "Gradually increase complexity"
            ]
        }
    ],
    GoalCategory.SENSORY_PROCESSING: [
        {
            "title": "Tolerate louder volumes",
            "description": "Child will tolerate moderate volume levels without distress",
            "measurement_type": MeasurementType.QUALITY_SCALE,
            "unit": "tolerance rating (1-5)",
            "baseline": 2.0,
            "target": 4.0,
            "intervention_strategies": [
                "Gradually increase volume",
                "Give child volume control",
                "Pair with calming visuals"
            ]
        }
    ]
}

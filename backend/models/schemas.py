"""
Pydantic Models for API Request/Response Validation
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator

# ===================== ENUMS =====================

class EngagementLevel(str, Enum):
    """Valid engagement levels"""
    LOW = "LOW"
    MED = "MED"
    HIGH = "HIGH"

class MusicStyle(str, Enum):
    """ASD-specific therapeutic music categories"""
    # Meltdown prevention, self-regulation, transitions
    CALMING_REGULATION = "calming_regulation"
    # Task engagement, concentration
    FOCUS_ATTENTION = "focus_attention"
    # Turn-taking, joint attention, social skills
    SOCIAL_INTERACTIVE = "social_interactive"
    # Physical activity, gross motor skills
    MOVEMENT_MOTOR = "movement_motor"
    # For hypo-sensitive individuals needing stimulation
    SENSORY_SEEKING = "sensory_seeking"
    # For hyper-sensitive individuals needing gentle input
    SENSORY_SOOTHING = "sensory_soothing"
    # Bedtime routines, relaxation
    SLEEP_REST = "sleep_rest"
    # Activity changes, preparing for new activities
    TRANSITION = "transition"

class AudioMode(str, Enum):
    """Audio playback modes"""
    FILES = "files"
    GENERATED = "generated"

class SessionStatus(str, Enum):
    """Session status values"""
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"

# ===================== ENGAGEMENT MODELS =====================

class EngagementUpdate(BaseModel):
    """Update engagement level"""
    level: EngagementLevel

    class Config:
        json_schema_extra = {
            "example": {
                "level": "MED"
            }
        }

class EngagementResponse(BaseModel):
    """Engagement status response"""
    level: EngagementLevel
    timestamp: datetime
    previous: Optional[EngagementLevel] = None

# ===================== MUSIC MODELS =====================

class MusicRequest(BaseModel):
    """Request to play music"""
    style: MusicStyle  # Primary style for playback
    volume: float = Field(default=0.7, ge=0.0, le=1.0)
    file: Optional[str] = None
    categories: Optional[List[MusicStyle]] = None  # Multiple categories for the music file

    class Config:
        json_schema_extra = {
            "example": {
                "style": "calming_regulation",
                "volume": 0.7,
                "file": "ocean_waves.mp3",
                "categories": ["calming_regulation", "sensory_soothing"]
            }
        }

class GenerateMusicRequest(BaseModel):
    """Request to generate synthetic music"""
    style: MusicStyle = MusicStyle.CALMING_REGULATION
    categories: Optional[List[MusicStyle]] = None  # Multiple categories for generated music
    duration: float = Field(default=5.0, ge=1.0, le=30.0)
    filename: str = Field(default="generated", max_length=50)
    tempo: int = Field(default=120, ge=60, le=200)
    key: str = Field(default="C", pattern="^[A-G]$")

    @validator('filename')
    def validate_filename(cls, v):
        """Ensure filename is safe"""
        return v.replace("/", "_").replace("\\", "_").replace("..", "_")

    class Config:
        json_schema_extra = {
            "example": {
                "style": "calming_regulation",
                "categories": ["calming_regulation", "sleep_rest"],
                "duration": 10.0,
                "filename": "relaxing_tone",
                "tempo": 80,
                "key": "C"
            }
        }

class MusicStatusResponse(BaseModel):
    """Music playback status"""
    playing: bool
    current: Optional[str] = None
    position: int = 0
    volume: Optional[float] = None
    style: Optional[MusicStyle] = None
    categories: Optional[List[MusicStyle]] = None

class MusicLibraryResponse(BaseModel):
    """Music library information"""
    library: Dict[str, List[Dict[str, Any]]]
    total_files: int
    generated_count: int

# ===================== SESSION MODELS =====================

class SessionLog(BaseModel):
    """Log entry for session events"""
    event: str = Field(..., max_length=200)
    note: Optional[str] = Field(default="", max_length=500)
    engagement: Optional[EngagementLevel] = None
    music_style: Optional[MusicStyle] = None
    suggestion: Optional[str] = None
    caregiver_action: Optional[str] = None
    child_response: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "event": "Music Started",
                "note": "Child showed interest in the melody",
                "engagement": "MED",
                "music_style": "calming_regulation"
            }
        }

class SessionStartResponse(BaseModel):
    """Response when starting a session"""
    status: str
    session_id: str
    timestamp: datetime

class SessionStatusResponse(BaseModel):
    """Current session status"""
    active: bool
    session_id: Optional[str]
    engagement: EngagementLevel
    music_playing: bool
    current_music: Optional[str]
    camera_enabled: bool
    log_count: int
    timestamp: datetime

class SessionLogsResponse(BaseModel):
    """Session logs response"""
    logs: List[Dict[str, Any]]
    count: int
    session_id: Optional[str]

# ===================== CAMERA MODELS =====================

class CameraToggle(BaseModel):
    """Toggle camera state"""
    enabled: bool

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True
            }
        }

class CameraStatusResponse(BaseModel):
    """Camera status response"""
    enabled: bool
    session_active: bool
    timestamp: datetime

# ===================== ANALYTICS MODELS =====================

class DashboardAnalytics(BaseModel):
    """Dashboard analytics data"""
    totalSessions: int
    avgEngagement: float
    totalDuration: float
    activeUsers: int
    musicUsage: Dict[str, int]
    engagementTrends: List[Dict[str, Any]]
    recentSessions: List[Dict[str, Any]]

class SessionSummary(BaseModel):
    """Session summary for analytics"""
    session_id: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    avg_engagement: EngagementLevel
    music_styles_used: List[MusicStyle]
    total_events: int

# ===================== GPT/AI MODELS =====================

class GPTSuggestion(BaseModel):
    """GPT-generated suggestion"""
    suggestion: str
    style: MusicStyle
    phrase: str
    reasoning: Optional[str] = None
    mcp_sequence: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "suggestion": "Try calming music to help regulate",
                "style": "calming_regulation",
                "phrase": "Let's listen to peaceful sounds",
                "reasoning": "High engagement detected, calming music recommended"
            }
        }

class CaregiverAction(BaseModel):
    """Caregiver action on suggestion"""
    action: str = Field(..., max_length=100)
    note: Optional[str] = Field(default="", max_length=500)
    modified_style: Optional[MusicStyle] = None

    class Config:
        json_schema_extra = {
            "example": {
                "action": "accepted",
                "note": "Child responded well",
                "modified_style": "calming_regulation"
            }
        }

# ===================== HEALTH CHECK MODELS =====================

class HealthStatus(BaseModel):
    """Health check status"""
    status: str
    checks: Dict[str, str]
    session_active: bool
    music_files_loaded: int
    generated_tones: int
    timestamp: datetime

class DetailedHealthStatus(BaseModel):
    """Detailed health check with system info"""
    timestamp: datetime
    api: Dict[str, Any]
    audio: Dict[str, Any]
    session: Dict[str, Any]
    storage: Dict[str, Any]
    camera: Dict[str, bool]

# ===================== ERROR MODELS =====================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Invalid request",
                "detail": "Engagement level must be LOW, MED, or HIGH",
                "status_code": 400,
                "timestamp": "2024-01-20T10:30:00"
            }
        }

# ===================== UTILITY MODELS =====================

class SuccessResponse(BaseModel):
    """Generic success response"""
    status: str = "success"
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class FileUploadResponse(BaseModel):
    """Response after file upload"""
    status: str
    file: str
    style: MusicStyle
    path: str
    size: Optional[int] = None

class VolumeControl(BaseModel):
    """Volume control request"""
    volume: float = Field(..., ge=0.0, le=1.0)

    class Config:
        json_schema_extra = {
            "example": {
                "volume": 0.5
            }
        }

# ===================== AUTHENTICATION MODELS =====================

class UserRegister(BaseModel):
    """User registration request"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    name: str = Field(..., description="Parent/Caregiver name")
    phone: Optional[str] = Field(None, description="Phone number")
    is_caregiver: bool = Field(False, description="Is the user a caregiver?")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "parent@example.com",
                "password": "SecurePass123",
                "name": "Jane Doe",
                "phone": "+1234567890",
                "is_caregiver": True
            }
        }

class UserLogin(BaseModel):
    """User login request"""
    email: str
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "parent@example.com",
                "password": "SecurePass123"
            }
        }

class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str

class UserResponse(BaseModel):
    """User profile response"""
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    is_caregiver: bool = False
    subscription_status: str = "trial"  # trial, active, expired
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class SendVerificationCodeRequest(BaseModel):
    """Send verification code request"""
    email: str = Field(..., description="Email address to send verification code")
    is_caregiver: bool = Field(False, description="Is the user a caregiver?")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "parent@example.com",
                "is_caregiver": True
            }
        }

class VerifyCodeRequest(BaseModel):
    """Verify email code request"""
    email: str = Field(..., description="Email address")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "parent@example.com",
                "code": "123456"
            }
        }

class PasswordResetRequest(BaseModel):
    """Request password reset"""
    email: str = Field(..., description="Email address for password reset")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "parent@example.com"
            }
        }

class ResetPasswordRequest(BaseModel):
    """Reset password with token"""
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

    class Config:
        json_schema_extra = {
            "example": {
                "token": "reset_token_here",
                "new_password": "NewSecurePass123"
            }
        }

# ===================== CHILD PROFILE MODELS =====================

class SensorySensitivities(BaseModel):
    """Sensory sensitivities for ASD child"""
    sound_sensitivity: Optional[str] = Field(None, description="Sound sensitivity level (low/medium/high)")
    touch_sensitivity: Optional[str] = Field(None, description="Touch sensitivity level")
    visual_sensitivity: Optional[str] = Field(None, description="Visual sensitivity level")
    loud_noises_trigger: bool = Field(False, description="Are loud noises a trigger?")
    sudden_sounds_trigger: bool = Field(False, description="Are sudden sounds a trigger?")
    specific_triggers: Optional[str] = Field(None, description="Specific sensory triggers")
    calming_sounds: Optional[str] = Field(None, description="Sounds that help calm the child")

    class Config:
        json_schema_extra = {
            "example": {
                "sound_sensitivity": "high",
                "touch_sensitivity": "medium",
                "visual_sensitivity": "low",
                "loud_noises_trigger": True,
                "sudden_sounds_trigger": True,
                "specific_triggers": "High-pitched sounds, sirens",
                "calming_sounds": "White noise, ocean waves"
            }
        }

class CommunicationAbilities(BaseModel):
    """Communication abilities"""
    verbal_communication: str = Field(..., description="Verbal communication level (non-verbal/limited/fluent)")
    speech_clarity: Optional[str] = Field(None, description="Speech clarity (if verbal)")
    uses_aac: bool = Field(False, description="Uses AAC devices?")
    preferred_communication: Optional[str] = Field(None, description="Preferred communication method")

    class Config:
        json_schema_extra = {
            "example": {
                "verbal_communication": "limited",
                "speech_clarity": "Some words, mostly gestures",
                "uses_aac": False,
                "preferred_communication": "Gestures and pointing"
            }
        }

class BehavioralPatterns(BaseModel):
    """Behavioral patterns"""
    repetitive_behaviors: Optional[str] = Field(None, description="Common repetitive behaviors")
    meltdown_triggers: Optional[str] = Field(None, description="Common meltdown triggers")
    calming_activities: Optional[str] = Field(None, description="Activities that help calm")
    attention_span: Optional[str] = Field(None, description="Typical attention span")
    social_interaction: Optional[str] = Field(None, description="Level of social interaction")

    class Config:
        json_schema_extra = {
            "example": {
                "repetitive_behaviors": "Hand flapping, rocking",
                "meltdown_triggers": "Transitions, unexpected changes",
                "calming_activities": "Listening to music, swinging",
                "attention_span": "5-10 minutes for preferred activities",
                "social_interaction": "Prefers parallel play, limited eye contact"
            }
        }

class MusicPreferences(BaseModel):
    """Music preferences"""
    preferred_genres: Optional[List[str]] = Field(None, description="Preferred music genres")
    preferred_instruments: Optional[List[str]] = Field(None, description="Preferred instruments")
    preferred_tempo: Optional[str] = Field(None, description="Preferred tempo (slow/medium/fast)")
    disliked_music: Optional[List[str]] = Field(None, description="Music types that cause distress")
    successful_therapy_music: Optional[str] = Field(None, description="Music that has worked well in therapy")
    negative_reaction_music: Optional[str] = Field(None, description="Music that caused negative reactions")
    custom_hello_song: Optional[str] = Field(None, description="Custom hello song filename for structured sessions")
    custom_goodbye_song: Optional[str] = Field(None, description="Custom goodbye song filename for structured sessions")

    class Config:
        json_schema_extra = {
            "example": {
                "preferred_genres": ["classical", "ambient", "nature sounds"],
                "preferred_instruments": ["piano", "violin", "nature sounds"],
                "preferred_tempo": "slow",
                "disliked_music": ["heavy metal", "rap", "loud drums"],
                "successful_therapy_music": "Mozart piano sonatas, ocean wave recordings",
                "negative_reaction_music": "Fast-paced electronic music",
                "custom_hello_song": "alexs_welcome_song.mp3",
                "custom_goodbye_song": "alexs_goodbye_song.mp3"
            }
        }

class ChildDemographics(BaseModel):
    """Child demographics"""
    name: str = Field(..., description="Child's name")
    age: int = Field(..., ge=0, le=120, description="Child's age")
    gender: Optional[str] = Field(None, description="Gender")
    race: Optional[str] = Field(None, description="Race/Ethnicity")
    diagnosis_date: Optional[str] = Field(None, description="ASD diagnosis date (YYYY-MM-DD)")
    asd_level: Optional[str] = Field(None, description="ASD support level (1/2/3)")
    comorbidities: Optional[List[str]] = Field(None, description="Other diagnoses")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Alex",
                "age": 7,
                "gender": "Male",
                "race": "Asian",
                "diagnosis_date": "2020-03-15",
                "asd_level": "2",
                "comorbidities": ["ADHD", "Anxiety"]
            }
        }

class TherapyGoals(BaseModel):
    """Therapy goals"""
    goals: Optional[List[str]] = Field(None, description="Parent-defined therapy goals")
    focus_areas: Optional[List[str]] = Field(None, description="Areas to focus on")

    class Config:
        json_schema_extra = {
            "example": {
                "goals": ["Improve emotional regulation", "Increase attention span", "Reduce anxiety"],
                "focus_areas": ["Sensory processing", "Social skills", "Communication"]
            }
        }

class ChildProfileCreate(BaseModel):
    """Create child profile"""
    demographics: ChildDemographics
    sensory_sensitivities: Optional[SensorySensitivities] = None
    communication: Optional[CommunicationAbilities] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    music_preferences: Optional[MusicPreferences] = None
    therapy_goals: Optional[TherapyGoals] = None

class ChildProfileUpdate(BaseModel):
    """Update child profile (all fields optional)"""
    demographics: Optional[ChildDemographics] = None
    sensory_sensitivities: Optional[SensorySensitivities] = None
    communication: Optional[CommunicationAbilities] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    music_preferences: Optional[MusicPreferences] = None
    therapy_goals: Optional[TherapyGoals] = None

class ProfileDocument(BaseModel):
    """Document attached to a child profile"""
    filename: str = Field(..., description="Original filename")
    blob_path: str = Field(..., description="Blob storage path")
    file_type: str = Field(..., description="MIME type")
    file_size: int = Field(..., description="File size in bytes")
    uploaded_at: datetime = Field(default_factory=datetime.now, description="Upload timestamp")
    description: Optional[str] = Field(None, description="Optional document description")

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "therapy_report.pdf",
                "blob_path": "documents/user_123/child_456/therapy_report.pdf",
                "file_type": "application/pdf",
                "file_size": 102400,
                "uploaded_at": "2025-01-20T10:00:00Z",
                "description": "Initial assessment report"
            }
        }

class ChildProfileResponse(BaseModel):
    """Child profile response"""
    id: str
    user_id: str
    demographics: ChildDemographics
    sensory_sensitivities: Optional[SensorySensitivities] = None
    communication: Optional[CommunicationAbilities] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    music_preferences: Optional[MusicPreferences] = None
    therapy_goals: Optional[TherapyGoals] = None
    documents: Optional[List[ProfileDocument]] = Field(default_factory=list, description="Attached documents")
    created_at: datetime
    updated_at: datetime

class DocumentUploadResponse(BaseModel):
    """Response after uploading a document"""
    filename: str
    blob_path: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    message: str = "Document uploaded successfully"

# ===================== MUSIC ELEMENT ANALYSIS =====================

class MusicElements(BaseModel):
    """GPT-generated music elements for therapy"""
    tempo_range: str = Field(..., description="Recommended tempo range (e.g., '60-80 BPM')")
    key: str = Field(..., description="Recommended musical key")
    instruments: List[str] = Field(..., description="Recommended instruments")
    dynamics: str = Field(..., description="Dynamics level (soft/moderate/loud)")
    mood: str = Field(..., description="Overall mood")
    avoid_elements: List[str] = Field(..., description="Elements to avoid")
    recommended_duration: str = Field(..., description="Recommended track duration")
    style_tags: List[str] = Field(..., description="Style tags for music generation")
    reasoning: Optional[str] = Field(None, description="GPT reasoning for these choices")

    class Config:
        json_schema_extra = {
            "example": {
                "tempo_range": "60-80 BPM",
                "key": "C major",
                "instruments": ["piano", "soft strings", "nature sounds"],
                "dynamics": "soft to moderate",
                "mood": "calm, soothing",
                "avoid_elements": ["loud drums", "sudden changes", "dissonance"],
                "recommended_duration": "3-5 minutes",
                "style_tags": ["ambient", "classical", "nature"],
                "reasoning": "Based on high sound sensitivity and preference for slow tempo"
            }
        }

class MusicElementsResponse(BaseModel):
    """Music elements analysis response"""
    child_id: str
    elements: MusicElements
    analyzed_at: datetime

# ===================== MUSIC RESPONSE METRICS MODELS =====================

class TaskPersistence(str, Enum):
    """Task persistence levels"""
    NONE = "none"                    # Does not engage with the song
    PARTIAL = "partial"              # Focused for some amount, not consistent
    MAJORITY = "majority"            # Majority of song, with brief distractions
    FULL = "full"                    # Continuously focused for entire duration

class RhythmicSync(str, Enum):
    """Rhythmic synchronization levels"""
    NONE = "none"                    # Does not move rhythmically to the music
    BRIEF = "brief"                  # Moves in time for >5 seconds
    CONTINUOUS = "continuous"        # Continuously moves matching the beat

class EmotionResponse(str, Enum):
    """Emotional response to music"""
    DISENGAGED = "disengaged"        # No affect, no participation
    NEUTRAL = "neutral"              # No affect, maintains participation
    POSITIVE = "positive"            # Smiling, laughing, singing along

class EngagementDeviance(str, Enum):
    """Deviance from typical engagement"""
    SIGNIFICANTLY_LESS = "significantly_less"      # --
    SOMEWHAT_LESS = "somewhat_less"                # -
    TYPICAL = "typical"                            # =
    SOMEWHAT_GREATER = "somewhat_greater"          # +
    SIGNIFICANTLY_GREATER = "significantly_greater" # ++

class MusicResponseMetricsCreate(BaseModel):
    """Create music response metrics assessment"""
    session_id: str = Field(..., description="Session ID this assessment belongs to")
    child_id: str = Field(..., description="Child profile ID")
    music_file: str = Field(..., description="Music file that was played")
    music_style: MusicStyle = Field(..., description="Music style (calm/happy/energetic)")
    duration_played: float = Field(..., ge=0.0, description="Duration music was played in seconds")

    # Binary Metrics
    initiation: Optional[bool] = Field(None, description="Did child initiate participation without prompting?")
    response_to_prompt: Optional[bool] = Field(None, description="Did child follow given instructions/cues?")
    communication: Optional[bool] = Field(None, description="Did child communicate (speak, signal, or nonverbal)?")
    motor_movement: Optional[bool] = Field(None, description="Did child engage in purposeful movement to music?")
    aversion: Optional[bool] = Field(None, description="Did child show signs of distress/aversion?")

    # Categorical Metrics
    task_persistence: Optional[TaskPersistence] = Field(None, description="How long child stayed engaged")
    rhythmic_sync: Optional[RhythmicSync] = Field(None, description="Rhythmic synchronization level")
    emotion: Optional[EmotionResponse] = Field(None, description="Emotional response shown")
    deviance_from_typical: Optional[EngagementDeviance] = Field(None, description="Compared to typical engagement")

    # Optional Notes
    observer_notes: Optional[str] = Field(None, max_length=1000, description="Observer's notes and observations")

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_20250120_abc123",
                "child_id": "child_xyz789",
                "music_file": "ocean_waves.mp3",
                "music_style": "calming_regulation",
                "duration_played": 180.5,
                "initiation": True,
                "response_to_prompt": True,
                "communication": False,
                "motor_movement": True,
                "aversion": False,
                "task_persistence": "majority",
                "rhythmic_sync": "brief",
                "emotion": "positive",
                "deviance_from_typical": "somewhat_greater",
                "observer_notes": "Child seemed very engaged, swaying gently to the music"
            }
        }

class MusicResponseMetricsResponse(BaseModel):
    """Music response metrics response"""
    response_id: str
    session_id: str
    child_id: str
    music_file: str
    music_style: MusicStyle
    duration_played: float
    timestamp: datetime

    # Binary Metrics
    initiation: Optional[bool]
    response_to_prompt: Optional[bool]
    communication: Optional[bool]
    motor_movement: Optional[bool]
    aversion: Optional[bool]

    # Categorical Metrics
    task_persistence: Optional[TaskPersistence]
    rhythmic_sync: Optional[RhythmicSync]
    emotion: Optional[EmotionResponse]
    deviance_from_typical: Optional[EngagementDeviance]

    # Optional Notes
    observer_notes: Optional[str]

class MusicResponseAggregateMetrics(BaseModel):
    """Aggregated music response metrics for a child"""
    child_id: str
    total_assessments: int
    date_range: Dict[str, str]  # start_date, end_date

    # Binary Metrics Percentages
    initiation_rate: float = Field(..., description="Percentage of times child self-initiated")
    response_to_prompt_rate: float = Field(..., description="Percentage of times child followed prompts")
    communication_rate: float = Field(..., description="Percentage of times child communicated")
    motor_movement_rate: float = Field(..., description="Percentage of times child showed motor movement")
    aversion_rate: float = Field(..., description="Percentage of times child showed aversion")

    # Categorical Metrics Averages (normalized 0-1)
    avg_task_persistence: float = Field(..., description="Average task persistence score")
    avg_rhythmic_sync: float = Field(..., description="Average rhythmic synchronization score")
    avg_emotion: float = Field(..., description="Average emotional response score")
    avg_deviance: float = Field(..., description="Average engagement deviance score")

    # Overall Quality Score (0-100)
    overall_quality_score: float = Field(..., description="Computed overall music response quality")

    # By Music Style
    metrics_by_style: Dict[str, Dict[str, Any]] = Field(..., description="Metrics broken down by music style")

    # Best Performing Tracks
    top_tracks: List[Dict[str, Any]] = Field(..., description="Top performing music tracks")

class MusicResponseTrends(BaseModel):
    """Music response trends over time"""
    child_id: str
    daily_metrics: List[Dict[str, Any]] = Field(..., description="Daily aggregated metrics")
    trend_analysis: Dict[str, str] = Field(..., description="Trend analysis (improving/stable/declining)")

    class Config:
        json_schema_extra = {
            "example": {
                "child_id": "child_xyz789",
                "daily_metrics": [
                    {
                        "date": "2025-01-15",
                        "assessments": 3,
                        "quality_score": 75.5,
                        "initiation_rate": 0.67,
                        "communication_rate": 0.33
                    }
                ],
                "trend_analysis": {
                    "initiation": "improving",
                    "communication": "stable",
                    "overall_quality": "improving"
                }
            }
        }

# ===================== PLANNED SESSIONS MODELS =====================

class PlannedSessionStatus(str, Enum):
    """Planned session status values"""
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    MISSED = "missed"
    TEMPLATE = "template"

class RecurrencePattern(str, Enum):
    """Recurrence pattern options"""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"

class PlannedSessionCreate(BaseModel):
    """Create a new planned session"""
    childId: str = Field(..., alias="childId")
    title: str = Field(..., min_length=1, max_length=200)
    scheduledDateTime: str = Field(..., alias="scheduledDateTime")
    status: str = "upcoming"
    goals: List[str] = Field(default_factory=list)
    activities: List[str] = Field(default_factory=list)
    musicStyles: List[str] = Field(default_factory=list, alias="musicStyles")
    customPlaylist: Optional[str] = Field(None, alias="customPlaylist")
    notes: str = ""
    duration: int = Field(..., ge=5, le=180)
    isRecurring: bool = Field(False, alias="isRecurring")
    recurrencePattern: Optional[str] = Field(None, alias="recurrencePattern")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "childId": "child_123",
                "title": "Morning Routine Practice",
                "scheduledDateTime": "2025-01-20T10:00:00Z",
                "status": "upcoming",
                "goals": ["Emotional Regulation", "Transitions"],
                "activities": ["Sound Matching Game", "Musical Storytelling"],
                "musicStyles": ["calming_regulation", "transition"],
                "notes": "Focus on morning transitions",
                "duration": 30,
                "isRecurring": True,
                "recurrencePattern": "weekly"
            }
        }

class PlannedSessionUpdate(BaseModel):
    """Update a planned session"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    scheduledDateTime: Optional[str] = Field(None, alias="scheduledDateTime")
    status: Optional[str] = None
    goals: Optional[List[str]] = None
    activities: Optional[List[str]] = None
    musicStyles: Optional[List[str]] = Field(None, alias="musicStyles")
    customPlaylist: Optional[str] = Field(None, alias="customPlaylist")
    notes: Optional[str] = None
    duration: Optional[int] = Field(None, ge=5, le=180)
    isRecurring: Optional[bool] = Field(None, alias="isRecurring")
    recurrencePattern: Optional[str] = Field(None, alias="recurrencePattern")

    class Config:
        populate_by_name = True

class PlannedSessionResponse(BaseModel):
    """Planned session response"""
    id: str
    childId: str
    title: str
    scheduledDateTime: str
    status: str
    goals: List[str]
    activities: List[str]
    musicStyles: List[str]
    customPlaylist: Optional[str]
    notes: str
    duration: int
    isRecurring: bool
    recurrencePattern: Optional[str]
    createdAt: str
    updatedAt: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "session_abc123",
                "childId": "child_123",
                "title": "Morning Routine Practice",
                "scheduledDateTime": "2025-01-20T10:00:00Z",
                "status": "upcoming",
                "goals": ["Emotional Regulation", "Transitions"],
                "activities": ["Sound Matching Game"],
                "musicStyles": ["calming_regulation", "transition"],
                "customPlaylist": None,
                "notes": "Focus on morning transitions",
                "duration": 30,
                "isRecurring": True,
                "recurrencePattern": "weekly",
                "createdAt": "2025-01-15T08:00:00Z",
                "updatedAt": "2025-01-15T08:00:00Z"
            }
        }

# ===================== SESSION TEMPLATE MODELS =====================

class SessionTemplateCreate(BaseModel):
    """Create a new session template"""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, max_length=500, description="Template description")
    goals: List[str] = Field(default_factory=list, description="Therapy goals")
    activities: List[str] = Field(default_factory=list, description="Session activities")
    musicStyles: List[str] = Field(default_factory=list, description="Music styles/categories")
    notes: Optional[str] = Field(None, description="Additional notes")
    duration: int = Field(30, ge=5, le=180, description="Duration in minutes")
    icon: Optional[str] = Field(None, description="Emoji icon for template")
    color: Optional[str] = Field(None, description="Color theme for template")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "My Custom Social Skills Session",
                "description": "Interactive session for improving social interaction",
                "goals": ["Turn-taking", "Eye contact", "Joint attention"],
                "activities": ["Circle time", "Instrument passing", "Hello song"],
                "musicStyles": ["social_interactive", "movement_motor"],
                "notes": "Works well for ages 4-7",
                "duration": 30,
                "icon": "👥",
                "color": "from-green-500 to-emerald-500"
            }
        }

class SessionTemplateUpdate(BaseModel):
    """Update a session template"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    goals: Optional[List[str]] = None
    activities: Optional[List[str]] = None
    musicStyles: Optional[List[str]] = None
    notes: Optional[str] = None
    duration: Optional[int] = Field(None, ge=5, le=180)
    icon: Optional[str] = None
    color: Optional[str] = None

class SessionTemplateResponse(BaseModel):
    """Session template response"""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    goals: List[str] = Field(default_factory=list)
    activities: List[str] = Field(default_factory=list)
    musicStyles: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    duration: int = 30
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "template_abc123",
                "user_id": "user_xyz789",
                "name": "My Custom Social Skills Session",
                "description": "Interactive session for improving social interaction",
                "goals": ["Turn-taking", "Eye contact", "Joint attention"],
                "activities": ["Circle time", "Instrument passing", "Hello song"],
                "musicStyles": ["social_interactive", "movement_motor"],
                "notes": "Works well for ages 4-7",
                "duration": 30,
                "icon": "👥",
                "color": "from-green-500 to-emerald-500",
                "created_at": "2025-01-15T08:00:00Z",
                "updated_at": "2025-01-15T08:00:00Z"
            }
        }
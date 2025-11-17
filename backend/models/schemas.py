"""
Pydantic Models for API Request/Response Validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ===================== ENUMS =====================

class EngagementLevel(str, Enum):
    """Valid engagement levels"""
    LOW = "LOW"
    MED = "MED"
    HIGH = "HIGH"

class MusicStyle(str, Enum):
    """Valid music styles"""
    CALM = "calm"
    HAPPY = "happy"
    ENERGETIC = "energetic"

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
    style: MusicStyle
    volume: float = Field(default=0.7, ge=0.0, le=1.0)
    file: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "style": "calm",
                "volume": 0.7,
                "file": "ocean_waves.mp3"
            }
        }

class GenerateMusicRequest(BaseModel):
    """Request to generate synthetic music"""
    style: MusicStyle = MusicStyle.CALM
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
                "style": "calm",
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
                "music_style": "calm"
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
                "style": "calm",
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
                "modified_style": "calm"
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

    class Config:
        json_schema_extra = {
            "example": {
                "preferred_genres": ["classical", "ambient", "nature sounds"],
                "preferred_instruments": ["piano", "violin", "nature sounds"],
                "preferred_tempo": "slow",
                "disliked_music": ["heavy metal", "rap", "loud drums"],
                "successful_therapy_music": "Mozart piano sonatas, ocean wave recordings",
                "negative_reaction_music": "Fast-paced electronic music"
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
    created_at: datetime
    updated_at: datetime

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
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
        schema_extra = {
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
        schema_extra = {
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
    key: str = Field(default="C", regex="^[A-G]$")

    @validator('filename')
    def validate_filename(cls, v):
        """Ensure filename is safe"""
        return v.replace("/", "_").replace("\\", "_").replace("..", "_")

    class Config:
        schema_extra = {
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
        schema_extra = {
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
        schema_extra = {
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
        schema_extra = {
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
        schema_extra = {
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
        schema_extra = {
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
        schema_extra = {
            "example": {
                "volume": 0.5
            }
        }
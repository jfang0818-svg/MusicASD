"""
Models module for Pydantic schemas
"""
from .schemas import (
    # Enums
    EngagementLevel,
    MusicStyle,
    AudioMode,
    SessionStatus,

    # Engagement
    EngagementUpdate,
    EngagementResponse,

    # Music
    MusicRequest,
    GenerateMusicRequest,
    MusicStatusResponse,
    MusicLibraryResponse,

    # Session
    SessionLog,
    SessionStartResponse,
    SessionStatusResponse,
    SessionLogsResponse,

    # Camera
    CameraToggle,
    CameraStatusResponse,

    # Analytics
    DashboardAnalytics,
    SessionSummary,

    # GPT/AI
    GPTSuggestion,
    CaregiverAction,

    # Health
    HealthStatus,
    DetailedHealthStatus,

    # Utility
    ErrorResponse,
    SuccessResponse,
    FileUploadResponse,
    VolumeControl
)

__all__ = [
    'EngagementLevel',
    'MusicStyle',
    'AudioMode',
    'SessionStatus',
    'EngagementUpdate',
    'EngagementResponse',
    'MusicRequest',
    'GenerateMusicRequest',
    'MusicStatusResponse',
    'MusicLibraryResponse',
    'SessionLog',
    'SessionStartResponse',
    'SessionStatusResponse',
    'SessionLogsResponse',
    'CameraToggle',
    'CameraStatusResponse',
    'DashboardAnalytics',
    'SessionSummary',
    'GPTSuggestion',
    'CaregiverAction',
    'HealthStatus',
    'DetailedHealthStatus',
    'ErrorResponse',
    'SuccessResponse',
    'FileUploadResponse',
    'VolumeControl'
]
"""
Session Video Models

Video recording and playback for session documentation and review.
"""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class VideoStatus(str, Enum):
    """Video processing status"""
    RECORDING = "recording"        # Currently being recorded
    PROCESSING = "processing"      # Upload/processing in progress
    AVAILABLE = "available"        # Ready for playback
    FAILED = "failed"              # Upload/processing failed
    DELETED = "deleted"            # Soft deleted


class VideoPrivacy(str, Enum):
    """Privacy settings for video"""
    THERAPIST_ONLY = "therapist_only"    # Only therapist can view
    PARENT_SHARED = "parent_shared"      # Shared with parents
    TEAM_SHARED = "team_shared"          # Shared with therapy team


class SessionVideo(BaseModel):
    """Video recording of a therapy session"""
    video_id: str = Field(description="Unique video ID")
    session_id: str = Field(description="Parent therapy session")
    child_id: str = Field(description="Child in video")

    # Video details
    title: str = Field(description="Video title/description")
    duration_seconds: Optional[int] = Field(None, description="Video duration")
    file_size_mb: Optional[float] = Field(None, description="File size in MB")

    # Storage
    blob_url: Optional[str] = Field(None, description="Azure Blob Storage URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail image URL")

    # Status
    status: VideoStatus = VideoStatus.RECORDING
    privacy: VideoPrivacy = VideoPrivacy.THERAPIST_ONLY

    # Metadata
    recorded_by: str = Field(description="Therapist who recorded")
    recorded_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    uploaded_at: Optional[str] = None

    # Clinical context
    session_phase: Optional[str] = Field(None, description="Phase during recording")
    music_style: Optional[str] = Field(None, description="Music playing during recording")
    notes: Optional[str] = Field(None, description="Therapist notes about video")

    # Engagement
    view_count: int = Field(default=0, description="Number of times viewed")
    last_viewed_at: Optional[str] = None

    # Tags for easy searching
    tags: List[str] = Field(
        default_factory=list,
        description="Tags like: breakthrough, goal_progress, behavior_example"
    )


class VideoClip(BaseModel):
    """Short clip from a session video (for highlights)"""
    clip_id: str = Field(description="Unique clip ID")
    video_id: str = Field(description="Parent video ID")
    session_id: str
    child_id: str

    # Clip details
    title: str
    start_time_seconds: int = Field(description="Start time in parent video")
    end_time_seconds: int = Field(description="End time in parent video")
    duration_seconds: int = Field(description="Clip duration")

    # Storage
    blob_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    # Context
    description: str = Field(description="What happens in this clip")
    clip_type: str = Field(
        description="Type: breakthrough, challenge, strategy, example"
    )

    # Metadata
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    privacy: VideoPrivacy = VideoPrivacy.THERAPIST_ONLY


class VideoShare(BaseModel):
    """Record of video being shared with parent/team"""
    share_id: str
    video_id: str
    shared_with_email: str
    shared_with_name: str
    shared_by: str

    # Share details
    share_message: Optional[str] = Field(None, description="Message included with share")
    expires_at: Optional[str] = Field(None, description="Expiration date for share link")

    # Status
    shared_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    viewed: bool = Field(default=False)
    viewed_at: Optional[str] = None


class CreateVideoRequest(BaseModel):
    """Request to create a video record"""
    session_id: str
    child_id: str
    title: str
    recorded_by: str
    session_phase: Optional[str] = None
    music_style: Optional[str] = None
    notes: Optional[str] = None
    privacy: VideoPrivacy = VideoPrivacy.THERAPIST_ONLY


class UpdateVideoRequest(BaseModel):
    """Request to update video metadata"""
    title: Optional[str] = None
    notes: Optional[str] = None
    privacy: Optional[VideoPrivacy] = None
    tags: Optional[List[str]] = None
    status: Optional[VideoStatus] = None
    duration_seconds: Optional[int] = None
    file_size_mb: Optional[float] = None
    blob_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CreateClipRequest(BaseModel):
    """Request to create a video clip"""
    video_id: str
    title: str
    start_time_seconds: int
    end_time_seconds: int
    description: str
    clip_type: str
    privacy: VideoPrivacy = VideoPrivacy.THERAPIST_ONLY


class ShareVideoRequest(BaseModel):
    """Request to share a video"""
    video_id: str
    shared_with_email: str
    shared_with_name: str
    share_message: Optional[str] = None
    expires_days: Optional[int] = Field(None, description="Days until link expires")

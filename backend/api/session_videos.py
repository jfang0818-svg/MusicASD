"""
Session Videos API

Video recording and playback management for session documentation.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import uuid
from datetime import datetime, timedelta

from models.session_videos import (
    SessionVideo,
    VideoClip,
    VideoShare,
    CreateVideoRequest,
    UpdateVideoRequest,
    CreateClipRequest,
    ShareVideoRequest,
    VideoStatus,
    VideoPrivacy
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/videos", tags=["session_videos"])


@router.post("/create", response_model=SessionVideo)
async def create_video(
    request: CreateVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new video record (before upload)"""
    video_id = f"video_{request.session_id}_{uuid.uuid4().hex[:8]}"

    video = SessionVideo(
        video_id=video_id,
        session_id=request.session_id,
        child_id=request.child_id,
        title=request.title,
        recorded_by=request.recorded_by,
        session_phase=request.session_phase,
        music_style=request.music_style,
        notes=request.notes,
        privacy=request.privacy,
        status=VideoStatus.RECORDING
    )

    try:
        blob_path = f"session_videos/session_{request.session_id}/{video_id}.json"
        await azure_storage._save_json(blob_path, video.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create video record: {str(e)}"
        )

    return video


@router.get("/{video_id}", response_model=SessionVideo)
async def get_video(
    video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get video details"""
    try:
        # Search for video
        prefix = "session_videos/"
        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if video_id in blob.name and blob.name.endswith(".json"):
                video_data = await azure_storage._load_json(blob.name)
                if video_data:
                    # Update view count
                    video = SessionVideo(**video_data)
                    video.view_count += 1
                    video.last_viewed_at = datetime.now().isoformat()
                    await azure_storage._save_json(blob.name, video.dict())
                    return video

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve video: {str(e)}"
        )


@router.put("/{video_id}", response_model=SessionVideo)
async def update_video(
    video_id: str,
    request: UpdateVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update video metadata"""
    try:
        # Find video
        prefix = "session_videos/"
        video_blob_path = None
        video = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if video_id in blob.name and blob.name.endswith(".json"):
                video_blob_path = blob.name
                video_data = await azure_storage._load_json(blob.name)
                if video_data:
                    video = SessionVideo(**video_data)
                break

        if not video or not video_blob_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )

        # Update fields
        if request.title is not None:
            video.title = request.title
        if request.notes is not None:
            video.notes = request.notes
        if request.privacy is not None:
            video.privacy = request.privacy
        if request.tags is not None:
            video.tags = request.tags
        if request.status is not None:
            video.status = request.status
            if request.status == VideoStatus.AVAILABLE:
                video.uploaded_at = datetime.now().isoformat()
        if request.duration_seconds is not None:
            video.duration_seconds = request.duration_seconds
        if request.file_size_mb is not None:
            video.file_size_mb = request.file_size_mb
        if request.blob_url is not None:
            video.blob_url = request.blob_url
        if request.thumbnail_url is not None:
            video.thumbnail_url = request.thumbnail_url

        # Save updated video
        await azure_storage._save_json(video_blob_path, video.dict())
        return video

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update video: {str(e)}"
        )


@router.get("/session/{session_id}/list", response_model=List[SessionVideo])
async def list_session_videos(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all videos for a session"""
    try:
        videos = []
        prefix = f"session_videos/session_{session_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json") and "/clips/" not in blob.name:
                video_data = await azure_storage._load_json(blob.name)
                if video_data:
                    videos.append(SessionVideo(**video_data))

        # Sort by recorded date (most recent first)
        videos.sort(key=lambda v: v.recorded_at, reverse=True)
        return videos

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list videos: {str(e)}"
        )


@router.get("/child/{child_id}/list", response_model=List[SessionVideo])
async def list_child_videos(
    child_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get all videos for a child"""
    try:
        videos = []
        prefix = "session_videos/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json") and "/clips/" not in blob.name:
                video_data = await azure_storage._load_json(blob.name)
                if video_data and video_data.get("child_id") == child_id:
                    videos.append(SessionVideo(**video_data))

        # Sort by recorded date (most recent first)
        videos.sort(key=lambda v: v.recorded_at, reverse=True)
        return videos[:limit]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list videos: {str(e)}"
        )


@router.delete("/{video_id}")
async def delete_video(
    video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a video (mark as deleted)"""
    try:
        # Find video
        prefix = "session_videos/"
        video_blob_path = None
        video = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if video_id in blob.name and blob.name.endswith(".json"):
                video_blob_path = blob.name
                video_data = await azure_storage._load_json(blob.name)
                if video_data:
                    video = SessionVideo(**video_data)
                break

        if not video or not video_blob_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )

        # Mark as deleted
        video.status = VideoStatus.DELETED
        await azure_storage._save_json(video_blob_path, video.dict())

        return {"message": "Video deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete video: {str(e)}"
        )


@router.post("/clips/create", response_model=VideoClip)
async def create_clip(
    request: CreateClipRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a highlight clip from a video"""
    clip_id = f"clip_{request.video_id}_{uuid.uuid4().hex[:8]}"

    # Get parent video to extract session_id and child_id
    try:
        prefix = "session_videos/"
        parent_video = None

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if request.video_id in blob.name and blob.name.endswith(".json"):
                video_data = await azure_storage._load_json(blob.name)
                if video_data:
                    parent_video = SessionVideo(**video_data)
                break

        if not parent_video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent video not found"
            )

        duration = request.end_time_seconds - request.start_time_seconds

        clip = VideoClip(
            clip_id=clip_id,
            video_id=request.video_id,
            session_id=parent_video.session_id,
            child_id=parent_video.child_id,
            title=request.title,
            start_time_seconds=request.start_time_seconds,
            end_time_seconds=request.end_time_seconds,
            duration_seconds=duration,
            description=request.description,
            clip_type=request.clip_type,
            created_by=current_user.get("email", "unknown"),
            privacy=request.privacy
        )

        blob_path = f"session_videos/clips/{request.video_id}/{clip_id}.json"
        await azure_storage._save_json(blob_path, clip.dict())

        return clip

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create clip: {str(e)}"
        )


@router.get("/clips/video/{video_id}", response_model=List[VideoClip])
async def list_video_clips(
    video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all clips for a video"""
    try:
        clips = []
        prefix = f"session_videos/clips/{video_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                clip_data = await azure_storage._load_json(blob.name)
                if clip_data:
                    clips.append(VideoClip(**clip_data))

        # Sort by start time
        clips.sort(key=lambda c: c.start_time_seconds)
        return clips

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list clips: {str(e)}"
        )


@router.post("/share", response_model=VideoShare)
async def share_video(
    request: ShareVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Share a video with parent or team member"""
    share_id = f"share_{request.video_id}_{uuid.uuid4().hex[:8]}"

    # Calculate expiration
    expires_at = None
    if request.expires_days:
        expires_at = (datetime.now() + timedelta(days=request.expires_days)).isoformat()

    share = VideoShare(
        share_id=share_id,
        video_id=request.video_id,
        shared_with_email=request.shared_with_email,
        shared_with_name=request.shared_with_name,
        shared_by=current_user.get("email", "unknown"),
        share_message=request.share_message,
        expires_at=expires_at
    )

    try:
        blob_path = f"video_shares/{request.video_id}/{share_id}.json"
        await azure_storage._save_json(blob_path, share.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share video: {str(e)}"
        )

    return share

"""
Home Routines API

Supports music routine management for home use.
Enables parents to create structured music schedules and export playlists.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid
import qrcode
import io
import base64

from models.home_routines import (
    HomeRoutine,
    MusicPlaylist,
    CreateRoutineRequest,
    UpdateRoutineRequest,
    CreatePlaylistRequest,
    ROUTINE_TEMPLATES
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/home-routines", tags=["home-routines"])


@router.get("/templates")
async def get_routine_templates():
    """Get predefined routine templates for quick setup"""
    return {
        "templates": ROUTINE_TEMPLATES,
        "categories": list(ROUTINE_TEMPLATES.keys())
    }


@router.post("/create", response_model=HomeRoutine)
async def create_routine(
    request: CreateRoutineRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new home routine"""
    routine_id = f"routine_{request.child_id}_{uuid.uuid4().hex[:8]}"

    routine = HomeRoutine(
        routine_id=routine_id,
        child_id=request.child_id,
        name=request.name,
        routine_type=request.routine_type,
        time_of_day=request.time_of_day,
        description=request.description,
        music_style=request.music_style,
        duration_minutes=request.duration_minutes,
        scheduled_time=request.scheduled_time,
        days_of_week=request.days_of_week,
        icon=request.icon,
        color=request.color,
        notes=request.notes
    )

    # Save to Azure Storage
    try:
        blob_path = f"home_routines/child_{request.child_id}/{routine_id}.json"
        await azure_storage._save_json(blob_path, routine.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save routine: {str(e)}"
        )

    return routine


@router.get("/child/{child_id}", response_model=List[HomeRoutine])
async def get_child_routines(
    child_id: str,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get all routines for a specific child"""
    try:
        routines = []
        prefix = f"home_routines/child_{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                routine_data = await azure_storage._load_json(blob.name)
                if routine_data:
                    routine = HomeRoutine(**routine_data)

                    # Filter by active status if requested
                    if active_only and not routine.active:
                        continue

                    routines.append(routine)

        # Sort by scheduled time, then by name
        routines.sort(key=lambda r: (r.scheduled_time or "99:99", r.name))
        return routines

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve routines: {str(e)}"
        )


@router.get("/{routine_id}", response_model=HomeRoutine)
async def get_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific routine by ID"""
    # Extract child_id from routine_id
    parts = routine_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid routine ID format"
        )

    child_id = parts[1]
    blob_path = f"home_routines/child_{child_id}/{routine_id}.json"

    try:
        routine_data = await azure_storage._load_json(blob_path)
        if not routine_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Routine not found"
            )
        return HomeRoutine(**routine_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve routine: {str(e)}"
        )


@router.put("/{routine_id}", response_model=HomeRoutine)
async def update_routine(
    routine_id: str,
    request: UpdateRoutineRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing routine"""
    parts = routine_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid routine ID format"
        )

    child_id = parts[1]
    blob_path = f"home_routines/child_{child_id}/{routine_id}.json"

    try:
        routine_data = await azure_storage._load_json(blob_path)
        if not routine_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Routine not found"
            )

        routine = HomeRoutine(**routine_data)

        # Update fields
        if request.name is not None:
            routine.name = request.name
        if request.description is not None:
            routine.description = request.description
        if request.music_style is not None:
            routine.music_style = request.music_style
        if request.duration_minutes is not None:
            routine.duration_minutes = request.duration_minutes
        if request.scheduled_time is not None:
            routine.scheduled_time = request.scheduled_time
        if request.days_of_week is not None:
            routine.days_of_week = request.days_of_week
        if request.active is not None:
            routine.active = request.active
        if request.notes is not None:
            routine.notes = request.notes

        # Save updated routine
        await azure_storage._save_json(blob_path, routine.dict())
        return routine

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update routine: {str(e)}"
        )


@router.delete("/{routine_id}")
async def delete_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a routine"""
    parts = routine_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid routine ID format"
        )

    child_id = parts[1]
    blob_path = f"home_routines/child_{child_id}/{routine_id}.json"

    try:
        blob_client = azure_storage.container_client.get_blob_client(blob_path)
        await blob_client.delete_blob()
        return {"message": "Routine deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete routine: {str(e)}"
        )


@router.post("/playlist/create", response_model=MusicPlaylist)
async def create_playlist(
    request: CreatePlaylistRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create/export a music playlist with QR code"""
    playlist_id = f"playlist_{request.child_id}_{uuid.uuid4().hex[:8]}"

    # Get music tracks from library (mock for now - would fetch from actual library)
    tracks = [
        {"name": f"{request.music_style.capitalize()} Track 1", "file": f"{request.music_style}_1.mp3"},
        {"name": f"{request.music_style.capitalize()} Track 2", "file": f"{request.music_style}_2.mp3"},
        {"name": f"{request.music_style.capitalize()} Track 3", "file": f"{request.music_style}_3.mp3"},
    ]

    # Generate shareable URL
    share_url = f"https://musicasd.app/playlist/{playlist_id}"

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(share_url)
    qr.make(fit=True)

    qr_image = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffered = io.BytesIO()
    qr_image.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode()

    playlist = MusicPlaylist(
        playlist_id=playlist_id,
        child_id=request.child_id,
        name=request.name,
        description=request.description,
        music_style=request.music_style,
        tracks=tracks,
        session_id=request.session_id,
        qr_code_data=qr_base64,
        share_url=share_url
    )

    # Save to Azure Storage
    try:
        blob_path = f"playlists/child_{request.child_id}/{playlist_id}.json"
        await azure_storage._save_json(blob_path, playlist.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save playlist: {str(e)}"
        )

    return playlist


@router.get("/playlist/child/{child_id}", response_model=List[MusicPlaylist])
async def get_child_playlists(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all playlists for a specific child"""
    try:
        playlists = []
        prefix = f"playlists/child_{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                playlist_data = await azure_storage._load_json(blob.name)
                if playlist_data:
                    playlists.append(MusicPlaylist(**playlist_data))

        # Sort by creation date (newest first)
        playlists.sort(key=lambda p: p.created_date, reverse=True)
        return playlists

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve playlists: {str(e)}"
        )


@router.get("/child/{child_id}/daily-schedule")
async def get_daily_schedule(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a formatted daily schedule for display/printing"""
    try:
        routines = []
        prefix = f"home_routines/child_{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                routine_data = await azure_storage._load_json(blob.name)
                if routine_data:
                    routine = HomeRoutine(**routine_data)
                    if routine.active and routine.scheduled_time:
                        routines.append(routine)

        # Sort by scheduled time
        routines.sort(key=lambda r: r.scheduled_time or "99:99")

        # Group by time of day
        schedule = {
            "morning": [],
            "midday": [],
            "evening": [],
            "bedtime": [],
            "anytime": []
        }

        for routine in routines:
            schedule[routine.time_of_day].append({
                "name": routine.name,
                "time": routine.scheduled_time,
                "icon": routine.icon,
                "music_style": routine.music_style,
                "duration_minutes": routine.duration_minutes,
                "description": routine.description
            })

        return {
            "child_id": child_id,
            "schedule": schedule,
            "total_routines": len(routines)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate daily schedule: {str(e)}"
        )

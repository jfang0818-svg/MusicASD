"""
Session Notes API Endpoints

Provides CRUD operations for therapy session notes and observations.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid
from datetime import datetime

from models.session_notes import (
    SessionNote,
    CreateNoteRequest,
    UpdateNoteRequest,
    SessionNotesSummary,
    NoteType
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/session-notes", tags=["session-notes"])


@router.post("/create", response_model=SessionNote)
async def create_note(
    request: CreateNoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new session note"""
    note_id = f"note_{request.session_id}_{uuid.uuid4().hex[:8]}"

    note = SessionNote(
        note_id=note_id,
        session_id=request.session_id,
        child_id=request.child_id,
        note_type=request.note_type,
        content=request.content,
        session_time_elapsed=request.session_time_elapsed,
        music_style=request.music_style,
        engagement_level=request.engagement_level,
        session_phase=request.session_phase,
        created_by=current_user.get("email"),
        tags=request.tags
    )

    # Save to Azure Storage
    try:
        blob_path = f"session_notes/session_{request.session_id}/{note_id}.json"
        await azure_storage._save_json(blob_path, note.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save note: {str(e)}"
        )

    return note


@router.get("/session/{session_id}", response_model=List[SessionNote])
async def get_session_notes(
    session_id: str,
    note_type: Optional[NoteType] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all notes for a specific session"""
    try:
        notes = []
        prefix = f"session_notes/session_{session_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                note_data = await azure_storage._load_json(blob.name)
                if note_data:
                    note = SessionNote(**note_data)

                    # Apply filter if provided
                    if note_type and note.note_type != note_type:
                        continue

                    notes.append(note)

        # Sort by timestamp (newest first)
        notes.sort(key=lambda n: n.timestamp, reverse=True)
        return notes

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notes: {str(e)}"
        )


@router.get("/child/{child_id}", response_model=List[SessionNote])
async def get_child_notes(
    child_id: str,
    limit: int = 50,
    note_type: Optional[NoteType] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all notes for a specific child across all sessions"""
    try:
        notes = []
        prefix = f"session_notes/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                note_data = await azure_storage._load_json(blob.name)
                if note_data and note_data.get("child_id") == child_id:
                    note = SessionNote(**note_data)

                    # Apply filter if provided
                    if note_type and note.note_type != note_type:
                        continue

                    notes.append(note)

        # Sort by timestamp (newest first)
        notes.sort(key=lambda n: n.timestamp, reverse=True)

        # Limit results
        return notes[:limit]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve child notes: {str(e)}"
        )


@router.get("/{note_id}", response_model=SessionNote)
async def get_note(
    note_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific note by ID"""
    # Extract session_id from note_id (format: note_<session_id>_<hash>)
    parts = note_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID format"
        )

    session_id = parts[1]
    blob_path = f"session_notes/session_{session_id}/{note_id}.json"

    try:
        note_data = await azure_storage._load_json(blob_path)
        if not note_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        return SessionNote(**note_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve note: {str(e)}"
        )


@router.put("/{note_id}", response_model=SessionNote)
async def update_note(
    note_id: str,
    request: UpdateNoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing note"""
    # Extract session_id from note_id
    parts = note_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID format"
        )

    session_id = parts[1]
    blob_path = f"session_notes/session_{session_id}/{note_id}.json"

    try:
        note_data = await azure_storage._load_json(blob_path)
        if not note_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )

        note = SessionNote(**note_data)

        # Update fields
        if request.content is not None:
            note.content = request.content
        if request.note_type is not None:
            note.note_type = request.note_type
        if request.tags is not None:
            note.tags = request.tags

        # Save updated note
        await azure_storage._save_json(blob_path, note.dict())
        return note

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update note: {str(e)}"
        )


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a note"""
    # Extract session_id from note_id
    parts = note_id.split("_")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID format"
        )

    session_id = parts[1]
    blob_path = f"session_notes/session_{session_id}/{note_id}.json"

    try:
        blob_client = azure_storage.container_client.get_blob_client(blob_path)
        await blob_client.delete_blob()
        return {"message": "Note deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete note: {str(e)}"
        )


@router.get("/session/{session_id}/summary", response_model=SessionNotesSummary)
async def get_session_notes_summary(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive summary of session notes"""
    try:
        notes = []
        prefix = f"session_notes/session_{session_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                note_data = await azure_storage._load_json(blob.name)
                if note_data:
                    notes.append(SessionNote(**note_data))

        # Sort by timestamp
        notes.sort(key=lambda n: n.timestamp)

        # Categorize notes
        notes_by_type = {}
        for note_type in NoteType:
            notes_by_type[note_type.value] = len([n for n in notes if n.note_type == note_type])

        breakthrough_moments = [n for n in notes if n.note_type == NoteType.BREAKTHROUGH]
        challenges = [n for n in notes if n.note_type == NoteType.CHALLENGE]
        safety_concerns = [n for n in notes if n.note_type == NoteType.SAFETY]

        return SessionNotesSummary(
            session_id=session_id,
            total_notes=len(notes),
            notes_by_type=notes_by_type,
            breakthrough_moments=breakthrough_moments,
            challenges=challenges,
            safety_concerns=safety_concerns,
            all_notes=notes
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session notes summary: {str(e)}"
        )

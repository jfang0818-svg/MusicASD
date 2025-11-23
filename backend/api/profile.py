"""
Child Profile API Endpoints
Handles CRUD operations for child profiles
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime
from typing import List
import uuid
from models.schemas import (
    ChildProfileCreate,
    ChildProfileUpdate,
    ChildProfileResponse,
    MusicElementsResponse,
    SuccessResponse,
    DocumentUploadResponse,
    ProfileDocument
)
from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.gpt_client import GPTClient

router = APIRouter(prefix="/profile", tags=["Child Profiles"])


@router.post("/child", response_model=ChildProfileResponse)
async def create_child_profile(
    profile_data: ChildProfileCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new child profile (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)
    child_id = str(uuid.uuid4())

    # Build profile document
    profile_doc = {
        "id": child_id,
        "user_id": user_id,
        "demographics": profile_data.demographics.dict(),
        "sensory_sensitivities": profile_data.sensory_sensitivities.dict() if profile_data.sensory_sensitivities else None,
        "communication": profile_data.communication.dict() if profile_data.communication else None,
        "behavioral_patterns": profile_data.behavioral_patterns.dict() if profile_data.behavioral_patterns else None,
        "music_preferences": profile_data.music_preferences.dict() if profile_data.music_preferences else None,
        "therapy_goals": profile_data.therapy_goals.dict() if profile_data.therapy_goals else None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    # Save to Azure Blob Storage
    success = await azure_storage.save_child_profile(user_id, child_id, profile_doc)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create child profile")

    return ChildProfileResponse(**profile_doc)


@router.get("/child/{child_id}", response_model=ChildProfileResponse)
async def get_child_profile(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get a child profile by ID (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ChildProfileResponse(**profile)


@router.get("/children", response_model=List[ChildProfileResponse])
async def list_child_profiles(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    List all child profiles for the current user (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    profiles = await azure_storage.list_child_profiles(user_id)
    return [ChildProfileResponse(**p) for p in profiles]


@router.put("/child/{child_id}", response_model=ChildProfileResponse)
async def update_child_profile(
    child_id: str,
    profile_update: ChildProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Update a child profile (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get existing profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    if profile_update.demographics:
        profile["demographics"] = profile_update.demographics.dict()
    if profile_update.sensory_sensitivities:
        profile["sensory_sensitivities"] = profile_update.sensory_sensitivities.dict()
    if profile_update.communication:
        profile["communication"] = profile_update.communication.dict()
    if profile_update.behavioral_patterns:
        profile["behavioral_patterns"] = profile_update.behavioral_patterns.dict()
    if profile_update.music_preferences:
        profile["music_preferences"] = profile_update.music_preferences.dict()
    if profile_update.therapy_goals:
        profile["therapy_goals"] = profile_update.therapy_goals.dict()

    profile["updated_at"] = datetime.utcnow().isoformat()

    # Save updated profile
    success = await azure_storage.save_child_profile(user_id, child_id, profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update child profile")

    return ChildProfileResponse(**profile)


@router.delete("/child/{child_id}", response_model=SuccessResponse)
async def delete_child_profile(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Delete a child profile and all associated data (requires authentication)
    WARNING: This is irreversible!
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get existing profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete profile and associated data
    success = await azure_storage.delete_child_profile(user_id, child_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete child profile")

    return SuccessResponse(
        status="success",
        message=f"Child profile '{profile['demographics']['name']}' deleted successfully"
    )


@router.post("/child/{child_id}/analyze", response_model=MusicElementsResponse)
async def analyze_child_profile(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Analyze child profile with GPT-5.1 and generate music element recommendations
    (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Get child profile
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    # Verify ownership
    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Analyze profile with GPT-5.1
    try:
        gpt_client = GPTClient()
        music_elements = await gpt_client.analyze_child_profile_for_music(profile)

        # Save analysis results to Azure Blob Storage
        await azure_storage.save_music_elements(user_id, child_id, music_elements)

        return MusicElementsResponse(
            child_id=child_id,
            elements=music_elements,
            analyzed_at=datetime.utcnow()
        )

    except ValueError as e:
        # OpenAI API key not configured
        raise HTTPException(
            status_code=503,
            detail="Music analysis service not configured. Please contact administrator."
        )
    except Exception as e:
        print(f"Error analyzing profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze profile")


@router.get("/child/{child_id}/music-elements", response_model=MusicElementsResponse)
async def get_music_elements(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get previously generated music element recommendations
    (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify profile ownership
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get music elements
    elements = await azure_storage.get_music_elements(user_id, child_id)
    if not elements:
        raise HTTPException(
            status_code=404,
            detail="No music analysis found. Please run analysis first."
        )

    return MusicElementsResponse(
        child_id=child_id,
        elements=elements,
        analyzed_at=datetime.fromisoformat(elements.get("analyzed_at", datetime.utcnow().isoformat()))
    )


@router.post("/child/{child_id}/documents", response_model=DocumentUploadResponse)
async def upload_document(
    child_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload a document for a child profile (requires authentication)
    Accepts any file type
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify profile ownership
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    file_data = await file.read()
    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB")

    # Upload document
    try:
        doc_metadata = await azure_storage.upload_profile_document(
            user_id=user_id,
            child_id=child_id,
            filename=file.filename,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream"
        )

        # Update profile with document metadata
        if "documents" not in profile:
            profile["documents"] = []

        profile["documents"].append(doc_metadata)
        profile["updated_at"] = datetime.utcnow().isoformat()

        await azure_storage.save_child_profile(user_id, child_id, profile)

        return DocumentUploadResponse(**doc_metadata)

    except Exception as e:
        print(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")


@router.get("/child/{child_id}/documents", response_model=List[ProfileDocument])
async def list_documents(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    List all documents for a child profile (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify profile ownership
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get documents from profile or from storage
    documents = profile.get("documents", [])

    return [ProfileDocument(**doc) for doc in documents]


@router.delete("/child/{child_id}/documents/{blob_path:path}", response_model=SuccessResponse)
async def delete_document(
    child_id: str,
    blob_path: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Delete a document from a child profile (requires authentication)
    """
    user_id = auth_service.get_current_user_id(credentials)

    # Verify profile ownership
    profile = await azure_storage.get_child_profile(user_id, child_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Child profile not found")

    if profile["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete document from blob storage
    try:
        success = await azure_storage.delete_profile_document(user_id, child_id, blob_path)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete document")

        # Remove from profile metadata
        if "documents" in profile:
            profile["documents"] = [
                doc for doc in profile["documents"]
                if doc.get("blob_path") != blob_path
            ]
            profile["updated_at"] = datetime.utcnow().isoformat()
            await azure_storage.save_child_profile(user_id, child_id, profile)

        return SuccessResponse(
            status="success",
            message="Document deleted successfully"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")

"""
Session Templates API endpoints
"""

from datetime import datetime
import logging
from typing import List
import uuid

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials

from models.schemas import SessionTemplateCreate, SessionTemplateUpdate, SessionTemplateResponse
from services.auth import auth_service, security
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/templates", tags=["templates"])


@router.post("", response_model=SessionTemplateResponse)
async def create_template(
    template_data: SessionTemplateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new session template (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    # Create template document
    template_id = f"template_{uuid.uuid4().hex[:12]}"
    current_time = datetime.utcnow().isoformat() + "Z"

    template = {
        "id": template_id,
        "user_id": user_id,
        "name": template_data.name,
        "description": template_data.description,
        "goals": template_data.goals,
        "activities": template_data.activities,
        "musicStyles": template_data.musicStyles,
        "notes": template_data.notes,
        "duration": template_data.duration,
        "icon": template_data.icon,
        "color": template_data.color,
        "created_at": current_time,
        "updated_at": current_time
    }

    try:
        await azure_storage.save_session_template(user_id, template_id, template)
        return SessionTemplateResponse(**template)
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create template")


@router.get("", response_model=List[SessionTemplateResponse])
async def get_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all session templates for the current user (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        templates = await azure_storage.get_session_templates(user_id)
        return [SessionTemplateResponse(**template) for template in templates]
    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch templates")


@router.get("/{template_id}", response_model=SessionTemplateResponse)
async def get_template(
    template_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific session template (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        template = await azure_storage.get_session_template(user_id, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Verify ownership
        if template.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return SessionTemplateResponse(**template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching template: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch template")


@router.put("/{template_id}", response_model=SessionTemplateResponse)
async def update_template(
    template_id: str,
    template_data: SessionTemplateUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a session template (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get existing template
        template = await azure_storage.get_session_template(user_id, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Verify ownership
        if template.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update fields
        update_data = template_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            template[key] = value

        template["updated_at"] = datetime.utcnow().isoformat() + "Z"

        # Save updated template
        await azure_storage.save_session_template(user_id, template_id, template)
        return SessionTemplateResponse(**template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {e}")
        raise HTTPException(status_code=500, detail="Failed to update template")


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a session template (requires authentication)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get existing template to verify ownership
        template = await azure_storage.get_session_template(user_id, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Verify ownership
        if template.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete template
        await azure_storage.delete_session_template(user_id, template_id)
        return {"message": "Template deleted successfully", "id": template_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete template")

"""
Notifications API

Manages email notifications and parent-therapist communication.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import uuid

from models.notifications import (
    EmailNotification,
    ParentMessage,
    NotificationPreferences,
    CreateNotificationRequest,
    SendMessageRequest,
    UpdatePreferencesRequest,
    NotificationType,
    NotificationStatus,
    generate_session_summary_email,
    generate_breakthrough_email
)
from services.azure_storage import azure_storage
from api.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/create", response_model=EmailNotification)
async def create_notification(
    request: CreateNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a notification (queued for sending)"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"

    notification = EmailNotification(
        notification_id=notification_id,
        recipient_email=request.recipient_email,
        recipient_name=request.recipient_name,
        notification_type=request.notification_type,
        subject=request.subject,
        content_html=request.content_html,
        content_text=request.content_text,
        child_id=request.child_id,
        session_id=request.session_id
    )

    # Save to Azure Storage
    try:
        blob_path = f"notifications/{notification_id}.json"
        await azure_storage._save_json(blob_path, notification.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )

    return notification


@router.post("/send-session-summary")
async def send_session_summary(
    child_id: str,
    session_data: dict,
    parent_email: str,
    parent_name: str,
    child_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Queue a session summary email"""
    # Generate email content
    email_content = generate_session_summary_email(child_name, session_data)

    notification_id = f"notif_{uuid.uuid4().hex[:12]}"

    notification = EmailNotification(
        notification_id=notification_id,
        recipient_email=parent_email,
        recipient_name=parent_name,
        notification_type=NotificationType.SESSION_SUMMARY,
        subject=f"Session Summary for {child_name}",
        content_html=email_content["html"],
        content_text=email_content["text"],
        child_id=child_id,
        session_id=session_data.get("session_id")
    )

    try:
        blob_path = f"notifications/{notification_id}.json"
        await azure_storage._save_json(blob_path, notification.dict())
        return {"message": "Session summary queued", "notification_id": notification_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue session summary: {str(e)}"
        )


@router.post("/send-breakthrough-alert")
async def send_breakthrough_alert(
    child_id: str,
    breakthrough_note: str,
    parent_email: str,
    parent_name: str,
    child_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Queue a breakthrough moment alert email"""
    email_content = generate_breakthrough_email(child_name, breakthrough_note)

    notification_id = f"notif_{uuid.uuid4().hex[:12]}"

    notification = EmailNotification(
        notification_id=notification_id,
        recipient_email=parent_email,
        recipient_name=parent_name,
        notification_type=NotificationType.BREAKTHROUGH,
        subject=f"🎉 Breakthrough Moment for {child_name}!",
        content_html=email_content["html"],
        content_text=email_content["text"],
        child_id=child_id
    )

    try:
        blob_path = f"notifications/{notification_id}.json"
        await azure_storage._save_json(blob_path, notification.dict())
        return {"message": "Breakthrough alert queued", "notification_id": notification_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue breakthrough alert: {str(e)}"
        )


@router.get("/user/{user_email}", response_model=List[EmailNotification])
async def get_user_notifications(
    user_email: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get all notifications for a user"""
    try:
        notifications = []
        prefix = "notifications/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                notif_data = await azure_storage._load_json(blob.name)
                if notif_data and notif_data.get("recipient_email") == user_email:
                    notifications.append(EmailNotification(**notif_data))

        # Sort by creation date (newest first)
        notifications.sort(key=lambda n: n.created_date, reverse=True)
        return notifications[:limit]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notifications: {str(e)}"
        )


@router.post("/messages/send", response_model=ParentMessage)
async def send_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message between parent and therapist"""
    message_id = f"msg_{request.child_id}_{uuid.uuid4().hex[:8]}"

    message = ParentMessage(
        message_id=message_id,
        child_id=request.child_id,
        sender_email=current_user.get("email"),
        sender_name=current_user.get("name", "User"),
        sender_role=current_user.get("role", "therapist"),
        recipient_email=request.recipient_email,
        recipient_name=request.recipient_name,
        recipient_role=request.recipient_role,
        subject=request.subject,
        content=request.content,
        reply_to=request.reply_to
    )

    try:
        blob_path = f"messages/child_{request.child_id}/{message_id}.json"
        await azure_storage._save_json(blob_path, message.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

    return message


@router.get("/messages/child/{child_id}", response_model=List[ParentMessage])
async def get_child_messages(
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a specific child (conversation thread)"""
    try:
        messages = []
        prefix = f"messages/child_{child_id}/"

        async for blob in azure_storage.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                msg_data = await azure_storage._load_json(blob.name)
                if msg_data:
                    messages.append(ParentMessage(**msg_data))

        # Sort by timestamp
        messages.sort(key=lambda m: m.timestamp)
        return messages

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve messages: {str(e)}"
        )


@router.get("/preferences/{user_email}/{child_id}", response_model=NotificationPreferences)
async def get_notification_preferences(
    user_email: str,
    child_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get notification preferences for a parent-child pair"""
    blob_path = f"notification_preferences/{user_email}_{child_id}.json"

    try:
        prefs_data = await azure_storage._load_json(blob_path)
        if not prefs_data:
            # Return default preferences
            return NotificationPreferences(user_email=user_email, child_id=child_id)
        return NotificationPreferences(**prefs_data)
    except Exception as e:
        # Return defaults on error
        return NotificationPreferences(user_email=user_email, child_id=child_id)


@router.put("/preferences/{user_email}/{child_id}", response_model=NotificationPreferences)
async def update_notification_preferences(
    user_email: str,
    child_id: str,
    request: UpdatePreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update notification preferences"""
    blob_path = f"notification_preferences/{user_email}_{child_id}.json"

    try:
        # Load existing or create new
        prefs_data = await azure_storage._load_json(blob_path)
        if prefs_data:
            prefs = NotificationPreferences(**prefs_data)
        else:
            prefs = NotificationPreferences(user_email=user_email, child_id=child_id)

        # Update fields
        if request.session_summaries is not None:
            prefs.session_summaries = request.session_summaries
        if request.weekly_reports is not None:
            prefs.weekly_reports = request.weekly_reports
        if request.breakthrough_alerts is not None:
            prefs.breakthrough_alerts = request.breakthrough_alerts
        if request.goal_achievements is not None:
            prefs.goal_achievements = request.goal_achievements
        if request.safety_concerns is not None:
            prefs.safety_concerns = request.safety_concerns
        if request.session_reminders is not None:
            prefs.session_reminders = request.session_reminders
        if request.weekly_report_day is not None:
            prefs.weekly_report_day = request.weekly_report_day
        if request.reminder_hours_before is not None:
            prefs.reminder_hours_before = request.reminder_hours_before

        # Save updated preferences
        await azure_storage._save_json(blob_path, prefs.dict())
        return prefs

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )

"""
Notification and Communication Models

Supports parent-therapist communication and automated progress reports.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    """Types of notifications"""
    SESSION_SUMMARY = "session_summary"        # Post-session summary
    WEEKLY_REPORT = "weekly_report"            # Weekly progress report
    BREAKTHROUGH = "breakthrough"              # Breakthrough moment alert
    GOAL_ACHIEVED = "goal_achieved"            # Goal achievement notification
    SAFETY_CONCERN = "safety_concern"          # Safety concern alert
    MESSAGE = "message"                        # Direct message from therapist
    REMINDER = "reminder"                      # Session reminder


class NotificationStatus(str, Enum):
    """Notification delivery status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"


class EmailNotification(BaseModel):
    """Email notification record"""
    notification_id: str = Field(description="Unique notification ID")
    recipient_email: EmailStr = Field(description="Recipient email address")
    recipient_name: str = Field(description="Recipient name")

    # Notification details
    notification_type: NotificationType
    subject: str = Field(description="Email subject line")
    content_html: str = Field(description="HTML email content")
    content_text: str = Field(description="Plain text fallback")

    # Metadata
    child_id: Optional[str] = Field(None, description="Associated child ID")
    session_id: Optional[str] = Field(None, description="Associated session ID")

    # Status
    status: NotificationStatus = NotificationStatus.PENDING
    sent_date: Optional[str] = Field(None, description="When email was sent")
    read_date: Optional[str] = Field(None, description="When email was opened (if tracked)")
    created_date: str = Field(default_factory=lambda: datetime.now().isoformat())

    # Delivery info
    error_message: Optional[str] = Field(None, description="Error if delivery failed")


class ParentMessage(BaseModel):
    """Direct message between parent and therapist"""
    message_id: str = Field(description="Unique message ID")
    child_id: str = Field(description="Associated child ID")

    # Sender/recipient
    sender_email: EmailStr
    sender_name: str
    sender_role: str = Field(description="parent or therapist")

    recipient_email: EmailStr
    recipient_name: str
    recipient_role: str

    # Message content
    subject: str = Field(max_length=200)
    content: str = Field(description="Message content")

    # Status
    read: bool = Field(default=False)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    # Threading
    reply_to: Optional[str] = Field(None, description="Message ID this is replying to")


class NotificationPreferences(BaseModel):
    """Parent's notification preferences"""
    user_email: EmailStr
    child_id: str

    # Email preferences
    session_summaries: bool = Field(default=True, description="Send session summaries")
    weekly_reports: bool = Field(default=True, description="Send weekly progress reports")
    breakthrough_alerts: bool = Field(default=True, description="Alert on breakthrough moments")
    goal_achievements: bool = Field(default=True, description="Alert when goals achieved")
    safety_concerns: bool = Field(default=True, description="Alert on safety concerns")
    session_reminders: bool = Field(default=True, description="Send session reminders")

    # Timing preferences
    weekly_report_day: str = Field(default="sunday", description="Day for weekly reports")
    reminder_hours_before: int = Field(default=24, description="Hours before session to remind", ge=1, le=72)

    # Updated
    updated_date: str = Field(default_factory=lambda: datetime.now().isoformat())


class CreateNotificationRequest(BaseModel):
    """Request to create a notification"""
    recipient_email: EmailStr
    recipient_name: str
    notification_type: NotificationType
    subject: str
    content_html: str
    content_text: str
    child_id: Optional[str] = None
    session_id: Optional[str] = None


class SendMessageRequest(BaseModel):
    """Request to send a message"""
    child_id: str
    recipient_email: EmailStr
    recipient_name: str
    recipient_role: str
    subject: str = Field(max_length=200)
    content: str
    reply_to: Optional[str] = None


class UpdatePreferencesRequest(BaseModel):
    """Request to update notification preferences"""
    session_summaries: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    breakthrough_alerts: Optional[bool] = None
    goal_achievements: Optional[bool] = None
    safety_concerns: Optional[bool] = None
    session_reminders: Optional[bool] = None
    weekly_report_day: Optional[str] = None
    reminder_hours_before: Optional[int] = Field(None, ge=1, le=72)


# Email templates
def generate_session_summary_email(child_name: str, session_data: Dict) -> Dict[str, str]:
    """Generate session summary email content"""
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #9333EA;">🎵 Session Summary for {child_name}</h2>
            <p>Here's how today's music therapy session went:</p>

            <div style="background-color: #F3E8FF; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <strong>Session Duration:</strong> {session_data.get('duration_minutes', 0)} minutes<br>
                <strong>Music Styles Used:</strong> {', '.join(session_data.get('music_styles', []))}<br>
                <strong>Engagement Level:</strong> {session_data.get('avg_engagement', 'Medium')}
            </div>

            <h3 style="color: #16A34A;">✨ Highlights</h3>
            <ul>
                {' '.join([f'<li>{highlight}</li>' for highlight in session_data.get('highlights', ['Great participation!'])])}
            </ul>

            <p style="margin-top: 20px;">View full session details in your parent portal.</p>
            <a href="https://musicasd.app/parent/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #9333EA; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Dashboard</a>
        </div>
    </body>
    </html>
    """

    text = f"""
    Session Summary for {child_name}

    Duration: {session_data.get('duration_minutes', 0)} minutes
    Music Styles: {', '.join(session_data.get('music_styles', []))}
    Engagement: {session_data.get('avg_engagement', 'Medium')}

    Highlights:
    {chr(10).join([f'- {highlight}' for highlight in session_data.get('highlights', ['Great participation!'])])}

    View full details at: https://musicasd.app/parent/dashboard
    """

    return {"html": html, "text": text}


def generate_breakthrough_email(child_name: str, breakthrough_note: str) -> Dict[str, str]:
    """Generate breakthrough moment email"""
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #16A34A;">🎉 Breakthrough Moment for {child_name}!</h2>
            <div style="background-color: #DCFCE7; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16A34A;">
                <p style="font-size: 16px; margin: 0;">{breakthrough_note}</p>
            </div>
            <p>This is wonderful progress! We're excited to share this milestone with you.</p>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">You can view all breakthrough moments in your parent portal.</p>
        </div>
    </body>
    </html>
    """

    text = f"""
    🎉 Breakthrough Moment for {child_name}!

    {breakthrough_note}

    This is wonderful progress! View all milestones at: https://musicasd.app/parent/dashboard
    """

    return {"html": html, "text": text}

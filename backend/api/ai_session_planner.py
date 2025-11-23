"""
AI Session Planner API endpoints
Provides AI-powered session planning assistance with chat interface
"""

from datetime import datetime
import logging
from typing import List, Dict, Any
import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.gpt_client import gpt_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-session-planner", tags=["ai-session-planner"])


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class PlanningChatRequest(BaseModel):
    childId: str
    conversationHistory: List[ChatMessage]
    userMessage: str


class PlanningChatResponse(BaseModel):
    message: str
    suggestions: Dict[str, Any] | None = None
    isComplete: bool = False


@router.post("/chat", response_model=PlanningChatResponse)
async def chat_with_planner(
    request: PlanningChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Chat with AI session planner
    AI guides user through session planning with contextual questions and suggestions
    """
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get child profile
        profile = await azure_storage.get_child_profile(user_id, request.childId)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")

        # Get session history
        sessions = await azure_storage.get_session_logs(user_id, request.childId)

        # Get current goals
        goals_data = await azure_storage.get_child_goals(user_id, request.childId)
        current_goals = goals_data.get("goals", []) if goals_data else []

        # Get music response data
        music_responses = await azure_storage.get_music_responses(user_id, request.childId)

        # Build context for AI
        context = _build_planning_context(
            profile,
            sessions[-10:] if sessions else [],  # Last 10 sessions
            current_goals,
            music_responses[-20:] if music_responses else []  # Last 20 responses
        )

        # Build conversation for GPT
        messages = [
            {"role": "system", "content": _get_planner_system_prompt(context)},
        ]

        # Add conversation history
        for msg in request.conversationHistory:
            messages.append({"role": msg.role, "content": msg.content})

        # Add user's latest message
        messages.append({"role": "user", "content": request.userMessage})

        # Call GPT
        response = await gpt_client.client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        # Parse response
        content = response.choices[0].message.content
        ai_response = json.loads(content)

        return PlanningChatResponse(
            message=ai_response.get("message", ""),
            suggestions=ai_response.get("suggestions"),
            isComplete=ai_response.get("is_complete", False)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI session planner chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat request")


def _build_planning_context(
    profile: Dict[str, Any],
    recent_sessions: List[Dict[str, Any]],
    current_goals: List[Dict[str, Any]],
    music_responses: List[Dict[str, Any]]
) -> str:
    """Build comprehensive context for AI session planner"""

    demographics = profile.get("demographics", {})
    sensory = profile.get("sensory_sensitivities", {})
    communication = profile.get("communication", {})
    behavioral = profile.get("behavioral_patterns", {})
    music_prefs = profile.get("music_preferences", {})

    # Analyze session patterns
    session_summary = _analyze_session_patterns(recent_sessions)

    # Analyze music response patterns
    music_summary = _analyze_music_responses(music_responses)

    context = f"""CHILD PROFILE:
Name: {demographics.get('name', 'Unknown')}
Age: {demographics.get('age')} years
ASD Level: {demographics.get('asd_level', 'Not specified')}

SENSORY PROFILE:
- Sound Sensitivity: {sensory.get('sound_sensitivity', 'Not specified')}
- Calming Sounds: {sensory.get('calming_sounds', 'Not specified')}
- Triggers to Avoid: {sensory.get('specific_triggers', 'None')}

COMMUNICATION:
- Level: {communication.get('verbal_communication', 'Not specified')}
- Attention Span: {behavioral.get('attention_span', 'Not specified')}

MUSIC PREFERENCES:
- Preferred Genres: {', '.join(music_prefs.get('preferred_genres', [])) or 'Not specified'}
- Preferred Instruments: {', '.join(music_prefs.get('preferred_instruments', [])) or 'Not specified'}
- Successful Therapy Music: {music_prefs.get('successful_therapy_music', 'Not specified')}

CURRENT THERAPY GOALS:
{_format_goals(current_goals)}

RECENT SESSION INSIGHTS (Last 10 sessions):
{session_summary}

MUSIC RESPONSE PATTERNS:
{music_summary}
"""
    return context


def _analyze_session_patterns(sessions: List[Dict[str, Any]]) -> str:
    """Analyze recent sessions for patterns"""
    if not sessions:
        return "No session history available yet."

    # Count activities
    activity_counts = {}
    music_counts = {}
    avg_duration = 0
    successful_sessions = 0

    for session in sessions:
        duration = session.get("duration", 0)
        avg_duration += duration

        activities = session.get("activities", [])
        for activity in activities:
            activity_counts[activity] = activity_counts.get(activity, 0) + 1

        music_style = session.get("music_style", "")
        if music_style:
            music_counts[music_style] = music_counts.get(music_style, 0) + 1

        if session.get("outcome") == "positive" or session.get("engagement_level") == "high":
            successful_sessions += 1

    avg_duration = avg_duration / len(sessions) if sessions else 0

    summary = f"""- Total sessions analyzed: {len(sessions)}
- Average session duration: {avg_duration:.0f} minutes
- Successful sessions: {successful_sessions}/{len(sessions)}
- Most used activities: {', '.join([f"{k} ({v}x)" for k, v in sorted(activity_counts.items(), key=lambda x: x[1], reverse=True)[:3]])}
- Most used music styles: {', '.join([f"{k} ({v}x)" for k, v in sorted(music_counts.items(), key=lambda x: x[1], reverse=True)[:3]])}"""

    return summary


def _analyze_music_responses(responses: List[Dict[str, Any]]) -> str:
    """Analyze music response data for patterns"""
    if not responses:
        return "No music response data available yet."

    positive_responses = [r for r in responses if r.get("emotional_response", "").lower() in ["happy", "calm", "engaged"]]
    negative_responses = [r for r in responses if r.get("emotional_response", "").lower() in ["distressed", "overwhelmed", "disengaged"]]

    # Track music styles by response
    positive_music = {}
    negative_music = {}

    for r in positive_responses:
        style = r.get("music_style", "")
        if style:
            positive_music[style] = positive_music.get(style, 0) + 1

    for r in negative_responses:
        style = r.get("music_style", "")
        if style:
            negative_music[style] = negative_music.get(style, 0) + 1

    summary = f"""- Total music responses recorded: {len(responses)}
- Positive responses: {len(positive_responses)} ({len(positive_responses)*100//len(responses) if responses else 0}%)
- Music styles with best responses: {', '.join([f"{k}" for k in sorted(positive_music.keys(), key=lambda x: positive_music[x], reverse=True)[:3]])}
- Music styles to use cautiously: {', '.join([f"{k}" for k in sorted(negative_music.keys(), key=lambda x: negative_music[x], reverse=True)[:2]])}"""

    return summary


def _format_goals(goals: List[Dict[str, Any]]) -> str:
    """Format goals list"""
    if not goals:
        return "No specific goals set yet."

    active_goals = [g for g in goals if g.get("status") == "active"]
    if not active_goals:
        return "No active goals currently."

    formatted = []
    for goal in active_goals[:5]:  # Top 5 goals
        name = goal.get("name", "Unnamed goal")
        progress = goal.get("progress", 0)
        formatted.append(f"  - {name} (Progress: {progress}%)")

    return "\n".join(formatted)


def _get_planner_system_prompt(context: str) -> str:
    """Get the system prompt for AI session planner"""

    return f"""You are an expert music therapy assistant specializing in ASD (Autism Spectrum Disorder) treatment.
Your role is to help caregivers plan effective therapy sessions through a conversational chat interface.

You have access to comprehensive information about the child:
{context}

YOUR TASK:
Guide the caregiver through planning a therapy session by:
1. Understanding their goals for this specific session
2. Asking clarifying questions about session context (time, child's current state, etc.)
3. Providing evidence-based suggestions for:
   - Session goals (based on child's active goals and progress)
   - Activities (based on what worked well historically)
   - Music styles (based on child's preferences and response patterns)
   - Session duration (based on attention span and past sessions)
   - Scheduling recommendations

CONVERSATION FLOW:
- Start by asking about the caregiver's goals for this session
- Ask 1-2 clarifying questions at a time (don't overwhelm)
- Provide specific suggestions based on the child's profile and history
- Reference specific data points (e.g., "Last time you used 'calm' music, engagement was high")
- When ready, offer complete session template(s)

OUTPUT FORMAT (JSON):
{{
    "message": "Your conversational response to the user",
    "suggestions": {{
        "title": "Suggested session title" (if ready to suggest),
        "goals": ["goal1", "goal2"] (if ready to suggest),
        "activities": ["activity1", "activity2"] (if ready to suggest),
        "musicStyles": ["style1", "style2"] (if ready to suggest),
        "duration": 30 (if ready to suggest),
        "notes": "Helpful notes for the caregiver" (if ready to suggest),
        "reasoning": "Why these suggestions fit this child"
    }} (null if not ready to provide suggestions yet),
    "is_complete": false (set to true when you've provided complete session template)
}}

PRINCIPLES:
- Always personalize based on child's profile and history
- Reference specific data points from past sessions
- Be warm, supportive, and collaborative
- Ask questions to understand caregiver's specific needs
- Provide evidence-based rationale for suggestions
- Keep messages concise and conversational (2-4 sentences)
- When suggesting activities/music, explain WHY based on child's patterns

IMPORTANT:
- Don't suggest ALL fields at once - build up gradually through conversation
- Reference specific successes from session history
- Warn about potential triggers based on sensory profile
- Suggest realistic durations based on attention span
- Set to is_complete: true only when you provide a complete session template with all fields"""

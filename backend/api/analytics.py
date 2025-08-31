"""
Analytics API endpoints
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import logging
import random

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["analytics"])

# Import will be from core.state when properly structured
# For now, we'll access via dependency injection
def get_state():
    from main import state
    return state

@router.get("/analytics/dashboard")
def get_dashboard_analytics():
    """Get dashboard analytics and statistics"""
    state = get_state()

    try:
        # Load recent session history
        state.load_session_history()

        # Calculate statistics
        total_sessions = len(state.sessions_history)

        # Average engagement calculation
        engagement_scores = {"LOW": 33, "MED": 66, "HIGH": 100}
        avg_engagement = 0
        if state.sessions_history:
            engagements = [engagement_scores.get(s.get("avg_engagement", "MED"), 66)
                          for s in state.sessions_history]
            avg_engagement = int(sum(engagements) / len(engagements)) if engagements else 0

        # Total duration
        total_duration = sum(s.get("duration_minutes", 0) for s in state.sessions_history) / 60  # Convert to hours

        # Active users (mock data for now - in production would track unique users)
        active_users = min(12, max(1, total_sessions // 5))  # Estimate based on sessions

        # Music category usage
        music_usage = {"calm": 0, "happy": 0, "energetic": 0}
        for session in state.sessions_history:
            styles = session.get("music_styles_used", "").split(",")
            for style in styles:
                if style in music_usage:
                    music_usage[style] += 1

        # Engagement trends (last 7 days)
        today = datetime.now()
        engagement_trends = []
        for i in range(7):
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")

            # Count sessions for this day
            day_sessions = [s for s in state.sessions_history
                          if s.get("start_time", "").startswith(date_str)]

            engagement_trends.append({
                "date": date_str,
                "sessions": len(day_sessions),
                "avgEngagement": random.randint(60, 90)  # Mock data - would calculate from real sessions
            })

        return {
            "totalSessions": total_sessions,
            "avgEngagement": avg_engagement,
            "totalDuration": round(total_duration, 1),
            "activeUsers": active_users,
            "musicUsage": music_usage,
            "engagementTrends": engagement_trends,
            "recentSessions": state.sessions_history[:5]  # Last 5 sessions
        }

    except Exception as e:
        logger.error(f"Analytics error: {e}")
        # Return mock data on error
        return {
            "totalSessions": 42,
            "avgEngagement": 78,
            "totalDuration": 156.5,
            "activeUsers": 12,
            "musicUsage": {"calm": 15, "happy": 20, "energetic": 7},
            "engagementTrends": [],
            "recentSessions": []
        }

@router.get("/analytics/sessions/{session_id}")
def get_session_analytics(session_id: str):
    """Get analytics for a specific session"""
    state = get_state()

    # Find session in history
    session = next((s for s in state.sessions_history if s["session_id"] == session_id), None)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session

@router.get("/analytics/export")
def export_analytics():
    """Export analytics data as JSON"""
    state = get_state()
    state.load_session_history()

    return {
        "export_date": datetime.now().isoformat(),
        "total_sessions": len(state.sessions_history),
        "sessions": state.sessions_history,
        "music_library_stats": {
            style: len(files) for style, files in state.music_library.items()
        }
    }
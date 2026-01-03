"""
Analytics API endpoints
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.auth import auth_service
from services.azure_storage import azure_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["analytics"])
security = HTTPBearer()

# Import will be from core.state when properly structured
# For now, we'll access via dependency injection
def get_state():
    from main import state
    return state

@router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get dashboard analytics and statistics (real data from Azure)"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get all child profiles for this user
        profiles = await azure_storage.list_child_profiles(user_id)

        # Collect all sessions across all children
        all_sessions = []
        for profile in profiles:
            child_sessions = await azure_storage.list_child_sessions(profile["id"])
            all_sessions.extend(child_sessions)

        # Calculate statistics
        total_sessions = len(all_sessions)

        # Calculate average engagement from actual session logs
        engagement_scores = {"LOW": 33, "MED": 66, "HIGH": 100}
        total_engagement_sum = 0
        engagement_count = 0

        # Calculate music usage and total duration
        music_usage = {"calm": 0, "happy": 0, "energetic": 0}
        total_duration_seconds = 0

        for session in all_sessions:
            logs = session.get("logs", [])

            # Calculate engagement from logs
            for log in logs:
                if log.get("engagement"):
                    total_engagement_sum += engagement_scores.get(log["engagement"], 66)
                    engagement_count += 1

            # Count music styles
            for log in logs:
                if log.get("music_style") and log["music_style"] in music_usage:
                    music_usage[log["music_style"]] += 1

            # Add duration
            duration = session.get("duration_seconds", 0)
            if duration:
                total_duration_seconds += duration

        avg_engagement = int(total_engagement_sum / engagement_count) if engagement_count > 0 else 0
        total_duration_hours = round(total_duration_seconds / 3600, 1)

        # Count unique children (active users)
        active_users = len(profiles)

        # Calculate REAL engagement trends (last 7 days)
        today = datetime.now()
        engagement_trends = []

        for i in range(6, -1, -1):  # Reverse order for chronological display
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")

            # Filter sessions for this day
            day_sessions = [
                s for s in all_sessions
                if s.get("start_time", "").startswith(date_str)
            ]

            # Calculate average engagement for this day
            day_engagement_sum = 0
            day_engagement_count = 0

            for session in day_sessions:
                logs = session.get("logs", [])
                for log in logs:
                    if log.get("engagement"):
                        day_engagement_sum += engagement_scores.get(log["engagement"], 66)
                        day_engagement_count += 1

            avg_day_engagement = (
                int(day_engagement_sum / day_engagement_count)
                if day_engagement_count > 0 else 0
            )

            engagement_trends.append({
                "date": date_str,
                "sessions": len(day_sessions),
                "avgEngagement": avg_day_engagement
            })

        # Get recent sessions (last 5)
        recent_sessions = sorted(
            all_sessions,
            key=lambda s: s.get("start_time", ""),
            reverse=True
        )[:5]

        return {
            "totalSessions": total_sessions,
            "avgEngagement": avg_engagement,
            "totalDuration": total_duration_hours,
            "activeUsers": active_users,
            "musicUsage": music_usage,
            "engagementTrends": engagement_trends,
            "recentSessions": recent_sessions
        }

    except Exception as e:
        logger.error("Analytics error: %s", e)
        # Return empty data on error instead of mock data
        return {
            "totalSessions": 0,
            "avgEngagement": 0,
            "totalDuration": 0.0,
            "activeUsers": 0,
            "musicUsage": {"calm": 0, "happy": 0, "energetic": 0},
            "engagementTrends": [],
            "recentSessions": []
        }

@router.get("/analytics/sessions/{session_id}")
async def get_session_analytics(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get analytics for a specific session from Azure Blob Storage"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Get all user sessions and find the matching one
        all_sessions = await azure_storage.list_user_sessions(user_id, limit=1000)

        # Debug logging
        logger.info("Looking for session_id: %s", session_id)
        logger.info("Found %d sessions for user", len(all_sessions))
        if all_sessions:
            logger.info("Sample session keys: %s", list(all_sessions[0].keys()))
            logger.info("Sample session id field: %s", all_sessions[0].get('id'))

        session = next((s for s in all_sessions if s.get("id") == session_id), None)

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Session belongs to user (already filtered by list_user_sessions)

        # Calculate analytics from session data
        logs = session.get("logs", [])
        engagement_scores = {"LOW": 30, "MED": 60, "HIGH": 90}

        # Engagement breakdown
        engagement_counts = {"LOW": 0, "MED": 0, "HIGH": 0}
        for log in logs:
            eng = log.get("engagement")
            if eng in engagement_counts:
                engagement_counts[eng] += 1

        # Music usage
        music_usage = {}
        for log in logs:
            if log.get("music_style"):
                style = log["music_style"]
                music_usage[style] = music_usage.get(style, 0) + 1

        # Events breakdown
        events = {}
        for log in logs:
            event = log.get("event", "Unknown")
            events[event] = events.get(event, 0) + 1

        return {
            "session_id": session_id,
            "child_id": session.get("child_id"),
            "child_name": session.get("child_name"),
            "start_time": session.get("start_time"),
            "end_time": session.get("end_time"),
            "duration_seconds": session.get("duration_seconds", 0),
            "status": session.get("status"),
            "total_logs": len(logs),
            "engagement_breakdown": engagement_counts,
            "music_usage": music_usage,
            "events_breakdown": events,
            "logs": logs
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get session analytics: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve session analytics"
        ) from e

@router.get("/analytics/export")
async def export_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export analytics data as JSON"""
    user_id = auth_service.get_current_user_id(credentials)
    state = get_state()

    # Get all child profiles for this user
    profiles = await azure_storage.list_child_profiles(user_id)

    # Collect all sessions
    all_sessions = []
    for profile in profiles:
        child_sessions = await azure_storage.list_child_sessions(profile["id"])
        all_sessions.extend(child_sessions)

    return {
        "export_date": datetime.now().isoformat(),
        "total_sessions": len(all_sessions),
        "sessions": all_sessions,
        "music_library_stats": {
            style: len(files) for style, files in state.music_library.items()
        }
    }


@router.get("/analytics/music-effectiveness/{child_id}")
async def analyze_music_effectiveness(
    child_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Analyze which music styles work best for this child"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Verify child profile exists and belongs to user
        profile = await azure_storage.get_child_profile(user_id, child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
        if profile["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get all sessions for this child
        sessions = await azure_storage.list_child_sessions(child_id)

        # Group by music style and track engagement
        music_stats: Dict[str, Dict[str, Any]] = {}
        engagement_values = {"HIGH": 90, "MED": 60, "LOW": 30}

        for session in sessions:
            logs = session.get("logs", [])

            current_music_style = None
            for log in logs:
                # Track when music starts
                if log.get("event") == "Music Started" and log.get("music_style"):
                    current_music_style = log["music_style"]

                    if current_music_style not in music_stats:
                        music_stats[current_music_style] = {
                            "style": current_music_style,
                            "total_sessions": 0,
                            "total_plays": 0,
                            "engagement_levels": [],
                            "avg_engagement": 0,
                            "session_ids": []
                        }

                    music_stats[current_music_style]["total_plays"] += 1
                    if session.get("id") not in music_stats[current_music_style]["session_ids"]:
                        music_stats[current_music_style]["total_sessions"] += 1
                        music_stats[current_music_style]["session_ids"].append(session.get("id"))

                # Track engagement when music is playing
                elif log.get("engagement") and current_music_style:
                    engagement_value = engagement_values.get(log["engagement"], 60)
                    music_stats[current_music_style]["engagement_levels"].append(engagement_value)

        # Calculate averages and generate insights
        for style, stats in music_stats.items():
            if stats["engagement_levels"]:
                stats["avg_engagement"] = round(
                    sum(stats["engagement_levels"]) / len(stats["engagement_levels"]),
                    1
                )
            else:
                stats["avg_engagement"] = 0

            # Remove session_ids from response (internal tracking only)
            del stats["session_ids"]

        # Sort by effectiveness (avg engagement)
        ranked = sorted(
            music_stats.values(),
            key=lambda x: x["avg_engagement"],
            reverse=True
        )

        # Generate AI insights
        child_name = profile["demographics"]["name"]
        insights = generate_music_insights(ranked, child_name, len(sessions))

        return {
            "child_id": child_id,
            "child_name": child_name,
            "total_sessions_analyzed": len(sessions),
            "music_effectiveness": ranked,
            "top_recommendation": ranked[0]["style"] if ranked else "calm",
            "ai_insights": insights
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Music effectiveness analysis error: %s", e)
        raise HTTPException(
            status_code=500, detail="Failed to analyze music effectiveness"
        ) from e


def generate_music_insights(ranked: List[Dict], child_name: str, total_sessions: int) -> str:
    """Generate AI insights about music effectiveness"""
    if not ranked:
        return f"No music usage data available for {child_name} yet. Start sessions with different music styles to build insights."

    best_style = ranked[0]
    worst_style = ranked[-1] if len(ranked) > 1 else None

    insights = []

    # Best performing style
    if best_style["avg_engagement"] >= 75:
        insights.append(
            f"🎵 **Excellent Response**: {child_name} shows outstanding engagement "
            f"({best_style['avg_engagement']:.0f}%) with {best_style['style']} music. "
            f"This is your go-to style!"
        )
    elif best_style["avg_engagement"] >= 60:
        insights.append(
            f"✅ **Good Response**: {best_style['style'].capitalize()} music works well "
            f"for {child_name} with {best_style['avg_engagement']:.0f}% average engagement."
        )
    else:
        insights.append(
            f"📊 **Moderate Response**: {best_style['style'].capitalize()} music shows "
            f"{best_style['avg_engagement']:.0f}% engagement - room for improvement."
        )

    # Usage patterns
    if best_style["total_plays"] >= 10:
        insights.append(
            f"This style has been used {best_style['total_plays']} times across "
            f"{best_style['total_sessions']} sessions, providing reliable data."
        )

    # Comparison
    if worst_style and best_style["avg_engagement"] - worst_style["avg_engagement"] > 20:
        diff = best_style['avg_engagement'] - worst_style['avg_engagement']
        insights.append(
            f"⚠️ **Significant Difference**: {best_style['style'].capitalize()} music "
            f"({best_style['avg_engagement']:.0f}%) outperforms {worst_style['style']} "
            f"({worst_style['avg_engagement']:.0f}%) by {diff:.0f} points. "
            f"Focus on {best_style['style']} for better results."
        )

    # Recommendations
    if len(ranked) == 1:
        insights.append(
            f"💡 **Recommendation**: Try experimenting with other music styles "
            f"(happy, calm, energetic) to discover what works best for {child_name}."
        )
    elif all(s["avg_engagement"] > 65 for s in ranked):
        insights.append(
            f"🌟 **Great Progress**: {child_name} responds well to all music styles! "
            f"Continue with variety to maintain engagement."
        )

    # Data reliability
    if total_sessions < 5:
        insights.append(
            f"📈 **Note**: Based on {total_sessions} session(s). "
            f"More sessions will provide more accurate insights."
        )

    return " ".join(insights)


@router.get("/analytics/engagement-trends/{child_id}")
async def get_child_engagement_trends(
    child_id: str,
    days: int = 30,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get engagement trends for a specific child over time"""
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Verify child profile
        profile = await azure_storage.get_child_profile(user_id, child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
        if profile["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get sessions
        sessions = await azure_storage.list_child_sessions(child_id)

        # Calculate engagement trends
        engagement_scores = {"LOW": 30, "MED": 60, "HIGH": 90}
        today = datetime.now()
        trends = []

        for i in range(days - 1, -1, -1):
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")

            # Filter sessions for this day
            day_sessions = [
                s for s in sessions
                if s.get("start_time", "").startswith(date_str)
            ]

            # Calculate average engagement for the day
            engagement_sum = 0
            engagement_count = 0

            for session in day_sessions:
                logs = session.get("logs", [])
                for log in logs:
                    if log.get("engagement"):
                        engagement_sum += engagement_scores.get(log["engagement"], 60)
                        engagement_count += 1

            avg_engagement = engagement_sum / engagement_count if engagement_count > 0 else None

            trends.append({
                "date": date_str,
                "session_count": len(day_sessions),
                "avg_engagement": round(avg_engagement, 1) if avg_engagement is not None else None,
                "has_data": engagement_count > 0
            })

        return {
            "child_id": child_id,
            "child_name": profile["demographics"]["name"],
            "period_days": days,
            "trends": trends,
            "total_sessions": len(sessions)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Engagement trends error: %s", e)
        raise HTTPException(
            status_code=500, detail="Failed to get engagement trends"
        ) from e

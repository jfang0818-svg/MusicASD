"""
Engagement API endpoints
"""
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["engagement"])

# Pydantic model
class EngagementUpdate(BaseModel):
    level: str  # LOW, MED, HIGH

def get_state():
    from main import state
    return state

@router.get("/engagement")
def read_engagement():
    """MCP Tool: engagement.read - Get current engagement level"""
    state = get_state()

    return {
        "level": state.engagement_level,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/engagement")
def update_engagement(update: EngagementUpdate):
    """Update engagement level from UI or MediaPipe"""
    state = get_state()

    if update.level not in ["LOW", "MED", "HIGH"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid engagement level. Must be LOW, MED, or HIGH"
        )

    old_level = state.engagement_level
    state.engagement_level = update.level
    logger.info("Engagement updated: %s -> %s", old_level, update.level)

    # Log engagement change if session is active
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": "Engagement Change",
            "engagement": update.level,
            "previous_engagement": old_level
        }
        state.logs.append(log_entry)

    return {
        "status": "success",
        "previous": old_level,
        "current": state.engagement_level,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/engagement/history")
def get_engagement_history():
    """Get engagement history for current session"""
    state = get_state()

    if not state.session_active:
        return {"history": [], "message": "No active session"}

    # Filter logs for engagement changes
    engagement_logs = [
        log for log in state.logs
        if log.get("engagement") or "Engagement" in log.get("event", "")
    ]

    return {
        "session_id": state.session_id,
        "history": engagement_logs,
        "current": state.engagement_level
    }

@router.post("/engagement/simulate")
def simulate_engagement_pattern(pattern: str = "random"):
    """Simulate engagement patterns for testing"""
    state = get_state()

    patterns = {
        "increasing": ["LOW", "LOW", "MED", "MED", "HIGH"],
        "decreasing": ["HIGH", "HIGH", "MED", "MED", "LOW"],
        "stable": ["MED", "MED", "MED", "MED", "MED"],
        "random": ["LOW", "HIGH", "MED", "LOW", "HIGH"]
    }

    if pattern not in patterns:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pattern. Choose from: {list(patterns.keys())}"
        )

    return {
        "pattern": pattern,
        "sequence": patterns[pattern],
        "message": "Use these values to test engagement responses"
    }

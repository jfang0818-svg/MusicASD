"""
Session API endpoints
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import time
import csv
import sqlite3
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/session", tags=["session"])

# Pydantic models
class SessionLog(BaseModel):
    event: str
    note: Optional[str] = ""
    engagement: Optional[str] = None
    music_style: Optional[str] = None
    suggestion: Optional[str] = None
    caregiver_action: Optional[str] = None
    child_response: Optional[str] = None

def get_state():
    from main import state
    return state

@router.post("/start")
def start_session():
    """Start a new therapy session"""
    state = get_state()

    # End previous session if active
    if state.session_active:
        logger.warning("Previous session was still active, ending it")
        stop_session()

    state.session_active = True
    state.session_id = f"session_{int(time.time())}"
    state.logs = []

    # Create initial log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Started",
        "engagement": state.engagement_level
    }
    state.logs.append(log_entry)

    logger.info(f"Session started: {state.session_id}")
    return {
        "status": "started",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/stop")
def stop_session():
    """Stop current therapy session"""
    state = get_state()

    if not state.session_active:
        return {
            "status": "no_active_session",
            "message": "No session to stop"
        }

    # Stop music if playing
    if state.music_playing:
        try:
            import pygame
            pygame.mixer.music.stop()
            state.music_playing = False
            state.current_music = None
        except Exception as e:
            logger.error(f"Error stopping music: {e}")

    # Add final log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Ended"
    }
    state.logs.append(log_entry)

    # Save session summary for analytics
    state.save_session_summary()

    session_id = state.session_id
    log_count = len(state.logs)

    # Reset session state
    state.session_active = False
    state.camera_enabled = False

    logger.info(f"Session stopped: {session_id} with {log_count} logs")
    return {
        "status": "stopped",
        "session_id": session_id,
        "total_logs": log_count,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/status")
def session_status():
    """Get current session status"""
    state = get_state()

    return {
        "active": state.session_active,
        "session_id": state.session_id,
        "engagement": state.engagement_level,
        "music_playing": state.music_playing,
        "current_music": state.current_music,
        "camera_enabled": state.camera_enabled,
        "log_count": len(state.logs),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/log")
def log_session(log: SessionLog):
    """Log session events"""
    state = get_state()

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session")

    timestamp = datetime.now()

    # Add to memory
    log_entry = {
        "timestamp": timestamp.isoformat(),
        "session_id": state.session_id,
        **log.dict()
    }
    state.logs.append(log_entry)

    # Save to database
    try:
        conn = sqlite3.connect('data/session_logs.db')
        c = conn.cursor()
        c.execute("""INSERT INTO logs
                     (session_id, timestamp, event, engagement, music_style,
                      suggestion, caregiver_action, child_response, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (state.session_id, timestamp.isoformat(), log.event, log.engagement,
                   log.music_style, log.suggestion, log.caregiver_action,
                   log.child_response, log.note))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to save log to database: {e}")

    # Also save to CSV
    csv_file = f"data/session_{state.session_id}.csv"
    file_exists = os.path.isfile(csv_file)

    try:
        with open(csv_file, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=log_entry.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(log_entry)
    except Exception as e:
        logger.error(f"Failed to save log to CSV: {e}")

    logger.info(f"Event logged: {log.event}")
    return {"status": "logged", "timestamp": timestamp.isoformat()}

@router.get("/logs")
def get_logs():
    """Get session logs"""
    state = get_state()

    if not state.session_active and not state.logs:
        return {
            "logs": [],
            "count": 0,
            "session_id": None,
            "message": "No active session or logs"
        }

    return {
        "logs": state.logs,
        "count": len(state.logs),
        "session_id": state.session_id
    }

@router.get("/logs/{session_id}")
def get_session_logs(session_id: str):
    """Get logs for a specific session from database"""
    try:
        conn = sqlite3.connect('data/session_logs.db')
        c = conn.cursor()
        c.execute("""SELECT timestamp, event, engagement, music_style,
                            suggestion, caregiver_action, child_response, notes
                     FROM logs WHERE session_id = ?
                     ORDER BY timestamp""", (session_id,))

        rows = c.fetchall()
        conn.close()

        logs = []
        for row in rows:
            logs.append({
                "timestamp": row[0],
                "event": row[1],
                "engagement": row[2],
                "music_style": row[3],
                "suggestion": row[4],
                "caregiver_action": row[5],
                "child_response": row[6],
                "notes": row[7]
            })

        return {
            "session_id": session_id,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        logger.error(f"Failed to retrieve logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pause")
def pause_session():
    """Pause current session"""
    state = get_state()

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session to pause")

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Paused"
    }
    state.logs.append(log_entry)

    return {
        "status": "paused",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/resume")
def resume_session():
    """Resume paused session"""
    state = get_state()

    if not state.session_id:
        raise HTTPException(status_code=400, detail="No session to resume")

    state.session_active = True

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": state.session_id,
        "event": "Session Resumed"
    }
    state.logs.append(log_entry)

    return {
        "status": "resumed",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/caregiver/action")
def caregiver_action(request: dict = Body(...)):
    """Record caregiver action on GPT suggestion"""
    state = get_state()

    action = request.get("action")
    note = request.get("note")
    modified_style = request.get("modified_style")

    if not state.session_active:
        raise HTTPException(status_code=400, detail="No active session")

    # Log the action
    log_entry = SessionLog(
        event=f"Caregiver Action: {action}",
        note=note or "",
        caregiver_action=action,
        music_style=modified_style
    )

    # Use existing log_session function logic
    timestamp = datetime.now()
    log_data = {
        "timestamp": timestamp.isoformat(),
        "session_id": state.session_id,
        **log_entry.dict()
    }
    state.logs.append(log_data)

    logger.info(f"Caregiver action recorded: {action}")

    return {
        "status": "success",
        "action": action,
        "timestamp": timestamp.isoformat()
    }

@router.post("/gpt/suggest")
def get_gpt_suggestion():
    """Get GPT suggestion (mock for now, will integrate with gpt_client.py)"""
    state = get_state()

    # Mock implementation - will be replaced with actual GPT client
    suggestions = {
        "LOW": {
            "suggestion": "Try some uplifting music to gently increase engagement",
            "style": "happy",
            "phrase": "Let's listen to happy sounds together!"
        },
        "MED": {
            "suggestion": "Maintain the current balanced state with calm music",
            "style": "calm",
            "phrase": "You're doing great! Let's keep going."
        },
        "HIGH": {
            "suggestion": "Use calming music to help regulate energy",
            "style": "calm",
            "phrase": "Let's take a peaceful moment together."
        }
    }

    current_suggestion = suggestions.get(state.engagement_level, suggestions["MED"])

    # Log the suggestion
    if state.session_active:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": state.session_id,
            "event": "GPT Suggestion Generated",
            "suggestion": current_suggestion["suggestion"],
            "music_style": current_suggestion["style"]
        }
        state.logs.append(log_entry)

    return current_suggestion

@router.post("/audio/mode")
def set_audio_mode(request: dict = Body(...)):
    """Set audio mode (files or generated)"""
    mode = request.get("mode", "files")

    if mode not in ["files", "generated"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'files' or 'generated'")

    # Store mode in state if needed
    return {"status": "success", "mode": mode}
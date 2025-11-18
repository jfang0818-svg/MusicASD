"""
WebSocket endpoint for real-time video/audio analysis
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.video_analyzer import video_analyzer
from services.audio_analyzer import audio_analyzer
from services.azure_storage import azure_storage
import json
import asyncio
from datetime import datetime
import logging
import base64

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/analysis/{session_id}")
async def websocket_analysis_endpoint(
    websocket: WebSocket,
    session_id: str
):
    """
    WebSocket endpoint for real-time analysis

    Expected message format from client:
    {
        "type": "video_frame" | "audio_chunk",
        "data": base64_encoded_data,
        "timestamp": ISO-8601
    }

    Response format (every 5 seconds):
    {
        "type": "analysis_update",
        "video_analysis": {...},
        "audio_analysis": {...},
        "timestamp": ISO-8601
    }
    """
    await websocket.accept()

    logger.info(f"WebSocket connection established for session {session_id}")

    analysis_buffer = {
        "video": [],
        "audio": []
    }
    last_analysis_time = datetime.now()

    try:
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            message = json.loads(data)

            message_type = message.get("type")
            payload = message.get("data")

            if message_type == "video_frame":
                # Decode base64 and add to buffer for batch processing
                frame_bytes = base64.b64decode(payload)
                analysis_buffer["video"].append(frame_bytes)

            elif message_type == "audio_chunk":
                # Decode base64 and add to buffer
                audio_bytes = base64.b64decode(payload)
                analysis_buffer["audio"].append(audio_bytes)

            # Process every 5 seconds
            current_time = datetime.now()
            time_diff = (current_time - last_analysis_time).total_seconds()

            if time_diff >= 5.0:
                # Process accumulated data
                analysis_result = await process_analysis(
                    session_id,
                    analysis_buffer
                )

                # Send analysis back to client
                await websocket.send_text(json.dumps(analysis_result))

                # Save metadata to session
                await save_analysis_metadata(session_id, analysis_result)

                # Reset buffer and timer
                analysis_buffer = {"video": [], "audio": []}
                last_analysis_time = current_time

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup
        try:
            await websocket.close()
        except:
            pass

async def process_analysis(session_id: str, buffer: dict) -> dict:
    """Process buffered video and audio data"""

    video_analysis = None
    audio_analysis = None

    # Analyze latest video frame
    if buffer["video"]:
        latest_frame = buffer["video"][-1]
        video_analysis = video_analyzer.analyze_frame(latest_frame)

    # Analyze latest audio chunk
    if buffer["audio"]:
        latest_audio = buffer["audio"][-1]
        audio_analysis = audio_analyzer.analyze_audio_chunk(latest_audio)

    return {
        "type": "analysis_update",
        "session_id": session_id,
        "video_analysis": video_analysis,
        "audio_analysis": audio_analysis,
        "timestamp": datetime.now().isoformat()
    }

async def save_analysis_metadata(session_id: str, analysis: dict):
    """Save analysis metadata to session (no video/audio storage)"""
    try:
        # Extract session data from session_id
        # Session ID format: child_id_timestamp
        parts = session_id.split("_")
        if len(parts) >= 2:
            child_id = parts[0]
        else:
            child_id = "unknown"

        # Get existing session
        try:
            session = await azure_storage.get_session(child_id, session_id)
        except:
            # If session doesn't exist yet, create minimal structure
            session = {
                "session_id": session_id,
                "child_id": child_id,
                "analysis_metadata": []
            }

        if session:
            # Add analysis metadata
            if "analysis_metadata" not in session:
                session["analysis_metadata"] = []

            video_data = analysis.get("video_analysis", {})
            audio_data = analysis.get("audio_analysis", {})

            session["analysis_metadata"].append({
                "timestamp": analysis["timestamp"],
                "emotion": video_data.get("emotion") if video_data else None,
                "movement_level": video_data.get("movement_level") if video_data else None,
                "engagement_score": video_data.get("engagement_score") if video_data else None,
                "vocal_pattern": audio_data.get("vocal_pattern") if audio_data else None,
                "sound_level_db": audio_data.get("sound_level_db") if audio_data else None,
                "vocal_pitch_hz": audio_data.get("vocal_pitch_hz") if audio_data else None
            })

            # Save updated session (metadata only)
            await azure_storage.save_session(child_id, session_id, session)

    except Exception as e:
        logger.error(f"Failed to save analysis metadata: {e}")

"""
Project ASD Backend Server - Fixed for Existing Project Structure
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import csv
import sqlite3
from datetime import datetime
import random
import numpy as np
import scipy.io.wavfile as wavfile
from pathlib import Path
import asyncio
import base64
import io
import pygame
import threading
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Project ASD MCP Server", version="2.0.0")

# Configure CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pygame mixer for audio
try:
    pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
    logger.info("Pygame mixer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize pygame mixer: {e}")

# Pydantic models
class EngagementUpdate(BaseModel):
    level: str  # LOW, MED, HIGH

class MusicRequest(BaseModel):
    style: str  # calm, happy, energetic
    volume: float = 0.7
    file: Optional[str] = None

class SessionLog(BaseModel):
    event: str
    note: Optional[str] = ""
    engagement: Optional[str] = None
    music_style: Optional[str] = None
    suggestion: Optional[str] = None
    caregiver_action: Optional[str] = None
    child_response: Optional[str] = None

class GenerateMusicRequest(BaseModel):
    style: str = "calm"
    duration: float = 5.0
    filename: str = "generated"
    tempo: int = 120
    key: str = "C"

class CameraToggle(BaseModel):
    enabled: bool

# Global state management
class SessionState:
    def __init__(self):
        self.engagement_level = "MED"
        self.session_active = False
        self.session_id = None
        self.current_music = None
        self.music_playing = False
        self.logs = []
        self.music_library = {"calm": [], "happy": [], "energetic": []}
        self.generated_tones = []
        self.camera_enabled = False
        self.init_directories()
        self.init_database()
        self.scan_music_library()

    def init_directories(self):
        """Create necessary directories"""
        # Create directories in backend folder
        Path("data").mkdir(exist_ok=True)
        Path("logs").mkdir(exist_ok=True)

        # Create generated music directory
        Path("assets/music/generated").mkdir(parents=True, exist_ok=True)

        logger.info("Directories initialized")

    def scan_music_library(self):
        """Scan and load all music files from assets folder"""
        self.music_library = {"calm": [], "happy": [], "energetic": []}

        # IMPORTANT: Look for music in the parent directory's assets folder
        # The music files are in musicbuddy/assets/music/, not backend/assets/music/
        parent_assets_path = Path("../assets/music")
        local_assets_path = Path("assets/music")

        # Check both locations
        for assets_path in [parent_assets_path, local_assets_path]:
            if assets_path.exists():
                logger.info(f"Scanning music library at: {assets_path.absolute()}")

                for style in ["calm", "happy", "energetic"]:
                    style_path = assets_path / style
                    if style_path.exists():
                        # Scan for audio files
                        for ext in ['*.mp3', '*.wav', '*.ogg', '*.m4a']:
                            for file_path in style_path.glob(ext):
                                if file_path.is_file():
                                    file_info = {
                                        "name": file_path.name,
                                        "path": str(file_path.absolute()),
                                        "size": file_path.stat().st_size,
                                        "duration": self.get_audio_duration(str(file_path.absolute()))
                                    }
                                    # Avoid duplicates
                                    if not any(f["name"] == file_info["name"] for f in self.music_library[style]):
                                        self.music_library[style].append(file_info)
                                        logger.info(f"Found: {file_path.name} in {style} ({assets_path})")

        # Also scan for generated files
        generated_path = Path("assets/music/generated")
        if generated_path.exists():
            for file_path in generated_path.glob("*.wav"):
                # Determine style from filename if possible
                style = "calm"  # default
                if "happy" in file_path.name.lower():
                    style = "happy"
                elif "energetic" in file_path.name.lower():
                    style = "energetic"

                file_info = {
                    "name": file_path.name,
                    "path": str(file_path.absolute()),
                    "size": file_path.stat().st_size,
                    "duration": self.get_audio_duration(str(file_path.absolute())),
                    "generated": True
                }

                # Add to generated tones list
                self.generated_tones.append({
                    "name": file_path.name,
                    "style": style,
                    "duration": file_info["duration"],
                    "created": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })

        total_files = sum(len(files) for files in self.music_library.values())
        logger.info(f"Music library loaded: {total_files} files total")
        for style, files in self.music_library.items():
            logger.info(f"  {style}: {len(files)} files")

    def get_audio_duration(self, filepath):
        """Get audio file duration in seconds"""
        try:
            # Try with pygame
            sound = pygame.mixer.Sound(filepath)
            return round(sound.get_length(), 2)
        except Exception as e:
            logger.warning(f"Could not get duration for {filepath}: {e}")
            return 0

    def init_database(self):
        """Initialize SQLite database for session logs"""
        try:
            conn = sqlite3.connect('data/session_logs.db')
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS logs
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          session_id TEXT,
                          timestamp TEXT,
                          event TEXT,
                          engagement TEXT,
                          music_style TEXT,
                          suggestion TEXT,
                          caregiver_action TEXT,
                          child_response TEXT,
                          notes TEXT)''')
            conn.commit()
            conn.close()
            logger.info("Database initialized")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")

# Initialize state
state = SessionState()

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "Project ASD MCP Server Running",
        "version": "2.0.0",
        "music_files": sum(len(files) for files in state.music_library.values()),
        "endpoints": {
            "engagement": "/engagement (GET/POST)",
            "music": "/music/play, /music/stop, /music/library",
            "session": "/session/start, /session/stop, /session/status",
            "camera": "/camera/toggle, /camera/status"
        }
    }

# ENGAGEMENT ENDPOINTS - FIXED
@app.get("/engagement")
def read_engagement():
    """MCP Tool: engagement.read - Get current engagement level"""
    return {
        "level": state.engagement_level,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/engagement")
def update_engagement(update: EngagementUpdate):
    """Update engagement level from UI or MediaPipe"""
    if update.level not in ["LOW", "MED", "HIGH"]:
        raise HTTPException(status_code=400, detail="Invalid engagement level. Must be LOW, MED, or HIGH")

    old_level = state.engagement_level
    state.engagement_level = update.level
    logger.info(f"Engagement updated: {old_level} -> {update.level}")

    return {
        "status": "success",
        "previous": old_level,
        "current": state.engagement_level,
        "timestamp": datetime.now().isoformat()
    }

# MUSIC ENDPOINTS
@app.post("/music/play")
def play_music(request: MusicRequest):
    """Play music with specified style"""
    try:
        if request.style not in ["calm", "happy", "energetic"]:
            raise HTTPException(status_code=400, detail=f"Invalid style: {request.style}")

        # Get available files for this style
        music_files = state.music_library.get(request.style, [])

        if not music_files:
            logger.warning(f"No music files for style {request.style}, generating tone")
            return generate_fallback_tone(request.style, request.volume)

        # Select specific file or random
        if request.file:
            music_file = next((f for f in music_files if f["name"] == request.file), None)
            if not music_file:
                music_file = random.choice(music_files)
        else:
            music_file = random.choice(music_files)

        # Play the music file
        logger.info(f"Playing: {music_file['name']} from {music_file['path']}")
        pygame.mixer.music.load(music_file["path"])
        pygame.mixer.music.set_volume(request.volume)
        pygame.mixer.music.play()

        state.current_music = music_file["name"]
        state.music_playing = True

        return {
            "status": "playing",
            "style": request.style,
            "file": music_file["name"],
            "duration": music_file["duration"],
            "volume": request.volume
        }
    except Exception as e:
        logger.error(f"Error playing music: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/music/stop")
def stop_music():
    """Stop currently playing music"""
    try:
        pygame.mixer.music.stop()
        state.music_playing = False
        state.current_music = None
        logger.info("Music stopped")
        return {"status": "stopped", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Error stopping music: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/music/status")
def music_status():
    """Get current music playback status"""
    is_playing = pygame.mixer.music.get_busy()
    return {
        "playing": is_playing,
        "current": state.current_music,
        "position": pygame.mixer.music.get_pos() if is_playing else 0
    }

@app.get("/music/library")
def get_music_library():
    """Get available music files by style"""
    # Rescan library to ensure it's up to date
    state.scan_music_library()

    # Include file count for each style
    library_with_counts = {}
    for style, files in state.music_library.items():
        library_with_counts[style] = {
            "files": files,
            "count": len(files)
        }

    return {
        "library": state.music_library,  # Keep backward compatibility
        "detailed": library_with_counts,
        "total_files": sum(len(files) for files in state.music_library.values()),
        "generated_count": len(state.generated_tones)
    }

@app.post("/music/upload/{style}")
async def upload_music(style: str, file: UploadFile = File(...)):
    """Upload new music file to library"""
    if style not in ["calm", "happy", "energetic"]:
        raise HTTPException(status_code=400, detail="Invalid style")

    try:
        # Save to the parent assets folder
        file_path = Path(f"../assets/music/{style}") / file.filename
        file_path.parent.mkdir(parents=True, exist_ok=True)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Rescan library
        state.scan_music_library()

        logger.info(f"Uploaded {file.filename} to {style}")
        return {
            "status": "success",
            "file": file.filename,
            "style": style,
            "path": str(file_path)
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/music/generate")
def generate_music(request: GenerateMusicRequest):
    """Generate synthetic music/tones with customizable parameters"""
    try:
        sample_rate = 22050
        duration_samples = int(sample_rate * request.duration)

        # Generate frequencies based on style and key
        base_freq = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.00, "A": 440.00}
        root = base_freq.get(request.key, 261.63)

        if request.style == "calm":
            frequencies = [root, root * 1.25, root * 1.5]  # Root, major third, fifth
            tempo_factor = 0.5
        elif request.style == "happy":
            frequencies = [root, root * 1.25, root * 1.5, root * 2]  # Add octave
            tempo_factor = 1.0
        else:  # energetic
            frequencies = [root, root * 1.125, root * 1.25, root * 1.5, root * 1.667]  # Pentatonic
            tempo_factor = 1.5

        # Adjust tempo
        beat_duration = 60.0 / (request.tempo * tempo_factor)

        # Generate waveform
        t = np.linspace(0, request.duration, duration_samples)
        wave = np.zeros(duration_samples)

        for i, freq in enumerate(frequencies):
            # Add main tone with harmonics
            wave += 0.5 * np.sin(2 * np.pi * freq * t) * (1 - i * 0.15)
            wave += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * (1 - i * 0.15)

            # Add rhythm pattern
            beat_pattern = np.sin(2 * np.pi * t / beat_duration) > 0
            wave += 0.1 * np.sin(2 * np.pi * freq * 0.5 * t) * beat_pattern

        # Apply envelope
        attack = int(0.1 * duration_samples)
        decay = int(0.2 * duration_samples)
        sustain_level = 0.7
        release = int(0.3 * duration_samples)

        envelope = np.ones(duration_samples)
        envelope[:attack] = np.linspace(0, 1, attack)
        envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
        envelope[-release:] = np.linspace(sustain_level, 0, release)

        wave = wave * envelope

        # Normalize and convert to int16
        wave = np.int16(wave / np.max(np.abs(wave)) * 32767 * 0.7)

        # Save file to generated folder
        timestamp = int(time.time())
        filename = f"{request.filename}_{request.style}_{timestamp}.wav"
        filepath = Path(f"assets/music/generated") / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        wavfile.write(str(filepath), sample_rate, wave)

        # Update library and generated tones list
        state.scan_music_library()

        # Add to generated tones list with all parameters
        tone_info = {
            "name": filename,
            "style": request.style,
            "duration": request.duration,
            "tempo": request.tempo,
            "key": request.key,
            "created": datetime.now().isoformat()
        }
        state.generated_tones.append(tone_info)

        logger.info(f"Generated tone: {filename}")
        return {
            "status": "success",
            "filename": filename,
            "style": request.style,
            "duration": request.duration,
            "tempo": request.tempo,
            "key": request.key,
            "path": str(filepath)
        }
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/music/generated")
def get_generated_tones():
    """Get list of generated tones with details"""
    # Rescan to pick up any new generated files
    generated_path = Path("assets/music/generated")
    if generated_path.exists():
        for file_path in generated_path.glob("*.wav"):
            # Check if already in list
            if not any(t["name"] == file_path.name for t in state.generated_tones):
                # Add new file to list
                state.generated_tones.append({
                    "name": file_path.name,
                    "style": "calm",  # default
                    "duration": state.get_audio_duration(str(file_path.absolute())),
                    "created": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })

    return {
        "tones": state.generated_tones,
        "count": len(state.generated_tones)
    }

# SESSION ENDPOINTS
@app.post("/session/start")
def start_session():
    """Start a new therapy session"""
    state.session_active = True
    state.session_id = f"session_{int(time.time())}"
    state.logs = []
    logger.info(f"Session started: {state.session_id}")
    return {
        "status": "started",
        "session_id": state.session_id,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/session/stop")
def stop_session():
    """Stop current therapy session"""
    if state.music_playing:
        stop_music()

    session_id = state.session_id
    log_count = len(state.logs)

    state.session_active = False
    state.camera_enabled = False

    logger.info(f"Session stopped: {session_id} with {log_count} logs")
    return {
        "status": "stopped",
        "session_id": session_id,
        "total_logs": log_count,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/gpt/suggest")
def get_gpt_suggestion():
    return {
        "suggestion": "Generated suggestion",
        "style": "calm",
        "phrase": "Let's try some relaxing music"
    }

@app.post("/audio/mode")
def set_audio_mode(request: dict = Body(...)):
    mode = request.get("mode", "files")
    # Store or use the mode as needed
    return {"status": "success", "mode": mode}

@app.get("/session/status")
def session_status():
    """Get current session status"""
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

@app.post("/session/log")
def log_session(log: SessionLog):
    """Log session events"""
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

@app.get("/session/logs")
def get_logs():
    """Get session logs"""
    return {
        "logs": state.logs,
        "count": len(state.logs),
        "session_id": state.session_id
    }

@app.post("/caregiver/action")
def caregiver_action(request: dict = Body(...)):
    """Record caregiver action on GPT suggestion"""
    action = request.get("action")
    note = request.get("note")
    modified_style = request.get("modified_style")

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

# CAMERA ENDPOINTS
@app.post("/camera/toggle")
def toggle_camera(toggle: CameraToggle):
    """Enable/disable camera for MediaPipe pose detection"""
    state.camera_enabled = toggle.enabled
    logger.info(f"Camera {'enabled' if toggle.enabled else 'disabled'}")
    return {
        "status": "success",
        "camera_enabled": state.camera_enabled,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/camera/status")
def camera_status():
    """Get camera status"""
    return {
        "enabled": state.camera_enabled,
        "timestamp": datetime.now().isoformat()
    }

# Helper function
def generate_fallback_tone(style: str, volume: float):
    """Generate a simple tone when no music files available"""
    try:
        sample_rate = 22050
        duration = 3.0

        if style == "calm":
            frequency = 432  # A4 tuned lower
        elif style == "happy":
            frequency = 523.25  # C5
        else:  # energetic
            frequency = 659.25  # E5

        # Generate sine wave
        t = np.linspace(0, duration, int(sample_rate * duration))
        wave = np.sin(2 * np.pi * frequency * t)

        # Add harmonics
        wave += 0.5 * np.sin(2 * np.pi * frequency * 2 * t)
        wave += 0.25 * np.sin(2 * np.pi * frequency * 3 * t)

        # Apply envelope
        envelope = np.exp(-t / duration * 2)
        wave = wave * envelope * volume

        # Convert to pygame sound
        wave_int = np.int16(wave * 32767)
        stereo_wave = np.column_stack((wave_int, wave_int))
        sound = pygame.sndarray.make_sound(stereo_wave)

        # Play the generated tone
        channel = sound.play()

        state.current_music = f"Generated {style} tone"
        state.music_playing = True

        return {
            "status": "playing",
            "style": style,
            "type": "generated_tone",
            "frequency": frequency,
            "duration": duration
        }
    except Exception as e:
        logger.error(f"Failed to generate fallback tone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "pygame_initialized": pygame.mixer.get_init() is not None,
        "session_active": state.session_active,
        "music_files_loaded": sum(len(files) for files in state.music_library.values()),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("🎵 Project ASD MCP Server v2.0 - Fixed")
    print("=" * 60)
    print("📁 Scanning for music files...")

    # Show found files
    for style, files in state.music_library.items():
        print(f"   {style}: {len(files)} files")
        for file in files[:3]:  # Show first 3 files
            print(f"      - {file['name']}")
        if len(files) > 3:
            print(f"      ... and {len(files) - 3} more")

    print("=" * 60)
    print("🌐 Server starting at http://localhost:8000")
    print("📊 API docs at http://localhost:8000/docs")
    print("💡 Frontend should connect to http://localhost:3000")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
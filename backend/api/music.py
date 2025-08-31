"""
Music API endpoints
"""
from fastapi import APIRouter, HTTPException, File, UploadFile, Body
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from datetime import datetime
import random
import numpy as np
import scipy.io.wavfile as wavfile
import pygame
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/music", tags=["music"])

# Pydantic models
class MusicRequest(BaseModel):
    style: str  # calm, happy, energetic
    volume: float = 0.7
    file: Optional[str] = None

class GenerateMusicRequest(BaseModel):
    style: str = "calm"
    duration: float = 5.0
    filename: str = "generated"
    tempo: int = 120
    key: str = "C"

def get_state():
    from main import state
    return state

@router.post("/play")
def play_music(request: MusicRequest):
    """Play music with specified style"""
    state = get_state()

    try:
        if request.style not in ["calm", "happy", "energetic"]:
            raise HTTPException(status_code=400, detail=f"Invalid style: {request.style}")

        music_files = state.music_library.get(request.style, [])

        if not music_files:
            logger.warning(f"No music files for style {request.style}, generating tone")
            return generate_fallback_tone(request.style, request.volume)

        if request.file:
            music_file = next((f for f in music_files if f["name"] == request.file), None)
            if not music_file:
                music_file = random.choice(music_files)
        else:
            music_file = random.choice(music_files)

        logger.info(f"Playing: {music_file['name']} from {music_file['path']}")
        pygame.mixer.music.load(music_file["path"])
        pygame.mixer.music.set_volume(request.volume)
        pygame.mixer.music.play()

        state.current_music = music_file["name"]
        state.music_playing = True

        # Log music play event if session is active
        if state.session_active:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "session_id": state.session_id,
                "event": "Music Started",
                "music_style": request.style,
                "music_file": music_file["name"]
            }
            state.logs.append(log_entry)

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

@router.post("/stop")
def stop_music():
    """Stop currently playing music"""
    state = get_state()

    try:
        pygame.mixer.music.stop()
        previous_music = state.current_music
        state.music_playing = False
        state.current_music = None
        logger.info("Music stopped")

        # Log music stop event if session is active
        if state.session_active and previous_music:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "session_id": state.session_id,
                "event": "Music Stopped",
                "music_file": previous_music
            }
            state.logs.append(log_entry)

        return {"status": "stopped", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Error stopping music: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/status")
def music_status():
    """Get current music playback status"""
    state = get_state()

    is_playing = pygame.mixer.music.get_busy()
    return {
        "playing": is_playing,
        "current": state.current_music,
        "position": pygame.mixer.music.get_pos() if is_playing else 0
    }

@router.get("/library")
def get_music_library():
    """Get available music files by style"""
    state = get_state()

    # Rescan library to ensure it's up to date
    state.scan_music_library()

    library_with_counts = {}
    for style, files in state.music_library.items():
        library_with_counts[style] = {
            "files": files,
            "count": len(files)
        }

    return {
        "library": state.music_library,
        "detailed": library_with_counts,
        "total_files": sum(len(files) for files in state.music_library.values()),
        "generated_count": len(state.generated_tones)
    }

@router.post("/upload/{style}")
async def upload_music(style: str, file: UploadFile = File(...)):
    """Upload new music file to library"""
    state = get_state()

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

@router.post("/generate")
def generate_music(request: GenerateMusicRequest):
    """Generate synthetic music/tones"""
    state = get_state()

    try:
        sample_rate = 22050
        duration_samples = int(sample_rate * request.duration)

        base_freq = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.00, "A": 440.00}
        root = base_freq.get(request.key, 261.63)

        if request.style == "calm":
            frequencies = [root, root * 1.25, root * 1.5]
            tempo_factor = 0.5
        elif request.style == "happy":
            frequencies = [root, root * 1.25, root * 1.5, root * 2]
            tempo_factor = 1.0
        else:  # energetic
            frequencies = [root, root * 1.125, root * 1.25, root * 1.5, root * 1.667]
            tempo_factor = 1.5

        beat_duration = 60.0 / (request.tempo * tempo_factor)

        t = np.linspace(0, request.duration, duration_samples)
        wave = np.zeros(duration_samples)

        for i, freq in enumerate(frequencies):
            wave += 0.5 * np.sin(2 * np.pi * freq * t) * (1 - i * 0.15)
            wave += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * (1 - i * 0.15)
            beat_pattern = np.sin(2 * np.pi * t / beat_duration) > 0
            wave += 0.1 * np.sin(2 * np.pi * freq * 0.5 * t) * beat_pattern

        attack = int(0.1 * duration_samples)
        decay = int(0.2 * duration_samples)
        sustain_level = 0.7
        release = int(0.3 * duration_samples)

        envelope = np.ones(duration_samples)
        envelope[:attack] = np.linspace(0, 1, attack)
        envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
        envelope[-release:] = np.linspace(sustain_level, 0, release)

        wave = wave * envelope
        wave = np.int16(wave / np.max(np.abs(wave)) * 32767 * 0.7)

        timestamp = int(time.time())
        filename = f"{request.filename}_{request.style}_{timestamp}.wav"
        filepath = Path(f"assets/music/generated") / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        wavfile.write(str(filepath), sample_rate, wave)

        state.scan_music_library()

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

@router.get("/generated")
def get_generated_tones():
    """Get list of generated tones"""
    state = get_state()

    generated_path = Path("assets/music/generated")
    if generated_path.exists():
        for file_path in generated_path.glob("*.wav"):
            if not any(t["name"] == file_path.name for t in state.generated_tones):
                state.generated_tones.append({
                    "name": file_path.name,
                    "style": "calm",
                    "duration": state.get_audio_duration(str(file_path.absolute())),
                    "created": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })

    return {
        "tones": state.generated_tones,
        "count": len(state.generated_tones)
    }

@router.post("/volume")
def set_volume(volume: float = Body(..., ge=0.0, le=1.0)):
    """Set music volume (0.0 to 1.0)"""
    pygame.mixer.music.set_volume(volume)
    return {"status": "success", "volume": volume}

@router.get("/volume")
def get_volume():
    """Get current music volume"""
    return {"volume": pygame.mixer.music.get_volume()}

# Helper function
def generate_fallback_tone(style: str, volume: float):
    """Generate a simple tone when no music files available"""
    state = get_state()

    try:
        sample_rate = 22050
        duration = 3.0

        if style == "calm":
            frequency = 432
        elif style == "happy":
            frequency = 523.25
        else:  # energetic
            frequency = 659.25

        t = np.linspace(0, duration, int(sample_rate * duration))
        wave = np.sin(2 * np.pi * frequency * t)

        wave += 0.5 * np.sin(2 * np.pi * frequency * 2 * t)
        wave += 0.25 * np.sin(2 * np.pi * frequency * 3 * t)

        envelope = np.exp(-t / duration * 2)
        wave = wave * envelope * volume

        wave_int = np.int16(wave * 32767)
        stereo_wave = np.column_stack((wave_int, wave_int))
        sound = pygame.sndarray.make_sound(stereo_wave)

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
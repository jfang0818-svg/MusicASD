"""
Music API endpoints
"""
import asyncio
import logging
import random
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import numpy as np
import pygame
import scipy.io.wavfile as wavfile
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from services.audio_synthesizer import audio_synthesizer
from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.gpt_client import gpt_client
from services.midi_generator import midi_generator
from services.musicgen_service import musicgen_service
from services.task_manager import TaskStatus, task_manager

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
    use_ai: bool = False  # Use AI (GPT-4 + MIDI) vs rule-based generation
    use_musicgen: bool = False  # Use MusicGen for generation (overrides use_ai)
    child_id: Optional[str] = None  # For AI personalization
    user_id: Optional[str] = None  # For loading child profile
    mood: str = "peaceful"
    complexity: str = "simple"  # simple, moderate, complex

def get_state():
    from main import state
    return state

@router.post("/play")
def play_music(request: MusicRequest):
    """Play music with specified style"""
    state = get_state()

    try:
        if request.style not in ["calm", "happy", "energetic"]:
            raise HTTPException(
                status_code=400, detail=f"Invalid style: {request.style}"
            )

        music_files = state.music_library.get(request.style, [])

        if not music_files:
            logger.warning("No music files for style %s, generating tone", request.style)
            return generate_fallback_tone(request.style, request.volume)

        if request.file:
            music_file = next((f for f in music_files if f["name"] == request.file), None)
            if not music_file:
                music_file = random.choice(music_files)
        else:
            music_file = random.choice(music_files)

        # Ensure music file is cached locally (download from Azure if needed)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            cached_path = loop.run_until_complete(state.ensure_music_cached(music_file))
        finally:
            loop.close()

        logger.info("Playing: %s from %s", music_file['name'], cached_path)
        pygame.mixer.music.load(cached_path)
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
        logger.error("Error playing music: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e

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
        logger.error("Error stopping music: %s", e)
        return {"status": "error", "message": str(e)}

@router.post("/pause")
def pause_music():
    """Pause currently playing music"""
    state = get_state()

    try:
        if not state.music_playing:
            return {"status": "error", "message": "No music is currently playing"}

        pygame.mixer.music.pause()
        logger.info("Music paused")

        # Log music pause event if session is active
        if state.session_active and state.current_music:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "session_id": state.session_id,
                "event": "Music Paused",
                "music_file": state.current_music
            }
            state.logs.append(log_entry)

        return {"status": "paused", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error("Error pausing music: %s", e)
        return {"status": "error", "message": str(e)}

@router.post("/resume")
def resume_music():
    """Resume paused music"""
    state = get_state()

    try:
        if not state.music_playing:
            return {"status": "error", "message": "No music to resume"}

        pygame.mixer.music.unpause()
        logger.info("Music resumed")

        # Log music resume event if session is active
        if state.session_active and state.current_music:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "session_id": state.session_id,
                "event": "Music Resumed",
                "music_file": state.current_music
            }
            state.logs.append(log_entry)

        return {"status": "playing", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error("Error resuming music: %s", e)
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
    """Get available music files by style (cached for 1 hour)"""
    from services.redis_client import redis_client
    state = get_state()

    CACHE_KEY = "music:library"
    CACHE_TTL = 3600  # 1 hour

    # Try to get from cache first
    if redis_client.is_connected():
        cached_library = redis_client.get_json(CACHE_KEY)
        if cached_library:
            logger.debug("Music library retrieved from cache")
            return cached_library

    # Cache miss - scan library
    state.scan_music_library()

    library_with_counts = {}
    for style, files in state.music_library.items():
        library_with_counts[style] = {
            "files": files,
            "count": len(files)
        }

    response = {
        "library": state.music_library,
        "detailed": library_with_counts,
        "total_files": sum(len(files) for files in state.music_library.values()),
        "generated_count": len(state.generated_tones)
    }

    # Cache the result
    if redis_client.is_connected():
        redis_client.set_json(CACHE_KEY, response, expire=CACHE_TTL)
        logger.debug("Music library cached for 1 hour")

    return response

@router.post("/upload/{style}")
async def upload_music(style: str, file: UploadFile = File(...)):
    """Upload new music file to Azure Blob Storage"""
    from services.redis_client import redis_client
    state = get_state()

    if style not in ["calm", "happy", "energetic", "generated"]:
        raise HTTPException(status_code=400, detail="Invalid style")

    try:
        # Read file content
        content = await file.read()

        # Determine content type
        content_type = "audio/wav"
        if file.filename.endswith(".mp3"):
            content_type = "audio/mpeg"
        elif file.filename.endswith(".ogg"):
            content_type = "audio/ogg"
        elif file.filename.endswith(".m4a"):
            content_type = "audio/mp4"

        # Upload to Azure
        success = await azure_storage.upload_music_file(
            category=style,
            filename=file.filename,
            file_data=content,
            content_type=content_type
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to upload to Azure")

        # Rescan library to include new file
        state.scan_music_library()

        # Invalidate cache
        if redis_client.is_connected():
            redis_client.delete("music:library")
            logger.debug("Music library cache invalidated after upload")

        logger.info("Uploaded %s to Azure (%s category)", file.filename, style)
        return {
            "status": "success",
            "file": file.filename,
            "style": style,
            "size": len(content),
            "uploaded_to": "Azure Blob Storage"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.post("/generate")
async def generate_music(request: GenerateMusicRequest):
    """Generate synthetic music/tones, AI-generated MIDI music, or MusicGen music"""
    state = get_state()

    try:
        # MusicGen - Priority option (overrides use_ai)
        if request.use_musicgen:
            # Get child context if provided
            child_context = None
            if request.child_id and request.user_id:
                try:
                    child_profile = await azure_storage.get_child_profile(
                        request.user_id, request.child_id
                    )
                    child_context = child_profile
                except Exception as profile_err:
                    logger.warning("Could not load child profile: %s", profile_err)
                    child_context = {"child_id": request.child_id}

            # Generate music with MusicGen
            musicgen_result = await musicgen_service.generate(
                style=request.style,
                duration=request.duration,
                mood=request.mood,
                complexity=request.complexity,
                child_context=child_context,
                filename=request.filename
            )

            # Read generated file
            with open(musicgen_result["file_path"], 'rb') as f:
                wav_data = f.read()

            # Upload to Azure
            timestamp = musicgen_result["timestamp"]
            final_filename = f"musicgen_{request.filename}_{request.style}_{timestamp}.wav"

            await azure_storage.upload_music_file(
                category="generated",
                filename=final_filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            # Rescan library
            state.scan_music_library()

            # Save metadata
            tone_info = {
                "name": final_filename,
                "style": request.style,
                "duration": request.duration,
                "mood": request.mood,
                "complexity": request.complexity,
                "model": musicgen_result["model"],
                "prompt": musicgen_result["prompt"],
                "musicgen_generated": True,
                "created": datetime.now().isoformat()
            }
            state.generated_tones.append(tone_info)

            logger.info("Generated MusicGen music: %s", final_filename)
            return {
                "status": "success",
                "filename": final_filename,
                "style": request.style,
                "duration": request.duration,
                "mood": request.mood,
                "complexity": request.complexity,
                "model": musicgen_result["model"],
                "prompt": musicgen_result["prompt"],
                "sample_rate": musicgen_result["sample_rate"],
                "musicgen_generated": True,
                "storage": "Azure Blob Storage"
            }

        # AI-generated MIDI music
        if request.use_ai:
            # Check if synthesizer is available
            synth_status = audio_synthesizer.get_status()
            if not synth_status["ready"]:
                # Fallback to simple wave generation if no synthesizer
                logger.warning(
                    "No synthesizer available, falling back to wave generation"
                )
                request.use_ai = False

        # Only proceed with AI generation if use_ai is still True
        if request.use_ai:
            # Get child context if provided
            child_context = None
            if request.child_id and request.user_id:
                try:
                    child_profile = await azure_storage.get_child_profile(
                        request.user_id, request.child_id
                    )
                    child_context = child_profile
                except Exception:
                    child_context = {"child_id": request.child_id}

            # Generate MIDI file
            midi_result = await midi_generator.generate_midi(
                style=request.style,
                tempo=request.tempo,
                duration_seconds=int(request.duration),
                key=request.key,
                mood=request.mood,
                complexity=request.complexity,
                use_ai=True,
                child_context=child_context
            )

            # Convert MIDI to WAV
            audio_result = await audio_synthesizer.synthesize(midi_result["file_path"])

            # Prepare filename and upload to Azure
            timestamp = int(time.time())
            final_filename = f"ai_{request.filename}_{request.style}_{timestamp}.wav"

            # Read the synthesized WAV file
            with open(audio_result["wav_path"], 'rb') as f:
                wav_data = f.read()

            # Upload to Azure
            await azure_storage.upload_music_file(
                category="generated",
                filename=final_filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            # Rescan library to include new file
            state.scan_music_library()

            tone_info = {
                "name": final_filename,
                "style": request.style,
                "duration": request.duration,
                "tempo": request.tempo,
                "key": request.key,
                "mood": request.mood,
                "complexity": request.complexity,
                "ai_generated": True,
                "midi_path": midi_result["file_path"],
                "notes_count": midi_result["notes_count"],
                "created": datetime.now().isoformat()
            }
            state.generated_tones.append(tone_info)

            logger.info(
                "Generated AI music: %s (uploaded to Azure)", final_filename
            )
            return {
                "status": "success",
                "filename": final_filename,
                "style": request.style,
                "duration": request.duration,
                "tempo": request.tempo,
                "key": request.key,
                "mood": request.mood,
                "complexity": request.complexity,
                "ai_generated": True,
                "notes_count": midi_result["notes_count"],
                "synthesizer": audio_result["synthesizer"],
                "storage": "Azure Blob Storage"
            }

        # Traditional wave generation (original code)
        else:
            sample_rate = 22050
            duration_samples = int(sample_rate * request.duration)

            base_freq = {
                "C": 261.63, "D": 293.66, "E": 329.63,
                "F": 349.23, "G": 392.00, "A": 440.00
            }
            root = base_freq.get(request.key, 261.63)

            if request.style == "calm":
                frequencies = [root, root * 1.25, root * 1.5]
                tempo_factor = 0.5
            elif request.style == "happy":
                frequencies = [root, root * 1.25, root * 1.5, root * 2]
                tempo_factor = 1.0
            else:  # energetic
                frequencies = [
                    root, root * 1.125, root * 1.25, root * 1.5, root * 1.667
                ]
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

            # Write to temporary file first
            temp_path = Path(f"temp_{filename}")
            wavfile.write(str(temp_path), sample_rate, wave)

            # Upload to Azure
            with open(temp_path, 'rb') as f:
                wav_data = f.read()

            await azure_storage.upload_music_file(
                category="generated",
                filename=filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            # Clean up temp file
            temp_path.unlink()

            # Rescan library to include new file
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

            logger.info("Generated tone: %s (uploaded to Azure)", filename)
            return {
                "status": "success",
                "filename": filename,
                "style": request.style,
                "duration": request.duration,
                "tempo": request.tempo,
                "key": request.key,
                "storage": "Azure Blob Storage"
            }
    except Exception as e:
        logger.error("Generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.post("/generate-async")
async def generate_music_async(request: GenerateMusicRequest):
    """
    Start async music generation. Returns task_id immediately.
    User can poll /music/tasks/{task_id} for status.
    """
    try:
        # Create task
        task_id = await task_manager.create_task(
            task_type="music_generation",
            params={
                "style": request.style,
                "duration": request.duration,
                "filename": request.filename,
                "tempo": request.tempo,
                "key": request.key,
                "use_ai": request.use_ai,
                "use_musicgen": request.use_musicgen,
                "child_id": request.child_id,
                "user_id": request.user_id,
                "mood": request.mood,
                "complexity": request.complexity
            }
        )

        # Start background generation
        asyncio.create_task(_run_music_generation(task_id, request))

        logger.info("Started async music generation task %s", task_id)
        return {
            "status": "started",
            "task_id": task_id,
            "message": "Music generation started. Poll /music/tasks/{task_id} for status."
        }

    except Exception as e:
        logger.error("Failed to start async generation: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


async def _run_music_generation(task_id: str, request: GenerateMusicRequest):
    """Background task for music generation"""
    state = get_state()

    try:
        await task_manager.update_task(task_id, status=TaskStatus.RUNNING, progress=10)

        # MusicGen generation
        if request.use_musicgen:
            await task_manager.update_task(task_id, progress=20)

            # Get child context if provided
            child_context = None
            if request.child_id and request.user_id:
                try:
                    child_profile = await azure_storage.get_child_profile(
                        request.user_id, request.child_id
                    )
                    child_context = child_profile
                except Exception as profile_err:
                    logger.warning("Could not load child profile: %s", profile_err)
                    child_context = {"child_id": request.child_id}

            await task_manager.update_task(task_id, progress=30)

            # Generate music with MusicGen
            musicgen_result = await musicgen_service.generate(
                style=request.style,
                duration=request.duration,
                mood=request.mood,
                complexity=request.complexity,
                child_context=child_context,
                filename=request.filename
            )

            await task_manager.update_task(task_id, progress=70)

            # Read generated file
            with open(musicgen_result["file_path"], 'rb') as f:
                wav_data = f.read()

            # Upload to Azure
            timestamp = musicgen_result["timestamp"]
            final_filename = f"musicgen_{request.filename}_{request.style}_{timestamp}.wav"

            await azure_storage.upload_music_file(
                category="generated",
                filename=final_filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            await task_manager.update_task(task_id, progress=90)

            # Rescan library
            state.scan_music_library()

            result = {
                "status": "success",
                "filename": final_filename,
                "style": request.style,
                "duration": request.duration,
                "mood": request.mood,
                "complexity": request.complexity,
                "model": musicgen_result["model"],
                "prompt": musicgen_result["prompt"],
                "sample_rate": musicgen_result["sample_rate"],
                "musicgen_generated": True,
                "storage": "Azure Blob Storage",
                "path": f"generated_audio/{final_filename}"
            }

            await task_manager.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=100,
                result=result
            )
            logger.info("Task %s completed: %s", task_id, final_filename)

        # AI MIDI generation
        elif request.use_ai:
            await task_manager.update_task(task_id, progress=20)

            synth_status = audio_synthesizer.get_status()
            if not synth_status["ready"]:
                raise RuntimeError("No synthesizer available for AI generation")

            child_context = None
            if request.child_id and request.user_id:
                try:
                    child_profile = await azure_storage.get_child_profile(
                        request.user_id, request.child_id
                    )
                    child_context = child_profile
                except Exception:
                    child_context = {"child_id": request.child_id}

            await task_manager.update_task(task_id, progress=40)

            midi_result = await midi_generator.generate_midi(
                style=request.style,
                tempo=request.tempo,
                duration_seconds=int(request.duration),
                key=request.key,
                mood=request.mood,
                complexity=request.complexity,
                use_ai=True,
                child_context=child_context
            )

            await task_manager.update_task(task_id, progress=60)

            audio_result = await audio_synthesizer.synthesize(midi_result["file_path"])

            timestamp = int(time.time())
            final_filename = f"ai_{request.filename}_{request.style}_{timestamp}.wav"

            with open(audio_result["wav_path"], 'rb') as f:
                wav_data = f.read()

            await azure_storage.upload_music_file(
                category="generated",
                filename=final_filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            await task_manager.update_task(task_id, progress=90)

            state.scan_music_library()

            result = {
                "status": "success",
                "filename": final_filename,
                "style": request.style,
                "duration": request.duration,
                "tempo": request.tempo,
                "key": request.key,
                "mood": request.mood,
                "complexity": request.complexity,
                "ai_generated": True,
                "notes_count": midi_result["notes_count"],
                "synthesizer": audio_result["synthesizer"],
                "storage": "Azure Blob Storage",
                "path": f"generated_audio/{final_filename}"
            }

            await task_manager.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=100,
                result=result
            )

        # Simple wave generation
        else:
            await task_manager.update_task(task_id, progress=30)

            sample_rate = 22050
            duration_samples = int(sample_rate * request.duration)

            base_freq = {
                "C": 261.63, "D": 293.66, "E": 329.63,
                "F": 349.23, "G": 392.00, "A": 440.00
            }
            root = base_freq.get(request.key, 261.63)

            if request.style == "calm":
                frequencies = [root, root * 1.25, root * 1.5]
                tempo_factor = 0.5
            elif request.style == "happy":
                frequencies = [root, root * 1.25, root * 1.5, root * 2]
                tempo_factor = 1.0
            else:
                frequencies = [
                    root, root * 1.125, root * 1.25, root * 1.5, root * 1.667
                ]
                tempo_factor = 1.5

            beat_duration = 60.0 / (request.tempo * tempo_factor)

            t = np.linspace(0, request.duration, duration_samples)
            wave = np.zeros(duration_samples)

            for i, freq in enumerate(frequencies):
                wave += 0.5 * np.sin(2 * np.pi * freq * t) * (1 - i * 0.15)
                wave += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * (1 - i * 0.15)
                beat_pattern = np.sin(2 * np.pi * t / beat_duration) > 0
                wave += 0.1 * np.sin(2 * np.pi * freq * 0.5 * t) * beat_pattern

            await task_manager.update_task(task_id, progress=60)

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

            temp_path = Path(f"temp_{filename}")
            wavfile.write(str(temp_path), sample_rate, wave)

            with open(temp_path, 'rb') as f:
                wav_data = f.read()

            await azure_storage.upload_music_file(
                category="generated",
                filename=filename,
                file_data=wav_data,
                content_type="audio/wav"
            )

            temp_path.unlink()

            await task_manager.update_task(task_id, progress=90)

            state.scan_music_library()

            result = {
                "status": "success",
                "filename": filename,
                "style": request.style,
                "duration": request.duration,
                "tempo": request.tempo,
                "key": request.key,
                "storage": "Azure Blob Storage",
                "path": f"generated_audio/{filename}"
            }

            await task_manager.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=100,
                result=result
            )

    except Exception as e:
        logger.error("Task %s failed: %s", task_id, e)
        await task_manager.update_task(
            task_id,
            status=TaskStatus.FAILED,
            error=str(e)
        )


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a music generation task"""
    task = await task_manager.get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.get("/tasks")
async def get_tasks():
    """Get all recent music generation tasks"""
    tasks = await task_manager.get_user_tasks(task_type="music_generation")
    return {"tasks": tasks}


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

# ==================== LLM MUSIC RECOMMENDATIONS ====================

class MusicRecommendationRequest(BaseModel):
    child_id: str
    current_engagement: str  # LOW, MED, HIGH
    caregiver_goals: Optional[List[str]] = []
    time_of_day: Optional[str] = ""
    session_duration: Optional[int] = 0

class MusicFeedbackRequest(BaseModel):
    session_id: str
    child_id: str
    music_style: str
    tempo: Optional[int] = None
    effectiveness: str  # very_effective, effective, neutral, not_effective
    notes: Optional[str] = ""
    outcome_notes: Optional[str] = ""

@router.post("/recommend")
async def get_music_recommendation(
    request: MusicRecommendationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get LLM-powered music recommendation based on comprehensive context.

    Considers:
    - Child's complete profile (sensory sensitivities, preferences)
    - Historical session data (what music worked before)
    - Current engagement level
    - Caregiver's therapeutic goals
    - Session context (time of day, duration)
    """
    try:
        user_id = auth_service.get_current_user_id(credentials)

        # Get child profile
        profile = await azure_storage.get_child_profile(user_id, request.child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")

        # Verify ownership
        if profile.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get session history for this child
        sessions = await azure_storage.list_child_sessions(request.child_id)

        # Call GPT client for recommendation
        recommendation = await gpt_client.get_music_recommendation(
            child_profile=profile,
            session_history=sessions,
            current_engagement=request.current_engagement,
            caregiver_goals=request.caregiver_goals or [],
            time_of_day=request.time_of_day or "",
            session_duration=request.session_duration or 0
        )

        logger.info(
            "Music recommendation generated for child %s: %s",
            request.child_id,
            recommendation['recommended_style']
        )

        return {
            "status": "success",
            "recommendation": recommendation,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to generate music recommendation: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendation: {str(e)}"
        ) from e

@router.post("/feedback")
async def submit_music_feedback(
    feedback: MusicFeedbackRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Submit caregiver feedback on music effectiveness.

    This feedback is used to improve future recommendations by the LLM.
    The system learns what music works well for each child over time.
    """
    try:
        user_id = auth_service.get_current_user_id(credentials)

        # Verify child profile exists and user has access
        profile = await azure_storage.get_child_profile(user_id, feedback.child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")

        if profile.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get the session
        session = await azure_storage.get_session(feedback.child_id, feedback.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Add music feedback to session
        if "music_feedback" not in session:
            session["music_feedback"] = {}

        session["music_feedback"] = {
            "effectiveness": feedback.effectiveness,
            "notes": feedback.notes,
            "outcome_notes": feedback.outcome_notes,
            "music_style": feedback.music_style,
            "tempo": feedback.tempo,
            "submitted_at": datetime.now().isoformat()
        }

        # Save the updated session
        await azure_storage.save_session(feedback.child_id, feedback.session_id, session)

        logger.info(
            "Music feedback recorded for session %s: %s",
            feedback.session_id,
            feedback.effectiveness
        )

        return {
            "status": "success",
            "message": "Feedback recorded successfully",
            "feedback_id": f"{feedback.session_id}_feedback",
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to submit music feedback: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit feedback: {str(e)}"
        ) from e

@router.get("/feedback/history/{child_id}")
async def get_music_feedback_history(
    child_id: str,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get history of music feedback for a specific child.

    Shows what music has been effective or ineffective over time.
    """
    try:
        user_id = auth_service.get_current_user_id(credentials)

        # Verify access
        profile = await azure_storage.get_child_profile(user_id, child_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Child profile not found")

        if profile.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get sessions with feedback
        sessions = await azure_storage.list_child_sessions(child_id)

        # Extract feedback data
        feedback_history = []
        for session in sessions:
            if "music_feedback" in session and session["music_feedback"]:
                feedback_history.append({
                    "session_id": session.get("id"),
                    "session_date": session.get("start_time"),
                    "music_style": session["music_feedback"].get("music_style"),
                    "tempo": session["music_feedback"].get("tempo"),
                    "effectiveness": session["music_feedback"].get("effectiveness"),
                    "notes": session["music_feedback"].get("notes"),
                    "outcome_notes": session["music_feedback"].get("outcome_notes"),
                    "submitted_at": session["music_feedback"].get("submitted_at")
                })

        # Sort by date descending and limit
        feedback_history.sort(key=lambda x: x.get("session_date", ""), reverse=True)
        feedback_history = feedback_history[:limit]

        return {
            "child_id": child_id,
            "child_name": profile["demographics"]["name"],
            "feedback_history": feedback_history,
            "total_feedback": len(feedback_history)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get feedback history: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get feedback history: {str(e)}"
        ) from e

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
        logger.error("Failed to generate fallback tone: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
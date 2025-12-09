"""Test music generation functionality"""
import asyncio
import sys
sys.path.insert(0, 'backend')

from backend.services.musicgen_service import musicgen_service
from backend.services.midi_generator import midi_generator
from backend.services.audio_synthesizer import audio_synthesizer
from backend.core.config import settings

async def test_musicgen_status():
    """Test MusicGen service status"""
    print("\n=== MusicGen Service Status ===")
    status = musicgen_service.get_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    return status

async def test_simple_wave_generation():
    """Test simple wave generation (no dependencies)"""
    print("\n=== Testing Simple Wave Generation ===")
    import numpy as np
    import scipy.io.wavfile as wavfile
    from pathlib import Path

    try:
        sample_rate = 22050
        duration = 2.0
        frequency = 440

        t = np.linspace(0, duration, int(sample_rate * duration))
        wave = np.sin(2 * np.pi * frequency * t)
        wave = np.int16(wave * 32767 * 0.5)

        output_path = Path("backend/generated_music/test_simple.wav")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        wavfile.write(str(output_path), sample_rate, wave)

        print(f"  SUCCESS: Generated {output_path}")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

async def test_midi_generator():
    """Test MIDI generator"""
    print("\n=== Testing MIDI Generator ===")
    try:
        result = await midi_generator.generate_midi(
            style="calm",
            tempo=80,
            duration_seconds=5,
            key="C",
            mood="peaceful",
            complexity="simple",
            use_ai=False  # Rule-based, no GPT
        )
        print(f"  SUCCESS: Generated MIDI with {result['notes_count']} notes")
        print(f"  File: {result['file_path']}")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_synthesizer_status():
    """Test audio synthesizer status"""
    print("\n=== Audio Synthesizer Status ===")
    try:
        status = audio_synthesizer.get_status()
        for key, value in status.items():
            print(f"  {key}: {value}")
        return status
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

async def test_musicgen_generation():
    """Test MusicGen generation (requires model download)"""
    print("\n=== Testing MusicGen Generation ===")
    status = musicgen_service.get_status()

    if not status["enabled"]:
        print("  SKIPPED: MusicGen is disabled")
        return None

    try:
        print("  Initializing MusicGen (may download model ~300MB first time)...")
        result = await musicgen_service.generate(
            style="calm",
            duration=3.0,  # Short for testing
            mood="peaceful",
            complexity="simple"
        )
        print(f"  SUCCESS: Generated {result['duration']}s of music")
        print(f"  File: {result['file_path']}")
        print(f"  Prompt: {result['prompt']}")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("=" * 60)
    print("MUSIC GENERATION TEST SUITE")
    print("=" * 60)

    # Test 1: Simple wave (no dependencies)
    await test_simple_wave_generation()

    # Test 2: Check statuses
    await test_musicgen_status()
    await test_synthesizer_status()

    # Test 3: MIDI generator
    await test_midi_generator()

    # Test 4: MusicGen (optional, heavy)
    print("\n" + "=" * 60)
    response = input("Test MusicGen? (requires ~300MB download) [y/N]: ").strip().lower()
    if response == 'y':
        await test_musicgen_generation()
    else:
        print("  SKIPPED: MusicGen generation test")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

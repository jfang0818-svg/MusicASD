"""
Audio Generator for Project ASD
Supports both programmatic tone generation and file playback
"""
import numpy as np
import sounddevice as sd
import soundfile as sf
import os
import threading
from typing import Optional
import asyncio

class AudioGenerator:
    def __init__(self):
        self.mode = "generated"  # "generated" or "files"
        self.volume = 0.5  # 0.0 to 1.0
        self.is_playing = False
        self.current_thread = None
        self.sample_rate = 44100

        # Audio file paths
        self.audio_dir = "assets/music"
        os.makedirs(f"{self.audio_dir}/calm", exist_ok=True)
        os.makedirs(f"{self.audio_dir}/happy", exist_ok=True)
        os.makedirs(f"{self.audio_dir}/energetic", exist_ok=True)

        # Generate sample files if they don't exist
        self._ensure_sample_files()

    def set_mode(self, mode: str):
        """Switch between generated tones and file playback"""
        if mode in ["generated", "files"]:
            self.mode = mode

    async def play(self, style: str):
        """Play music based on style"""
        await self.stop_all()  # Stop any current playback

        if self.mode == "generated":
            await self._play_generated(style)
        else:
            await self._play_file(style)

    async def _play_generated(self, style: str):
        """Generate and play tones based on style"""
        # Style-specific parameters
        params = {
            "calm": {
                "frequencies": [261.63, 329.63, 392.00],  # C, E, G - C major
                "tempo": 60,  # BPM
                "duration": 10,  # seconds
                "envelope": "soft"
            },
            "happy": {
                "frequencies": [523.25, 659.25, 783.99],  # C5, E5, G5
                "tempo": 120,
                "duration": 10,
                "envelope": "bright"
            },
            "energetic": {
                "frequencies": [440.00, 554.37, 659.25],  # A4, C#5, E5
                "tempo": 140,
                "duration": 10,
                "envelope": "punchy"
            }
        }

        style_params = params.get(style, params["calm"])

        # Generate audio
        audio = self._generate_audio(
            style_params["frequencies"],
            style_params["duration"],
            style_params["envelope"]
        )

        # Play in background thread
        self.is_playing = True
        self.current_thread = threading.Thread(
            target=self._play_audio_blocking,
            args=(audio,)
        )
        self.current_thread.start()

    def _generate_audio(self, frequencies, duration, envelope):
        """Generate audio waveform"""
        t = np.linspace(0, duration, int(self.sample_rate * duration))
        audio = np.zeros_like(t)

        # Mix frequencies
        for freq in frequencies:
            audio += np.sin(2 * np.pi * freq * t)

        # Normalize
        audio = audio / len(frequencies)

        # Apply envelope
        if envelope == "soft":
            # Fade in/out
            fade_len = int(0.5 * self.sample_rate)
            audio[:fade_len] *= np.linspace(0, 1, fade_len)
            audio[-fade_len:] *= np.linspace(1, 0, fade_len)
        elif envelope == "bright":
            # Quick attack, sustained
            attack_len = int(0.1 * self.sample_rate)
            audio[:attack_len] *= np.linspace(0, 1, attack_len)
        elif envelope == "punchy":
            # Very quick attack, slight decay
            attack_len = int(0.05 * self.sample_rate)
            audio[:attack_len] *= np.linspace(0, 1, attack_len)
            audio[attack_len:] *= np.linspace(1, 0.8, len(audio) - attack_len)

        # Apply volume
        audio *= self.volume

        return audio

    def _play_audio_blocking(self, audio):
        """Blocking audio playback"""
        try:
            sd.play(audio, self.sample_rate)
            sd.wait()
        except Exception as e:
            print(f"Audio playback error: {e}")
        finally:
            self.is_playing = False

    async def _play_file(self, style: str):
        """Play audio file based on style"""
        file_path = f"{self.audio_dir}/{style}/sample.wav"

        if not os.path.exists(file_path):
            # Fallback to generated if file doesn't exist
            await self._play_generated(style)
            return

        try:
            data, fs = sf.read(file_path)

            # Apply volume
            data *= self.volume

            # Play in background
            self.is_playing = True
            self.current_thread = threading.Thread(
                target=lambda: sd.play(data, fs) or sd.wait(),
                daemon=True
            )
            self.current_thread.start()

        except Exception as e:
            print(f"File playback error: {e}")
            # Fallback to generated
            await self._play_generated(style)

    async def stop_all(self):
        """Stop all audio playback"""
        self.is_playing = False
        sd.stop()

        if self.current_thread and self.current_thread.is_alive():
            # Give thread time to finish
            await asyncio.sleep(0.1)

    def volume_up(self):
        """Increase volume"""
        self.volume = min(1.0, self.volume + 0.1)

    def volume_down(self):
        """Decrease volume"""
        self.volume = max(0.0, self.volume - 0.1)

    def _ensure_sample_files(self):
        """Create sample audio files if they don't exist"""
        styles = ["calm", "happy", "energetic"]

        for style in styles:
            file_path = f"{self.audio_dir}/{style}/sample.wav"

            if not os.path.exists(file_path):
                # Generate a sample file
                if style == "calm":
                    audio = self._generate_audio([261.63, 329.63], 5, "soft")
                elif style == "happy":
                    audio = self._generate_audio([523.25, 659.25], 5, "bright")
                else:
                    audio = self._generate_audio([440.00, 554.37], 5, "punchy")

                # Save as WAV
                try:
                    sf.write(file_path, audio, self.sample_rate)
                    print(f"Created sample file: {file_path}")
                except Exception as e:
                    print(f"Could not create sample file {file_path}: {e}")
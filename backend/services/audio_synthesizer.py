"""
Audio Synthesizer Service
Converts MIDI files to WAV using FluidSynth or pretty_midi
"""

import os
import numpy as np
from typing import Dict, Any
from datetime import datetime
import wave

# Try to import FluidSynth, fall back to pretty_midi
try:
    import fluidsynth
    FLUIDSYNTH_AVAILABLE = True
except:
    FLUIDSYNTH_AVAILABLE = False

try:
    import pretty_midi
    PRETTY_MIDI_AVAILABLE = True
except:
    PRETTY_MIDI_AVAILABLE = False

class AudioSynthesizer:
    def __init__(self):
        self.output_dir = "generated_audio"
        os.makedirs(self.output_dir, exist_ok=True)

        # Try to find soundfont file
        self.soundfont_path = self._find_soundfont()

        # Determine which synthesizer to use
        if FLUIDSYNTH_AVAILABLE and self.soundfont_path:
            self.synthesizer_type = "fluidsynth"
        elif PRETTY_MIDI_AVAILABLE:
            self.synthesizer_type = "pretty_midi"
        else:
            self.synthesizer_type = "none"
            print("WARNING: No synthesizer available. Install FluidSynth or pretty_midi.")

    def _find_soundfont(self) -> str:
        """Try to find a soundfont file"""
        possible_paths = [
            "assets/soundfonts/GeneralUser.sf2",
            "assets/soundfonts/default.sf2",
            "/usr/share/soundfonts/default.sf2",
            "/usr/share/sounds/sf2/default.sf2",
            "C:\\soundfonts\\default.sf2"
        ]

        for path in possible_paths:
            if os.path.exists(path):
                return path

        return None

    async def synthesize(self, midi_file_path: str, sample_rate: int = 44100) -> Dict[str, Any]:
        """
        Convert MIDI file to WAV audio

        Args:
            midi_file_path: Path to MIDI file
            sample_rate: Audio sample rate (default 44100 Hz)

        Returns:
            {
                "wav_path": str,
                "duration": float,
                "sample_rate": int,
                "synthesizer": str,
                "timestamp": ISO-8601
            }
        """
        try:
            if self.synthesizer_type == "fluidsynth":
                return await self._synthesize_fluidsynth(midi_file_path, sample_rate)
            elif self.synthesizer_type == "pretty_midi":
                return await self._synthesize_pretty_midi(midi_file_path, sample_rate)
            else:
                raise Exception("No synthesizer available")

        except Exception as e:
            raise Exception(f"Failed to synthesize audio: {str(e)}")

    async def _synthesize_fluidsynth(self, midi_file_path: str, sample_rate: int) -> Dict[str, Any]:
        """Synthesize using FluidSynth"""
        try:
            # Initialize FluidSynth
            fs = fluidsynth.Synth()
            fs.start(driver="file")

            # Load soundfont
            sfid = fs.sfload(self.soundfont_path)
            fs.program_select(0, sfid, 0, 0)

            # Generate output path
            base_name = os.path.basename(midi_file_path).replace(".mid", "")
            wav_path = os.path.join(self.output_dir, f"{base_name}.wav")

            # Render MIDI to WAV
            fs.midi_file_player(midi_file_path)
            fs.write_wav_file(wav_path)

            # Get duration
            with wave.open(wav_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()
                duration = frames / float(rate)

            # Cleanup
            fs.delete()

            return {
                "wav_path": wav_path,
                "duration": duration,
                "sample_rate": sample_rate,
                "synthesizer": "fluidsynth",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"FluidSynth synthesis error: {e}")
            # Fallback to pretty_midi
            if PRETTY_MIDI_AVAILABLE:
                return await self._synthesize_pretty_midi(midi_file_path, sample_rate)
            else:
                raise

    async def _synthesize_pretty_midi(self, midi_file_path: str, sample_rate: int) -> Dict[str, Any]:
        """Synthesize using pretty_midi"""
        try:
            # Load MIDI file
            midi_data = pretty_midi.PrettyMIDI(midi_file_path)

            # Synthesize to audio
            audio_data = midi_data.fluidsynth(fs=sample_rate)

            # Generate output path
            base_name = os.path.basename(midi_file_path).replace(".mid", "")
            wav_path = os.path.join(self.output_dir, f"{base_name}.wav")

            # Save as WAV
            self._save_wav(wav_path, audio_data, sample_rate)

            # Calculate duration
            duration = len(audio_data) / sample_rate

            return {
                "wav_path": wav_path,
                "duration": duration,
                "sample_rate": sample_rate,
                "synthesizer": "pretty_midi",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            raise Exception(f"pretty_midi synthesis error: {e}")

    def _save_wav(self, file_path: str, audio_data: np.ndarray, sample_rate: int):
        """Save numpy array as WAV file"""
        # Normalize audio
        audio_data = audio_data / np.max(np.abs(audio_data))

        # Convert to 16-bit PCM
        audio_int16 = (audio_data * 32767).astype(np.int16)

        # Save WAV file
        with wave.open(file_path, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_int16.tobytes())

    def get_status(self) -> Dict[str, Any]:
        """Get synthesizer status"""
        return {
            "synthesizer_type": self.synthesizer_type,
            "fluidsynth_available": FLUIDSYNTH_AVAILABLE,
            "pretty_midi_available": PRETTY_MIDI_AVAILABLE,
            "soundfont_path": self.soundfont_path,
            "ready": self.synthesizer_type != "none"
        }

# Singleton instance
audio_synthesizer = AudioSynthesizer()

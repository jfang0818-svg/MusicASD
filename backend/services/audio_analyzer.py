"""
Audio Analysis Service using Librosa and SpeechRecognition
Analyzes vocal patterns and pitch every 5 seconds
"""

import numpy as np
import librosa
import speech_recognition as sr
from typing import Dict, Any
from datetime import datetime

class AudioAnalyzer:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.sample_rate = 22050

    def analyze_audio_chunk(self, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze a 5-second audio chunk

        Returns:
        {
            "vocal_pattern": "laughing|crying|speaking|silent",
            "sound_level_db": float,
            "vocal_pitch_hz": float,
            "speech_detected": bool,
            "timestamp": ISO-8601
        }
        """
        try:
            # Convert bytes to numpy array
            audio_data = np.frombuffer(audio_bytes, dtype=np.float32)

            # Analyze sound level
            sound_level = self._analyze_sound_level(audio_data)

            # Detect vocal patterns
            vocal_pattern = self._detect_vocal_pattern(audio_data)

            # Analyze pitch
            pitch = self._analyze_pitch(audio_data)

            # Speech detection
            speech_detected = self._detect_speech(audio_bytes)

            return {
                "vocal_pattern": vocal_pattern,
                "sound_level_db": sound_level,
                "vocal_pitch_hz": pitch,
                "speech_detected": speech_detected,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Audio analysis error: {e}")
            return {
                "vocal_pattern": "error",
                "sound_level_db": 0.0,
                "vocal_pitch_hz": 0.0,
                "speech_detected": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _analyze_sound_level(self, audio: np.ndarray) -> float:
        """Calculate sound level in dB"""
        rms = np.sqrt(np.mean(audio**2))
        db = 20 * np.log10(rms + 1e-10)  # Avoid log(0)
        return float(db)

    def _detect_vocal_pattern(self, audio: np.ndarray) -> str:
        """
        Detect vocal patterns using spectral analysis
        """
        # Use Zero Crossing Rate (ZCR) for pattern detection
        zcr = librosa.feature.zero_crossing_rate(audio)[0]
        zcr_mean = np.mean(zcr)

        # Use Spectral Centroid
        spectral_centroids = librosa.feature.spectral_centroid(
            y=audio, sr=self.sample_rate
        )[0]
        sc_mean = np.mean(spectral_centroids)

        # Classify patterns (simplified heuristic)
        if sc_mean > 3000 and zcr_mean > 0.15:
            return "crying"
        elif sc_mean > 2000 and zcr_mean > 0.1:
            return "laughing"
        elif zcr_mean > 0.05:
            return "speaking"
        else:
            return "silent"

    def _analyze_pitch(self, audio: np.ndarray) -> float:
        """Extract fundamental frequency (pitch)"""
        try:
            pitches, magnitudes = librosa.core.piptrack(
                y=audio, sr=self.sample_rate
            )
            pitch_values = [pitches[magnitudes[:, t].argmax(), t]
                          for t in range(pitches.shape[1])]
            pitch_values = [p for p in pitch_values if p > 0]

            if pitch_values:
                return float(np.median(pitch_values))
            return 0.0
        except:
            return 0.0

    def _detect_speech(self, audio_bytes: bytes) -> bool:
        """Detect if speech is present"""
        try:
            audio_data = sr.AudioData(
                audio_bytes, self.sample_rate, 2
            )
            # Attempt speech recognition
            self.recognizer.recognize_google(audio_data)
            return True
        except:
            return False

# Singleton instance
audio_analyzer = AudioAnalyzer()

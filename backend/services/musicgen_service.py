"""
MusicGen Service - AI Music Generation using Meta's MusicGen
"""
import logging
import torch
import scipy.io.wavfile as wavfile
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
from core.config import settings

logger = logging.getLogger(__name__)


class MusicGenService:
    """Service for generating music using Meta's MusicGen model"""

    def __init__(self):
        """Initialize MusicGen service"""
        self.model = None
        self.model_size = settings.MUSICGEN_MODEL_SIZE
        self.device = settings.MUSICGEN_DEVICE
        self.enabled = settings.ENABLE_MUSICGEN
        self.initialized = False

    async def initialize(self):
        """Initialize and load the MusicGen model"""
        if not self.enabled:
            logger.info("MusicGen is disabled in configuration")
            return False

        if self.initialized:
            logger.debug("MusicGen already initialized")
            return True

        try:
            from transformers import MusicgenForConditionalGeneration, AutoProcessor

            logger.info(f"Loading MusicGen model: {self.model_size} on {self.device}")

            # Load the model from HuggingFace
            model_name = f"facebook/musicgen-{self.model_size}"
            self.processor = AutoProcessor.from_pretrained(model_name)
            self.model = MusicgenForConditionalGeneration.from_pretrained(model_name)

            # Move to appropriate device
            if self.device == "cuda" and torch.cuda.is_available():
                self.model = self.model.to("cuda")
                logger.info("✓ MusicGen loaded on GPU (CUDA)")
            else:
                self.model = self.model.to("cpu")
                logger.info("✓ MusicGen loaded on CPU (slower generation)")

            self.initialized = True
            return True

        except ImportError as e:
            logger.error(f"Failed to import transformers: {e}")
            logger.error("Install with: pip install transformers torch scipy")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize MusicGen: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get MusicGen service status"""
        return {
            "enabled": self.enabled,
            "initialized": self.initialized,
            "model_size": self.model_size,
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "ready": self.initialized and self.model is not None
        }

    def _build_prompt(
        self,
        style: str,
        mood: str,
        complexity: str,
        child_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build MusicGen text prompt from parameters"""

        # Base style descriptors
        style_descriptors = {
            "calm": "peaceful, gentle, soft, soothing, relaxing",
            "happy": "cheerful, uplifting, bright, joyful, playful",
            "energetic": "lively, dynamic, active, vibrant, upbeat"
        }

        # Mood descriptors
        mood_descriptors = {
            "peaceful": "tranquil and serene",
            "focused": "steady and concentrating",
            "playful": "fun and light-hearted",
            "calming": "relaxing and stress-free"
        }

        # Complexity descriptors
        complexity_map = {
            "simple": "minimalist, with few instruments",
            "moderate": "balanced arrangement",
            "complex": "rich orchestration with multiple layers"
        }

        # Build base prompt
        prompt_parts = [
            style_descriptors.get(style, style),
            f"{mood_descriptors.get(mood, mood)} melody",
            complexity_map.get(complexity, complexity)
        ]

        # Add child-specific preferences if available
        if child_context:
            sensory = child_context.get("sensory_profile", {})

            # Adjust based on sensory sensitivities
            if sensory.get("sound_sensitivity") == "high":
                prompt_parts.append("soft dynamics")

            # Add preferred instruments if available
            music_prefs = child_context.get("music_preferences", {})
            if preferred_instruments := music_prefs.get("preferred_instruments"):
                instruments_str = ", ".join(preferred_instruments[:3])  # Limit to 3
                prompt_parts.append(f"featuring {instruments_str}")

        # Combine into final prompt
        prompt = ", ".join(prompt_parts)

        # Add general therapeutic context
        prompt = f"Therapeutic music for autism: {prompt}, suitable for sensory regulation"

        return prompt

    async def generate(
        self,
        style: str = "calm",
        duration: float = 8.0,
        mood: str = "peaceful",
        complexity: str = "simple",
        child_context: Optional[Dict[str, Any]] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate music using MusicGen

        Args:
            style: Music style (calm, happy, energetic)
            duration: Duration in seconds (max 30)
            mood: Mood descriptor
            complexity: Complexity level
            child_context: Optional child profile for personalization
            filename: Optional custom filename

        Returns:
            Dict with file_path, duration, prompt, and other metadata
        """
        if not self.initialized:
            await self.initialize()

        if not self.initialized:
            raise RuntimeError("MusicGen not initialized. Check dependencies and configuration.")

        try:
            # Build descriptive prompt
            prompt = self._build_prompt(style, mood, complexity, child_context)
            logger.info(f"MusicGen prompt: {prompt}")

            # Process inputs
            inputs = self.processor(
                text=[prompt],
                padding=True,
                return_tensors="pt",
            )

            # Move inputs to device
            if self.device == "cuda" and torch.cuda.is_available():
                inputs = {k: v.to("cuda") for k, v in inputs.items()}

            # Calculate max_new_tokens based on duration
            # MusicGen generates at 50 tokens/sec, so duration * 50
            max_new_tokens = int(min(duration, settings.MAX_GENERATED_DURATION) * 50)

            # Generate music
            logger.info(f"Generating {duration}s of music...")
            with torch.no_grad():  # Disable gradient computation for inference
                audio_values = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=settings.MUSICGEN_USE_SAMPLING,
                    guidance_scale=3.0,
                )

            # Convert to numpy array and normalize
            sample_rate = self.model.config.audio_encoder.sampling_rate
            audio_values = audio_values.cpu().numpy().squeeze()

            # Normalize to int16 range
            audio_normalized = np.int16(audio_values / np.max(np.abs(audio_values)) * 32767)

            # Create output filename
            timestamp = int(datetime.now().timestamp())
            if not filename:
                filename = f"musicgen_{style}_{timestamp}.wav"
            else:
                if not filename.endswith('.wav'):
                    filename = f"{filename}.wav"

            # Save to temporary file
            output_path = Path("generated_audio") / filename
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Save audio
            wavfile.write(
                str(output_path),
                sample_rate,
                audio_normalized
            )

            logger.info(f"✓ Music generated: {output_path} ({duration}s)")

            return {
                "file_path": str(output_path.absolute()),
                "filename": filename,
                "duration": duration,
                "prompt": prompt,
                "sample_rate": sample_rate,
                "model": f"musicgen-{self.model_size}",
                "style": style,
                "mood": mood,
                "complexity": complexity,
                "timestamp": timestamp
            }

        except Exception as e:
            logger.error(f"MusicGen generation failed: {e}")
            raise RuntimeError(f"Failed to generate music: {str(e)}")

    async def cleanup(self):
        """Clean up resources"""
        if self.model is not None:
            del self.model
            self.model = None
            self.initialized = False

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            logger.info("MusicGen resources cleaned up")


# Singleton instance
musicgen_service = MusicGenService()

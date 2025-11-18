"""
MIDI Generator Service using GPT-4
Generates therapeutic MIDI music based on parameters
"""

from midiutil import MIDIFile
from typing import Dict, Any, List
import random
from datetime import datetime
import os
from services.gpt_client import gpt_client

class MIDIGenerator:
    def __init__(self):
        self.output_dir = "generated_music"
        os.makedirs(self.output_dir, exist_ok=True)

    async def generate_midi(
        self,
        style: str = "calm",
        tempo: int = 120,
        duration_seconds: int = 60,
        key: str = "C",
        mood: str = "peaceful",
        complexity: str = "simple",
        use_ai: bool = False,
        child_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate MIDI file based on parameters

        Args:
            style: Musical style (calm, happy, energetic)
            tempo: BPM (beats per minute)
            duration_seconds: Length of music in seconds
            key: Musical key (C, D, E, F, G, A, B with #/b modifiers)
            mood: Emotional mood for the music
            complexity: simple, moderate, complex
            use_ai: If True, use GPT-4 to generate melody
            child_context: Child profile for AI personalization

        Returns:
            {
                "file_path": str,
                "duration": int,
                "tempo": int,
                "key": str,
                "notes_count": int,
                "timestamp": ISO-8601
            }
        """
        try:
            # Create MIDI file
            midi = MIDIFile(1)  # 1 track
            track = 0
            channel = 0
            volume = 100

            # Set tempo
            midi.addTempo(track, 0, tempo)

            # Get melody based on mode
            if use_ai and child_context:
                notes = await self._generate_ai_melody(
                    style, tempo, duration_seconds, key, mood, complexity, child_context
                )
            else:
                notes = self._generate_rule_based_melody(
                    style, tempo, duration_seconds, key, mood, complexity
                )

            # Add notes to MIDI
            current_time = 0
            for note_data in notes:
                pitch = note_data["pitch"]
                duration = note_data["duration"]
                velocity = note_data.get("velocity", volume)

                midi.addNote(track, channel, pitch, current_time, duration, velocity)
                current_time += duration

            # Save MIDI file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{style}_{tempo}bpm_{timestamp}.mid"
            file_path = os.path.join(self.output_dir, filename)

            with open(file_path, "wb") as output_file:
                midi.writeFile(output_file)

            return {
                "file_path": file_path,
                "duration": duration_seconds,
                "tempo": tempo,
                "key": key,
                "notes_count": len(notes),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            raise Exception(f"Failed to generate MIDI: {str(e)}")

    async def _generate_ai_melody(
        self,
        style: str,
        tempo: int,
        duration_seconds: int,
        key: str,
        mood: str,
        complexity: str,
        child_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Use GPT-4 to generate a therapeutic melody"""

        # Build prompt for GPT-4
        prompt = f"""
You are a music therapy AI assistant. Generate a therapeutic melody in MIDI format.

**Musical Parameters:**
- Style: {style}
- Tempo: {tempo} BPM
- Duration: {duration_seconds} seconds
- Key: {key}
- Mood: {mood}
- Complexity: {complexity}

**Child Context:**
{child_context}

**Task:**
Generate a list of musical notes that would be therapeutic for this child. Consider their sensory sensitivities and preferences.

Return ONLY a JSON array of notes in this format:
[
  {{"pitch": 60, "duration": 1.0, "velocity": 80}},
  {{"pitch": 62, "duration": 0.5, "velocity": 75}},
  ...
]

Notes:
- Use MIDI pitch values (60 = Middle C, 62 = D, etc.)
- Duration is in quarter notes (1.0 = quarter note)
- Velocity is volume (0-127, typical range 60-100)
- Create approximately {int(duration_seconds / (60 / tempo))} notes
- For "calm" style, use slower, lower notes
- For "happy" style, use brighter, varied notes
- For "energetic" style, use faster, higher notes

Generate the melody now:
"""

        try:
            # Call GPT-4 to generate melody
            response = await gpt_client.get_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=2000
            )

            # Parse JSON response
            import json
            notes = json.loads(response)

            # Validate and ensure we have notes
            if not notes or not isinstance(notes, list):
                # Fallback to rule-based
                return self._generate_rule_based_melody(
                    style, tempo, duration_seconds, key, mood, complexity
                )

            return notes

        except Exception as e:
            print(f"AI melody generation failed, using rule-based: {e}")
            # Fallback to rule-based generation
            return self._generate_rule_based_melody(
                style, tempo, duration_seconds, key, mood, complexity
            )

    def _generate_rule_based_melody(
        self,
        style: str,
        tempo: int,
        duration_seconds: int,
        key: str,
        mood: str,
        complexity: str
    ) -> List[Dict[str, Any]]:
        """Generate melody using rule-based algorithm"""

        # Define scale based on key
        key_offset = {
            "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
            "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
        }.get(key, 0)

        # Major scale intervals
        major_scale = [0, 2, 4, 5, 7, 9, 11]

        # Base pitch based on style
        style_base = {
            "calm": 60,      # Middle C
            "happy": 64,     # E
            "energetic": 67  # G
        }.get(style, 60)

        # Note duration based on tempo and style
        if style == "calm":
            base_duration = 2.0  # Half notes
            note_range = 12      # Smaller range
        elif style == "happy":
            base_duration = 1.0  # Quarter notes
            note_range = 16
        else:  # energetic
            base_duration = 0.5  # Eighth notes
            note_range = 20

        # Calculate number of notes needed
        beats = int((duration_seconds / 60) * tempo)
        num_notes = int(beats / base_duration)

        notes = []
        current_pitch = style_base + key_offset

        for i in range(num_notes):
            # Random walk within scale
            scale_index = random.randint(0, len(major_scale) - 1)
            pitch = style_base + key_offset + major_scale[scale_index]

            # Occasionally jump octave
            if random.random() < 0.2:
                pitch += 12 if random.random() < 0.5 else -12

            # Ensure pitch is in valid MIDI range
            pitch = max(36, min(84, pitch))

            # Vary duration slightly
            duration = base_duration * random.choice([0.5, 1.0, 1.5, 2.0])

            # Vary velocity for expression
            velocity = random.randint(60, 90)

            notes.append({
                "pitch": pitch,
                "duration": duration,
                "velocity": velocity
            })

        return notes

# Singleton instance
midi_generator = MIDIGenerator()

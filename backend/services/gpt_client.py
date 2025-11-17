"""
GPT Client for Project ASD
Handles communication with OpenAI API using MCP constraints
"""
import os
import json
from typing import Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class GPTClient:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")

        self.client = AsyncOpenAI(api_key=api_key)

        # System prompt enforcing MCP protocol
        self.system_prompt = """You are a music therapy assistant for a caregiver and child with ASD.
You operate ONLY through MCP (Model Context Protocol) tools. You cannot take any actions outside these tools.

Available MCP tools:
1. engagement.read - Returns current engagement (LOW/MED/HIGH)
2. music.play - Plays music with style (calm/happy/energetic)
3. session.log - Logs events to session record

Your workflow:
1. Analyze the current engagement level
2. Choose appropriate music style based on therapeutic principles:
   - LOW engagement → happy or energetic music to gently stimulate
   - MED engagement → happy or calm music to maintain balance
   - HIGH engagement → calm music to help regulate
3. Generate a short, gentle phrase for the caregiver to say to the child
4. Provide reasoning for your choice

Safety rules:
- Always prefer gradual transitions
- Avoid overstimulation
- Respect the child's current state
- Keep phrases simple, warm, and encouraging
- Maximum 10 words per phrase
- Use child-friendly language

Output format (JSON):
{
    "music_style": "calm|happy|energetic",
    "child_phrase": "Let's listen to gentle music together",
    "reasoning": "Brief explanation of therapeutic choice",
    "mcp_sequence": ["engagement.read", "music.play", "session.log"]
}"""

    async def get_therapy_decision(self, engagement: str, session_context: Dict) -> Dict[str, Any]:
        """
        Get therapy decision from GPT based on engagement and context
        """
        try:
            # Construct the user message with current context
            user_message = f"""Current session context:
- Engagement Level: {engagement}
- Session ID: {session_context.get('session_id', 'unknown')}
- Suggestions Made: {session_context.get('suggestion_count', 0)}

Please analyze this situation and provide your therapeutic recommendation following MCP protocol."""

            # Call OpenAI API with GPT-5.1
            response = await self.client.chat.completions.create(
                model="gpt-5.1",  # Using GPT-5.1 (Nov 2025)
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            # Parse response
            content = response.choices[0].message.content
            decision = json.loads(content)

            # Validate response structure
            required_fields = ["music_style", "child_phrase", "reasoning"]
            for field in required_fields:
                if field not in decision:
                    decision[field] = self._get_default(field)

            # Ensure music style is valid
            if decision["music_style"] not in ["calm", "happy", "energetic"]:
                decision["music_style"] = "calm"  # Safe default

            return decision

        except Exception as e:
            # Fallback decision if GPT fails
            print(f"GPT Error: {e}")
            return self._get_fallback_decision(engagement)

    def _get_fallback_decision(self, engagement: str) -> Dict[str, Any]:
        """
        Fallback logic if GPT is unavailable
        """
        decisions = {
            "LOW": {
                "music_style": "happy",
                "child_phrase": "Let's play some happy music!",
                "reasoning": "Happy music to gently increase engagement"
            },
            "MED": {
                "music_style": "calm",
                "child_phrase": "Time for peaceful sounds",
                "reasoning": "Calm music to maintain balanced state"
            },
            "HIGH": {
                "music_style": "calm",
                "child_phrase": "Let's relax with quiet music",
                "reasoning": "Calm music to help regulate high energy"
            }
        }

        return decisions.get(engagement, decisions["MED"])

    def _get_default(self, field: str) -> Any:
        """Get default values for missing fields"""
        defaults = {
            "music_style": "calm",
            "child_phrase": "Let's listen to music",
            "reasoning": "Therapeutic music selection",
            "mcp_sequence": ["engagement.read", "music.play", "session.log"]
        }
        return defaults.get(field, "")

    async def analyze_child_profile_for_music(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze child profile and extract music element recommendations
        using GPT-5.1
        """
        try:
            # Construct detailed profile summary
            profile_summary = self._build_profile_summary(profile)

            # System prompt for music element extraction
            music_analysis_prompt = """You are an expert music therapist specializing in ASD (Autism Spectrum Disorder) treatment.
Your task is to analyze a child's profile and recommend specific music elements for therapeutic music generation.

Consider:
1. Sensory sensitivities (especially sound sensitivity)
2. Communication abilities and attention span
3. Behavioral patterns and triggers
4. Past music preferences and successful therapy music
5. Music that caused negative reactions

Output a detailed JSON with these exact fields:
{
    "tempo_range": "Range in BPM (e.g., '60-80 BPM')",
    "key": "Musical key (e.g., 'C major', 'A minor')",
    "instruments": ["List of recommended instruments"],
    "dynamics": "Dynamics level (soft/moderate/loud)",
    "mood": "Overall mood description",
    "avoid_elements": ["Elements to strictly avoid"],
    "recommended_duration": "Duration in minutes",
    "style_tags": ["Genres/styles for music generation"],
    "reasoning": "Brief explanation of your therapeutic rationale"
}

Guidelines:
- For high sound sensitivity → slower tempo, softer dynamics, avoid sudden changes
- For behavioral regulation issues → predictable patterns, calming elements
- For attention span issues → shorter durations, varied but not chaotic
- Always prioritize child safety and comfort"""

            # Call GPT-5.1
            response = await self.client.chat.completions.create(
                model="gpt-5.1",  # Using GPT-5.1 for advanced reasoning
                messages=[
                    {"role": "system", "content": music_analysis_prompt},
                    {"role": "user", "content": profile_summary}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            # Parse response
            content = response.choices[0].message.content
            music_elements = json.loads(content)

            # Validate required fields
            required_fields = [
                "tempo_range", "key", "instruments", "dynamics",
                "mood", "avoid_elements", "recommended_duration", "style_tags"
            ]
            for field in required_fields:
                if field not in music_elements:
                    music_elements[field] = self._get_default_music_element(field)

            return music_elements

        except Exception as e:
            print(f"GPT Profile Analysis Error: {e}")
            return self._get_fallback_music_elements()

    def _build_profile_summary(self, profile: Dict[str, Any]) -> str:
        """Build a comprehensive profile summary for GPT analysis"""
        demographics = profile.get("demographics", {})
        sensory = profile.get("sensory_sensitivities", {})
        communication = profile.get("communication", {})
        behavioral = profile.get("behavioral_patterns", {})
        music_prefs = profile.get("music_preferences", {})
        goals = profile.get("therapy_goals", {})

        summary = f"""Child Profile for Music Therapy Analysis:

DEMOGRAPHICS:
- Name: {demographics.get('name', 'Unknown')}
- Age: {demographics.get('age', 'Unknown')}
- Gender: {demographics.get('gender', 'Not specified')}
- ASD Level: {demographics.get('asd_level', 'Not specified')}
- Diagnosis Date: {demographics.get('diagnosis_date', 'Not specified')}
- Comorbidities: {', '.join(demographics.get('comorbidities', [])) or 'None'}

SENSORY SENSITIVITIES:
- Sound Sensitivity: {sensory.get('sound_sensitivity', 'Not specified')}
- Loud Noises Trigger: {sensory.get('loud_noises_trigger', 'Unknown')}
- Sudden Sounds Trigger: {sensory.get('sudden_sounds_trigger', 'Unknown')}
- Specific Triggers: {sensory.get('specific_triggers', 'None specified')}
- Calming Sounds: {sensory.get('calming_sounds', 'None specified')}

COMMUNICATION:
- Verbal Communication: {communication.get('verbal_communication', 'Not specified')}
- Speech Clarity: {communication.get('speech_clarity', 'Not specified')}
- Preferred Communication: {communication.get('preferred_communication', 'Not specified')}

BEHAVIORAL PATTERNS:
- Repetitive Behaviors: {behavioral.get('repetitive_behaviors', 'Not specified')}
- Meltdown Triggers: {behavioral.get('meltdown_triggers', 'Not specified')}
- Calming Activities: {behavioral.get('calming_activities', 'Not specified')}
- Attention Span: {behavioral.get('attention_span', 'Not specified')}
- Social Interaction: {behavioral.get('social_interaction', 'Not specified')}

MUSIC PREFERENCES:
- Preferred Genres: {', '.join(music_prefs.get('preferred_genres', [])) or 'Not specified'}
- Preferred Instruments: {', '.join(music_prefs.get('preferred_instruments', [])) or 'Not specified'}
- Preferred Tempo: {music_prefs.get('preferred_tempo', 'Not specified')}
- Disliked Music: {', '.join(music_prefs.get('disliked_music', [])) or 'Not specified'}
- Successful Therapy Music: {music_prefs.get('successful_therapy_music', 'Not specified')}
- Negative Reaction Music: {music_prefs.get('negative_reaction_music', 'Not specified')}

THERAPY GOALS:
- Goals: {', '.join(goals.get('goals', [])) or 'Not specified'}
- Focus Areas: {', '.join(goals.get('focus_areas', [])) or 'Not specified'}

Please provide music element recommendations tailored to this child's specific needs."""

        return summary

    def _get_default_music_element(self, field: str) -> Any:
        """Get default values for missing music element fields"""
        defaults = {
            "tempo_range": "60-80 BPM",
            "key": "C major",
            "instruments": ["piano", "soft strings"],
            "dynamics": "soft",
            "mood": "calm and soothing",
            "avoid_elements": ["loud percussion", "sudden changes"],
            "recommended_duration": "3-5 minutes",
            "style_tags": ["ambient", "calming"],
            "reasoning": "Default safe therapeutic choices"
        }
        return defaults.get(field, "")

    def _get_fallback_music_elements(self) -> Dict[str, Any]:
        """Fallback music elements if GPT is unavailable"""
        return {
            "tempo_range": "60-80 BPM",
            "key": "C major",
            "instruments": ["piano", "soft strings", "nature sounds"],
            "dynamics": "soft to moderate",
            "mood": "calm, soothing, predictable",
            "avoid_elements": ["loud drums", "sudden volume changes", "dissonance", "complex rhythms"],
            "recommended_duration": "3-5 minutes",
            "style_tags": ["ambient", "classical", "nature"],
            "reasoning": "Conservative therapeutic defaults for ASD music therapy"
        }
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

    async def get_music_recommendation(
        self,
        child_profile: Dict[str, Any],
        session_history: list[Dict[str, Any]],
        current_engagement: str,
        caregiver_goals: list[str],
        time_of_day: str = "",
        session_duration: int = 0
    ) -> Dict[str, Any]:
        """
        Get comprehensive music recommendation using LLM with full context.

        This considers:
        - Child's complete profile and preferences
        - Historical session data (what music worked before)
        - Current engagement level
        - Caregiver's therapeutic goals
        - Time of day and session progress

        Returns detailed music recommendation with parameters for generation.
        """
        try:
            # Build comprehensive context
            context = self._build_recommendation_context(
                child_profile, session_history, current_engagement,
                caregiver_goals, time_of_day, session_duration
            )

            # System prompt for music recommendation
            system_prompt = """You are an expert music therapist specializing in ASD (Autism Spectrum Disorder) treatment.
Your task is to provide personalized music recommendations based on comprehensive session context.

You will receive:
1. Child's complete profile (sensory sensitivities, preferences, behavioral patterns)
2. Historical session data showing what music worked or didn't work
3. Current engagement level
4. Caregiver's therapeutic goals
5. Session context (time of day, duration)

Provide a detailed, evidence-based music recommendation optimized for this specific child.

Output JSON with these exact fields:
{
    "recommended_style": "calm|happy|energetic",
    "tempo_bpm": "Number in BPM",
    "musical_key": "Musical key (e.g., 'C major')",
    "mood": "Detailed mood description",
    "instruments": ["List of recommended instruments"],
    "duration_minutes": "Recommended duration",
    "volume_level": "soft|moderate|loud",
    "transition_type": "gradual|immediate",
    "specific_parameters": {
        "complexity": "simple|moderate|complex",
        "rhythm_pattern": "steady|varied|syncopated",
        "melodic_contour": "ascending|descending|varied",
        "harmonic_structure": "simple|rich"
    },
    "therapeutic_rationale": "Why this recommendation is optimal",
    "expected_outcome": "What therapeutic outcome to expect",
    "caregiver_phrase": "Short phrase for caregiver to say (max 15 words)",
    "confidence_score": "0.0-1.0 confidence in this recommendation",
    "alternative_if_ineffective": "What to try if this doesn't work"
}

Key principles:
- ALWAYS learn from session history (what worked before)
- Prioritize child safety and comfort over engagement goals
- Consider sensory sensitivities as highest priority
- Use gradual transitions for children with high sensitivity
- Match music to current state, not just desired state
- Be specific and actionable in recommendations"""

            # Call GPT-4/5
            response = await self.client.chat.completions.create(
                model="gpt-4",  # Use gpt-4 for cost-effectiveness, can upgrade to gpt-5.1 later
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            # Parse and validate response
            content = response.choices[0].message.content
            recommendation = json.loads(content)

            # Validate required fields
            required_fields = [
                "recommended_style", "tempo_bpm", "musical_key", "mood",
                "instruments", "duration_minutes", "therapeutic_rationale",
                "caregiver_phrase", "confidence_score"
            ]

            for field in required_fields:
                if field not in recommendation:
                    recommendation[field] = self._get_default_recommendation_field(field)

            # Ensure style is valid
            if recommendation["recommended_style"] not in ["calm", "happy", "energetic"]:
                recommendation["recommended_style"] = "calm"

            # Add metadata
            recommendation["generated_at"] = json.dumps({"timestamp": "now"})
            recommendation["context_used"] = {
                "child_id": child_profile.get("id"),
                "engagement": current_engagement,
                "sessions_analyzed": len(session_history)
            }

            return recommendation

        except Exception as e:
            print(f"GPT Music Recommendation Error: {e}")
            return self._get_fallback_recommendation(current_engagement)

    def _build_recommendation_context(
        self,
        child_profile: Dict[str, Any],
        session_history: list[Dict[str, Any]],
        current_engagement: str,
        caregiver_goals: list[str],
        time_of_day: str,
        session_duration: int
    ) -> str:
        """Build comprehensive context for music recommendation"""

        # Extract profile data
        demographics = child_profile.get("demographics", {})
        sensory = child_profile.get("sensory_sensitivities", {})
        music_prefs = child_profile.get("music_preferences", {})

        # Analyze session history for patterns
        effective_music = []
        ineffective_music = []

        for session in session_history[-10:]:  # Last 10 sessions
            feedback = session.get("music_feedback", {})
            if feedback.get("effectiveness") == "very_effective" or feedback.get("effectiveness") == "effective":
                effective_music.append({
                    "style": session.get("music_style"),
                    "tempo": session.get("tempo"),
                    "outcome": session.get("outcome_notes")
                })
            elif feedback.get("effectiveness") == "not_effective":
                ineffective_music.append({
                    "style": session.get("music_style"),
                    "reason": feedback.get("notes")
                })

        # Build context string
        context = f"""MUSIC THERAPY RECOMMENDATION REQUEST

CHILD PROFILE:
- Name: {demographics.get('name', 'Unknown')}
- Age: {demographics.get('age')} years
- ASD Level: {demographics.get('asd_level')}
- Sound Sensitivity: {sensory.get('sound_sensitivity')}
- Preferred Music: {', '.join(music_prefs.get('preferred_genres', []))}
- Calming Sounds: {sensory.get('calming_sounds')}
- Triggers to Avoid: {sensory.get('specific_triggers')}

CURRENT SESSION CONTEXT:
- Engagement Level: {current_engagement}
- Time of Day: {time_of_day or 'Not specified'}
- Session Duration So Far: {session_duration} minutes
- Therapeutic Goals: {', '.join(caregiver_goals) if caregiver_goals else 'General engagement'}

HISTORICAL DATA (Last 10 Sessions):
Effective Music (worked well):
{json.dumps(effective_music, indent=2) if effective_music else 'No feedback data yet'}

Ineffective Music (did not work):
{json.dumps(ineffective_music, indent=2) if ineffective_music else 'No negative feedback'}

CAREGIVER REQUEST:
Please provide a music recommendation that:
1. Learns from what worked before (see effective music above)
2. Avoids what didn't work (see ineffective music above)
3. Addresses current engagement level: {current_engagement}
4. Aligns with therapeutic goals: {', '.join(caregiver_goals) if caregiver_goals else 'engagement'}
5. Respects sensory sensitivities and triggers

Provide specific, actionable parameters for music generation."""

        return context

    def _get_default_recommendation_field(self, field: str) -> Any:
        """Get default values for missing recommendation fields"""
        defaults = {
            "recommended_style": "calm",
            "tempo_bpm": "70",
            "musical_key": "C major",
            "mood": "calm and soothing",
            "instruments": ["piano", "soft strings"],
            "duration_minutes": "5",
            "volume_level": "soft",
            "transition_type": "gradual",
            "therapeutic_rationale": "Safe default choice for ASD therapy",
            "expected_outcome": "Gentle engagement",
            "caregiver_phrase": "Let's listen to calming music together",
            "confidence_score": "0.5",
            "alternative_if_ineffective": "Try happy music with slightly faster tempo"
        }
        return defaults.get(field, "")

    def _get_fallback_recommendation(self, engagement: str) -> Dict[str, Any]:
        """Fallback recommendation if GPT fails"""
        fallbacks = {
            "LOW": {
                "recommended_style": "happy",
                "tempo_bpm": "90",
                "musical_key": "C major",
                "mood": "uplifting and gentle",
                "instruments": ["piano", "light percussion", "flute"],
                "duration_minutes": "5",
                "therapeutic_rationale": "Happy music to gently increase engagement",
                "caregiver_phrase": "Let's try some cheerful music!",
                "confidence_score": "0.6"
            },
            "MED": {
                "recommended_style": "calm",
                "tempo_bpm": "70",
                "musical_key": "D major",
                "mood": "peaceful and steady",
                "instruments": ["piano", "strings", "nature sounds"],
                "duration_minutes": "7",
                "therapeutic_rationale": "Calm music to maintain balanced engagement",
                "caregiver_phrase": "You're doing great! Let's keep this peaceful feeling",
                "confidence_score": "0.7"
            },
            "HIGH": {
                "recommended_style": "calm",
                "tempo_bpm": "60",
                "musical_key": "A minor",
                "mood": "very calming and grounding",
                "instruments": ["soft piano", "gentle strings", "ambient sounds"],
                "duration_minutes": "10",
                "therapeutic_rationale": "Very calm music to help regulate high energy",
                "caregiver_phrase": "Let's take a quiet moment together",
                "confidence_score": "0.7"
            }
        }

        base_recommendation = fallbacks.get(engagement, fallbacks["MED"])
        base_recommendation.update({
            "volume_level": "soft",
            "transition_type": "gradual",
            "specific_parameters": {
                "complexity": "simple",
                "rhythm_pattern": "steady",
                "melodic_contour": "gentle",
                "harmonic_structure": "simple"
            },
            "expected_outcome": "Appropriate engagement response",
            "alternative_if_ineffective": "Consult with therapist for personalized approach"
        })

        return base_recommendation

    async def get_completion(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Get a completion from GPT for general prompts (e.g., melody generation)

        Args:
            prompt: The prompt to send to GPT
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response

        Returns:
            The completion text from GPT
        """
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"GPT Completion Error: {e}")
            raise


# Singleton instance
gpt_client = GPTClient()
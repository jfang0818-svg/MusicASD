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

            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Using efficient model for MVP
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
"""
AI Activity Generator API
Generates evidence-based ASD music therapy activities through AI chat interface
"""

from datetime import datetime
import logging
import json
import uuid
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials

from models.activity_templates import (
    ActivityTemplate, ActivityCategory, DifficultyLevel,
    GenerateActivityRequest, GenerateActivityResponse,
    ActivityChatRequest, ActivityChatResponse,
    SaveActivityRequest, ListActivitiesRequest,
    ActivityPhase, TherapeuticGoal, SensoryRequirements, SensoryIntensity,
    MaterialItem, ParticipantRole
)
from services.auth import auth_service, security
from services.azure_storage import azure_storage
from services.gpt_client import gpt_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-activity-generator", tags=["ai-activity-generator"])


# ===================== EVIDENCE-BASED KNOWLEDGE BASE =====================

THERAPEUTIC_GOALS_DATABASE = {
    "joint_attention": {
        "goal": "Joint Attention",
        "description": "Shared focus on a common object or activity with another person",
        "evidence_base": "Music therapy improves joint attention (SMD=0.24, 95% CI)"
    },
    "turn_taking": {
        "goal": "Turn-Taking",
        "description": "Alternating actions in a social exchange",
        "evidence_base": "Structured music activities promote turn-taking and patience"
    },
    "motor_timing": {
        "goal": "Motor Timing & Coordination",
        "description": "Synchronizing movements to rhythmic patterns",
        "evidence_base": "Rhythm-based interventions show large effect (g=1.5) on motor skills"
    },
    "emotional_regulation": {
        "goal": "Emotional Regulation",
        "description": "Managing and expressing emotions appropriately",
        "evidence_base": "Music activates limbic system, promoting emotional processing"
    },
    "communication": {
        "goal": "Communication Skills",
        "description": "Verbal and non-verbal expression",
        "evidence_base": "Music therapy effect on communication (g=1.522)"
    },
    "sensory_regulation": {
        "goal": "Sensory Regulation",
        "description": "Modulating responses to sensory input",
        "evidence_base": "Therapeutic listening reduces sensory sensitivities"
    },
    "social_interaction": {
        "goal": "Social Interaction",
        "description": "Engaging with others in shared activities",
        "evidence_base": "Group music activities show large effect (g=1.299) on social skills"
    },
    "imitation": {
        "goal": "Imitation Skills",
        "description": "Copying actions, sounds, or expressions",
        "evidence_base": "Music-based imitation promotes preverbal communication"
    },
    "attention": {
        "goal": "Sustained Attention",
        "description": "Maintaining focus on an activity",
        "evidence_base": "Musical structure provides predictable framework for attention"
    },
    "body_awareness": {
        "goal": "Body Awareness",
        "description": "Understanding body position and movement",
        "evidence_base": "Movement to music enhances proprioceptive awareness"
    }
}

ACTIVITY_EXAMPLES = {
    "rhythmic": [
        "Drum Echo - Copy simple rhythms (call-and-response)",
        "Body Percussion Band - Clap, stomp, tap patterns together",
        "Tempo Match Walk - Walk fast/slow matching music speed",
        "Rhythm Freeze - Move with beat, freeze when music stops"
    ],
    "social": [
        "Instrument Pass Circle - Pass instrument on the beat",
        "Musical Conversation - Take turns 'speaking' with instruments",
        "Partner Mirror - Mirror movements to music",
        "Group Crescendo - Build volume together, then fade"
    ],
    "sensory": [
        "Sound Bath - Listen to ambient sounds with deep breathing",
        "Volume Surfing - Match body tension to music volume",
        "Texture Exploration - Feel different instrument surfaces",
        "Weighted Rhythm - Heavy/light movements to music"
    ],
    "communication": [
        "Fill-in-the-Blank Songs - Pause for child to complete phrase",
        "Song Choice Board - Point/select next song",
        "Action Songs - If You're Happy with movements",
        "Name Song Greeting - Personalized hello songs"
    ],
    "emotional": [
        "Mood Music Match - Select music for feelings",
        "Instrument Voice - Express feelings through sound",
        "Story Soundtrack - Add music to emotion stories",
        "Calm-Down Playlist - Build personal regulation playlist"
    ],
    "cognitive": [
        "Sound Detective - Identify hidden instruments",
        "Sequence Songs - Remember action sequences",
        "Fast/Slow Sorting - Categorize by tempo",
        "Musical Memory - Remember and repeat melodies"
    ]
}


def _get_activity_generation_prompt(context: str, request: GenerateActivityRequest) -> str:
    """Build the system prompt for AI activity generation"""

    category_examples = ACTIVITY_EXAMPLES.get(request.category.value if request.category else "rhythmic", [])

    return f"""You are an expert music therapist specializing in ASD (Autism Spectrum Disorder) treatment.
Generate a detailed, evidence-based music therapy activity based on the following context and requirements.

RESEARCH BASIS (2024):
- Rhythm-based interventions: Large effect size (g=1.5) for communication and social skills
- Active music-making is more effective than passive listening
- Short activities (5-15 min) match typical ASD attention spans
- Multi-sensory engagement activates auditory cortex, motor areas, and limbic system
- Structured activities with predictable patterns reduce anxiety
- Turn-taking activities build social skills naturally

CHILD CONTEXT:
{context}

ACTIVITY REQUIREMENTS:
- Category: {request.category.value if request.category else "any"}
- Therapeutic Goals: {', '.join(request.therapeutic_goals) if request.therapeutic_goals else "based on child profile"}
- Duration: {request.duration_minutes} minutes
- Difficulty: {request.difficulty.value}
- Sensory Considerations: {request.sensory_considerations or "none specified"}
- Available Materials: {', '.join(request.available_materials) if request.available_materials else "basic (hands, voice, simple instruments)"}
- Additional Context: {request.additional_context or "none"}

EXAMPLE ACTIVITIES IN THIS CATEGORY:
{chr(10).join(f"- {ex}" for ex in category_examples)}

THERAPEUTIC GOALS DATABASE:
{json.dumps({k: v["description"] for k, v in THERAPEUTIC_GOALS_DATABASE.items()}, indent=2)}

OUTPUT FORMAT (strict JSON):
{{
    "activity": {{
        "id": "unique_snake_case_id",
        "name": "Activity Name (catchy, descriptive)",
        "description": "2-3 sentence description of the activity and its benefits",
        "icon": "single emoji",
        "category": "{request.category.value if request.category else 'rhythmic'}",
        "subcategory": "specific_type",
        "tags": ["tag1", "tag2", "tag3"],
        "primary_goals": [
            {{"goal": "Goal Name", "description": "What this achieves", "evidence_base": "Research support"}}
        ],
        "secondary_goals": [
            {{"goal": "Goal Name", "description": "Additional benefit"}}
        ],
        "phases": [
            {{
                "phase_number": 1,
                "name": "Phase Name",
                "duration_seconds": 60,
                "description": "What happens in this phase",
                "caregiver_instruction": "Specific instruction for caregiver (use 'you' and 'child')",
                "music_cue": "Optional: Play calming music / Pause / etc",
                "adaptations": {{"beginner": "Simpler version", "advanced": "More challenging version"}}
            }}
        ],
        "total_duration_minutes": {request.duration_minutes},
        "difficulty_levels": ["{request.difficulty.value}"],
        "sensory_requirements": {{
            "auditory_intensity": "low/moderate/high",
            "visual_intensity": "low/moderate/high",
            "tactile_involvement": true/false,
            "movement_required": true/false,
            "warnings": ["potential triggers to watch for"]
        }},
        "music_style": "calming_regulation/social_interactive/movement_motor/etc",
        "tempo_bpm": 80,
        "volume_level": "soft/moderate/dynamic",
        "min_participants": 2,
        "max_participants": 4,
        "participant_roles": ["child", "caregiver"],
        "setup_instructions": "How to prepare for the activity",
        "caregiver_tips": [
            "Tip 1 for success",
            "Tip 2 for adaptation"
        ],
        "adaptation_suggestions": [
            "For sensory sensitive: ...",
            "For non-verbal: ..."
        ],
        "warning_signs": [
            "Signs of overstimulation to watch for"
        ],
        "materials": [
            {{"name": "item", "required": true, "alternatives": ["alt1", "alt2"]}}
        ]
    }},
    "reasoning": "Explanation of why this activity is appropriate for this child and goals",
    "alternatives": ["Brief idea for alternative 1", "Brief idea for alternative 2"]
}}

IMPORTANT GUIDELINES:
1. Make phases specific and actionable (caregiver should know exactly what to do)
2. Include sensory considerations based on child's profile
3. Provide adaptations for different ability levels
4. Keep total duration within {request.duration_minutes} minutes
5. Use simple language in caregiver instructions
6. Include warning signs specific to this child's triggers
7. Make music cues specific (what style, when to change)
8. Reference evidence base in goal descriptions"""


def _get_chat_system_prompt(context: str) -> str:
    """Build system prompt for activity chat wizard"""

    return f"""You are an expert music therapist helping caregivers create custom activities for children with ASD.
Guide them through creating a personalized music therapy activity through conversation.

CHILD CONTEXT:
{context}

RESEARCH BASIS:
- Rhythm-based interventions: Large effect (g=1.5) on communication/social skills
- Active participation > passive listening
- 5-15 minute activities match ASD attention spans
- Predictable structure reduces anxiety

ACTIVITY CATEGORIES:
1. RHYTHMIC - Drum games, body percussion, tempo matching (best for: motor timing, imitation)
2. SOCIAL - Turn-taking games, group activities (best for: joint attention, social skills)
3. SENSORY - Sound baths, volume games (best for: regulation, calming)
4. COMMUNICATION - Fill-in songs, choice boards (best for: language, expression)
5. EMOTIONAL - Mood matching, expression games (best for: emotional regulation)
6. COGNITIVE - Memory games, sequencing (best for: attention, focus)

CONVERSATION FLOW:
1. Ask about therapeutic goals (what they want to work on)
2. Ask about child's current state (energy level, mood)
3. Ask about available materials
4. Ask about duration preference
5. Generate personalized activity

OUTPUT FORMAT (JSON):
{{
    "message": "Your conversational response",
    "follow_up_questions": ["Question 1?", "Question 2?"],
    "activity": null or ActivityTemplate object (when ready to generate),
    "is_complete": false (true when activity is provided)
}}

GUIDELINES:
- Ask 1-2 questions at a time
- Reference child's profile data when relevant
- Explain WHY you suggest things based on research
- Be warm and supportive
- When generating activity, make it highly personalized"""


async def _build_child_context(user_id: str, child_id: Optional[str]) -> str:
    """Build context string from child profile"""
    if not child_id:
        return "No specific child selected. Generate a general activity template."

    try:
        profile = await azure_storage.get_child_profile(user_id, child_id)
        if not profile:
            return "Child profile not found. Generate a general activity template."

        demographics = profile.get("demographics", {})
        sensory = profile.get("sensory_sensitivities", {})
        communication = profile.get("communication", {})
        behavioral = profile.get("behavioral_patterns", {})
        music_prefs = profile.get("music_preferences", {})
        goals = profile.get("therapy_goals", {}).get("goals", [])

        active_goals = [g.get("name", "") for g in goals if g.get("status") == "active"]

        return f"""CHILD PROFILE:
Name: {demographics.get('name', 'Unknown')}
Age: {demographics.get('age', 'Unknown')} years
ASD Level: {demographics.get('asd_level', 'Not specified')}

SENSORY PROFILE:
- Sound Sensitivity: {sensory.get('sound_sensitivity', 'moderate')}
- Calming Sounds: {sensory.get('calming_sounds', 'Not specified')}
- Triggers to Avoid: {sensory.get('specific_triggers', 'None specified')}

COMMUNICATION:
- Verbal Level: {communication.get('verbal_communication', 'Not specified')}
- Receptive Language: {communication.get('receptive_language', 'Not specified')}

BEHAVIORAL:
- Attention Span: {behavioral.get('attention_span', 'Not specified')}
- Strengths: {behavioral.get('strengths', 'Not specified')}

MUSIC PREFERENCES:
- Preferred Genres: {', '.join(music_prefs.get('preferred_genres', [])) or 'Not specified'}
- Preferred Instruments: {', '.join(music_prefs.get('preferred_instruments', [])) or 'Not specified'}
- Response to Music: {music_prefs.get('response_to_music', 'Not specified')}

ACTIVE THERAPY GOALS:
{chr(10).join(f"- {g}" for g in active_goals) if active_goals else "No active goals set"}
"""
    except Exception as e:
        logger.error(f"Error building child context: {e}")
        return "Error loading child profile. Generate a general activity template."


# ===================== API ENDPOINTS =====================

@router.post("/generate", response_model=GenerateActivityResponse)
async def generate_activity(
    request: GenerateActivityRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Generate a complete activity template using AI
    """
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Build context
        context = await _build_child_context(user_id, request.child_id)

        # Build prompt
        system_prompt = _get_activity_generation_prompt(context, request)

        # Call GPT
        response = await gpt_client.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate an activity based on the requirements above."}
            ],
            temperature=0.8,
            response_format={"type": "json_object"}
        )

        # Parse response
        content = response.choices[0].message.content
        ai_response = json.loads(content)

        # Build ActivityTemplate from response
        activity_data = ai_response.get("activity", {})

        # Ensure required fields
        activity_data["id"] = activity_data.get("id", f"activity_{uuid.uuid4().hex[:8]}")
        activity_data["created_at"] = datetime.utcnow()
        activity_data["source_child_id"] = request.child_id

        # Convert nested objects
        if "primary_goals" in activity_data:
            activity_data["primary_goals"] = [
                TherapeuticGoal(**g) if isinstance(g, dict) else g
                for g in activity_data["primary_goals"]
            ]
        if "secondary_goals" in activity_data:
            activity_data["secondary_goals"] = [
                TherapeuticGoal(**g) if isinstance(g, dict) else g
                for g in activity_data["secondary_goals"]
            ]
        if "phases" in activity_data:
            activity_data["phases"] = [
                ActivityPhase(**p) if isinstance(p, dict) else p
                for p in activity_data["phases"]
            ]
        if "sensory_requirements" in activity_data:
            sr = activity_data["sensory_requirements"]
            if isinstance(sr, dict):
                # Convert string values to enums
                if "auditory_intensity" in sr:
                    sr["auditory_intensity"] = SensoryIntensity(sr["auditory_intensity"])
                if "visual_intensity" in sr:
                    sr["visual_intensity"] = SensoryIntensity(sr["visual_intensity"])
                activity_data["sensory_requirements"] = SensoryRequirements(**sr)
        if "materials" in activity_data:
            activity_data["materials"] = [
                MaterialItem(**m) if isinstance(m, dict) else m
                for m in activity_data["materials"]
            ]
        if "difficulty_levels" in activity_data:
            activity_data["difficulty_levels"] = [
                DifficultyLevel(d) if isinstance(d, str) else d
                for d in activity_data["difficulty_levels"]
            ]
        if "participant_roles" in activity_data:
            activity_data["participant_roles"] = [
                ParticipantRole(r) if isinstance(r, str) else r
                for r in activity_data["participant_roles"]
            ]
        if "category" in activity_data:
            activity_data["category"] = ActivityCategory(activity_data["category"])

        activity = ActivityTemplate(**activity_data)

        return GenerateActivityResponse(
            activity=activity,
            reasoning=ai_response.get("reasoning", ""),
            alternatives=ai_response.get("alternatives", [])
        )

    except Exception as e:
        logger.error(f"Error generating activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate activity: {str(e)}")


@router.post("/chat", response_model=ActivityChatResponse)
async def chat_activity_wizard(
    request: ActivityChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Chat-based activity generation wizard
    """
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # Build context
        context = await _build_child_context(user_id, request.child_id)

        # Build messages
        messages = [
            {"role": "system", "content": _get_chat_system_prompt(context)}
        ]

        # Add conversation history
        for msg in request.conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add user message
        messages.append({"role": "user", "content": request.user_message})

        # Call GPT
        response = await gpt_client.client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        # Parse response
        content = response.choices[0].message.content
        ai_response = json.loads(content)

        # Process activity if provided
        activity = None
        if ai_response.get("activity"):
            activity_data = ai_response["activity"]
            activity_data["id"] = activity_data.get("id", f"activity_{uuid.uuid4().hex[:8]}")
            activity_data["created_at"] = datetime.utcnow()
            activity_data["source_child_id"] = request.child_id

            # Convert nested objects (same as generate endpoint)
            if "primary_goals" in activity_data:
                activity_data["primary_goals"] = [
                    TherapeuticGoal(**g) if isinstance(g, dict) else g
                    for g in activity_data["primary_goals"]
                ]
            if "phases" in activity_data:
                activity_data["phases"] = [
                    ActivityPhase(**p) if isinstance(p, dict) else p
                    for p in activity_data["phases"]
                ]
            if "sensory_requirements" in activity_data:
                sr = activity_data["sensory_requirements"]
                if isinstance(sr, dict):
                    if "auditory_intensity" in sr:
                        sr["auditory_intensity"] = SensoryIntensity(sr.get("auditory_intensity", "moderate"))
                    if "visual_intensity" in sr:
                        sr["visual_intensity"] = SensoryIntensity(sr.get("visual_intensity", "moderate"))
                    activity_data["sensory_requirements"] = SensoryRequirements(**sr)
            if "category" in activity_data:
                activity_data["category"] = ActivityCategory(activity_data["category"])

            try:
                activity = ActivityTemplate(**activity_data)
            except Exception as e:
                logger.warning(f"Could not parse activity: {e}")
                activity = None

        return ActivityChatResponse(
            message=ai_response.get("message", ""),
            activity=activity,
            follow_up_questions=ai_response.get("follow_up_questions", []),
            is_complete=ai_response.get("is_complete", False)
        )

    except Exception as e:
        logger.error(f"Error in activity chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/save")
async def save_activity(
    request: SaveActivityRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Save a generated activity to the template library
    """
    user_id = auth_service.get_current_user_id(credentials)

    try:
        activity_data = request.activity.model_dump()
        activity_data["created_at"] = activity_data["created_at"].isoformat()
        activity_data["saved_by"] = user_id
        activity_data["is_template"] = request.save_as_global

        # Save to Azure
        path = f"activity_templates/{request.activity.id}.json"
        await azure_storage.upload_json(path, activity_data)

        return {"success": True, "activity_id": request.activity.id, "path": path}

    except Exception as e:
        logger.error(f"Error saving activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save activity: {str(e)}")


@router.get("/templates")
async def list_activity_templates(
    category: Optional[str] = None,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    List saved activity templates
    """
    user_id = auth_service.get_current_user_id(credentials)

    try:
        # List all activity templates
        templates = await azure_storage.list_blobs_in_path("activity_templates/")

        activities = []
        for template_path in templates[:limit]:
            try:
                data = await azure_storage.download_json(template_path)
                if data:
                    # Filter by category if specified
                    if category and data.get("category") != category:
                        continue
                    activities.append(data)
            except Exception:
                continue

        return {"activities": activities, "total": len(activities)}

    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@router.get("/templates/{activity_id}")
async def get_activity_template(
    activity_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get a specific activity template
    """
    try:
        path = f"activity_templates/{activity_id}.json"
        data = await azure_storage.download_json(path)

        if not data:
            raise HTTPException(status_code=404, detail="Activity not found")

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get activity: {str(e)}")


@router.delete("/templates/{activity_id}")
async def delete_activity_template(
    activity_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Delete an activity template
    """
    try:
        path = f"activity_templates/{activity_id}.json"
        await azure_storage.delete_blob(path)

        return {"success": True, "deleted": activity_id}

    except Exception as e:
        logger.error(f"Error deleting activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete activity: {str(e)}")

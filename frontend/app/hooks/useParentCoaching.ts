/**
 * Parent Coaching Hook
 *
 * Provides real-time, context-aware coaching prompts to caregivers during sessions.
 * Clinical rationale: Empowers parents with evidence-based strategies to support
 * their child's engagement and therapeutic progress.
 */

import { useState, useEffect, useCallback } from 'react';

export type CoachingPromptType =
  | 'technique'      // Musical technique to try
  | 'verbal'         // Suggested phrase to say
  | 'observation'    // What to watch for
  | 'safety'         // Comfort/safety alert
  | 'encouragement'  // Positive reinforcement
  | 'goal';          // Goal-related prompt

export interface CoachingPrompt {
  id: string;
  type: CoachingPromptType;
  title: string;
  description: string;
  action?: string;  // Clear action to take
  rationale?: string;  // Clinical reasoning (optional)
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed?: boolean;
}

interface AnalysisData {
  video_analysis?: {
    emotion: string;
    movement_level: string;
    engagement_score: number;
    face_detected: boolean;
  };
  audio_analysis?: {
    vocal_pattern: string;
    sound_level_db: number;
    vocal_pitch_hz: number;
    speech_detected: boolean;
  };
  timestamp?: string;
}

interface UseParentCoachingOptions {
  enabled: boolean;
  analysis?: AnalysisData | null;
  currentPhase?: string | null;
  musicStyle?: string | null;
  engagement?: 'LOW' | 'MED' | 'HIGH' | null;
  goalCategories?: string[];  // Active goal categories
}

export function useParentCoaching(options: UseParentCoachingOptions) {
  const { enabled, analysis, currentPhase, musicStyle, engagement, goalCategories = [] } = options;

  const [prompts, setPrompts] = useState<CoachingPrompt[]>([]);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);

  // Generate coaching prompts based on context
  const generatePrompts = useCallback(() => {
    if (!enabled) return [];

    const newPrompts: CoachingPrompt[] = [];
    const now = Date.now();

    // === ENGAGEMENT-BASED PROMPTS ===
    if (engagement === 'LOW' && musicStyle) {
      newPrompts.push({
        id: `low-engagement-${now}`,
        type: 'technique',
        title: 'Try Interactive Techniques',
        description: 'Child showing low engagement',
        action: 'Pause music and make eye contact. Try call-and-response or hand-over-hand drumming.',
        rationale: 'Direct interaction can re-engage attention better than passive listening.',
        priority: 'high',
        timestamp: now
      });
    }

    if (engagement === 'HIGH' && musicStyle === 'energetic') {
      newPrompts.push({
        id: `high-engagement-${now}`,
        type: 'encouragement',
        title: 'Excellent Engagement!',
        description: 'Child is highly engaged with energetic music',
        action: 'Continue current activity. Watch for signs of overstimulation.',
        rationale: 'High engagement indicates optimal therapeutic state.',
        priority: 'low',
        timestamp: now
      });
    }

    // === EMOTION-BASED PROMPTS ===
    const emotion = analysis?.video_analysis?.emotion;
    const vocalPattern = analysis?.audio_analysis?.vocal_pattern;

    if (emotion === 'distressed' || vocalPattern === 'crying') {
      newPrompts.push({
        id: `distressed-${now}`,
        type: 'safety',
        title: '⚠️ Child Appears Distressed',
        description: 'Emotional distress detected',
        action: 'Switch to calming music. Offer comfort item. Consider taking a sensory break.',
        rationale: 'Prioritize emotional regulation over therapeutic goals when distressed.',
        priority: 'high',
        timestamp: now
      });
    }

    if (emotion === 'happy' || vocalPattern === 'laughing') {
      newPrompts.push({
        id: `happy-${now}`,
        type: 'encouragement',
        title: '😊 Positive Response!',
        description: 'Child showing happiness',
        action: 'Narrate their joy: "You\'re smiling! The music makes you happy!"',
        rationale: 'Labeling emotions helps develop emotional awareness.',
        priority: 'medium',
        timestamp: now
      });
    }

    if (emotion === 'neutral' && engagement === 'MED') {
      newPrompts.push({
        id: `neutral-balanced-${now}`,
        type: 'observation',
        title: 'Child is Calm & Focused',
        description: 'Neutral emotion with balanced engagement',
        action: 'Good therapeutic state. Watch for: eye contact, vocalizations, reaching for instruments.',
        rationale: 'Calm focus is ideal for learning and skill-building.',
        priority: 'low',
        timestamp: now
      });
    }

    // === MOVEMENT-BASED PROMPTS ===
    const movementLevel = analysis?.video_analysis?.movement_level;
    if (movementLevel === 'high' || movementLevel === 'medium') {
      newPrompts.push({
        id: `movement-${now}`,
        type: 'verbal',
        title: 'Child is Moving!',
        description: 'Movement detected - motor engagement',
        action: 'Say: "I see you moving! Can you move your arms like this?" Then model a movement.',
        rationale: 'Mirroring and expanding on spontaneous movements builds motor skills.',
        priority: 'medium',
        timestamp: now
      });
    }

    // === PHASE-BASED PROMPTS ===
    if (currentPhase === 'hello') {
      newPrompts.push({
        id: `hello-phase-${now}`,
        type: 'technique',
        title: 'Hello Song Guidance',
        description: 'Use predictable greeting ritual',
        action: 'Sing the hello song at the same tempo. Use child\'s name. Wait for any response (sound, movement, eye contact).',
        rationale: 'Predictable routines reduce anxiety and set session expectations.',
        priority: 'medium',
        timestamp: now
      });
    }

    if (currentPhase === 'goodbye') {
      newPrompts.push({
        id: `goodbye-phase-${now}`,
        type: 'technique',
        title: 'Goodbye Song Transition',
        description: 'Prepare child for session end',
        action: 'Sing goodbye song slowly. Give a visual "all done" cue. Praise their participation.',
        rationale: 'Structured endings help children transition out of therapeutic activities.',
        priority: 'medium',
        timestamp: now
      });
    }

    // === GOAL-BASED PROMPTS ===
    if (goalCategories.includes('communication')) {
      newPrompts.push({
        id: `goal-communication-${now}`,
        type: 'goal',
        title: 'Communication Goal Active',
        description: 'Watch for vocalizations',
        action: 'Pause music periodically. Wait 5 seconds. Give child time to vocalize or respond.',
        rationale: 'Wait time is critical for children with communication delays.',
        priority: 'medium',
        timestamp: now
      });
    }

    if (goalCategories.includes('joint_attention')) {
      newPrompts.push({
        id: `goal-joint-attention-${now}`,
        type: 'goal',
        title: 'Joint Attention Goal Active',
        description: 'Encourage shared focus',
        action: 'Hold instrument at eye level between you and child. Point to it. Wait for child to look.',
        rationale: 'Joint attention is a foundational social skill for children with ASD.',
        priority: 'medium',
        timestamp: now
      });
    }

    if (goalCategories.includes('social_skills')) {
      newPrompts.push({
        id: `goal-social-${now}`,
        type: 'goal',
        title: 'Social Skills Goal Active',
        description: 'Practice turn-taking',
        action: 'Say "Your turn!" and hand child the drum. Then "My turn!" and take it back. Use visual cues.',
        rationale: 'Turn-taking with clear verbal and visual cues teaches social reciprocity.',
        priority: 'medium',
        timestamp: now
      });
    }

    // === MUSIC-BASED PROMPTS ===
    if (musicStyle === 'calm' && engagement === 'LOW') {
      newPrompts.push({
        id: `calm-low-engagement-${now}`,
        type: 'technique',
        title: 'Calm Music + Low Engagement',
        description: 'Child may need more stimulation',
        action: 'Try adding gentle movement: sway with child, tap their hand to the beat, or add a soft visual (scarf).',
        rationale: 'Multi-sensory input can increase engagement without overwhelming.',
        priority: 'medium',
        timestamp: now
      });
    }

    if (musicStyle === 'energetic' && engagement === 'LOW') {
      newPrompts.push({
        id: `energetic-low-engagement-${now}`,
        type: 'observation',
        title: 'Monitor for Overstimulation',
        description: 'Energetic music but low engagement',
        action: 'Child may be overwhelmed. Watch for: turning away, covering ears, distress. Consider switching to calmer music.',
        rationale: 'Low engagement with stimulating music may indicate sensory overload.',
        priority: 'high',
        timestamp: now
      });
    }

    // Filter out duplicates and keep only highest priority per type
    const uniquePrompts = newPrompts.reduce((acc, prompt) => {
      const existingIndex = acc.findIndex(p => p.type === prompt.type);
      if (existingIndex === -1) {
        acc.push(prompt);
      } else {
        // Keep higher priority
        const existing = acc[existingIndex];
        if (existing && prompt.priority === 'high' && existing.priority !== 'high') {
          acc[existingIndex] = prompt;
        }
      }
      return acc;
    }, [] as CoachingPrompt[]);

    return uniquePrompts.slice(0, 3);  // Limit to 3 prompts to avoid overwhelming
  }, [enabled, analysis, currentPhase, musicStyle, engagement, goalCategories]);

  // Update prompts when context changes
  useEffect(() => {
    if (!enabled) {
      setPrompts([]);
      return;
    }

    const now = Date.now();

    // Only regenerate prompts every 10 seconds to avoid spam
    if (now - lastAnalysisTime < 10000) {
      return;
    }

    const newPrompts = generatePrompts();

    // Merge with existing prompts (keep non-dismissed ones)
    setPrompts(prevPrompts => {
      const nonDismissed = prevPrompts.filter(p => !p.dismissed);
      const merged = [...nonDismissed];

      newPrompts.forEach(newPrompt => {
        // Only add if not already present
        if (!merged.some(p => p.type === newPrompt.type)) {
          merged.push(newPrompt);
        }
      });

      return merged.slice(0, 3);  // Keep max 3 prompts
    });

    setLastAnalysisTime(now);
  }, [enabled, analysis, currentPhase, musicStyle, engagement, goalCategories, generatePrompts, lastAnalysisTime]);

  // Dismiss a prompt
  const dismissPrompt = useCallback((promptId: string) => {
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  }, []);

  // Mark prompt as completed
  const completePrompt = useCallback((promptId: string) => {
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, dismissed: true } : p
    ).filter(p => !p.dismissed));
  }, []);

  // Clear all prompts
  const clearAllPrompts = useCallback(() => {
    setPrompts([]);
  }, []);

  return {
    prompts,
    dismissPrompt,
    completePrompt,
    clearAllPrompts
  };
}

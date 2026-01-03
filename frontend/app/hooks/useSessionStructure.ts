/**
 * Session Structure Hook
 *
 * Manages the structured flow of a therapy session:
 * 1. Hello Song (2 min) - Greeting and rapport building
 * 2. Core Activities (12-15 min) - Multiple therapeutic sub-activities
 *    - Receptive/Calming (3 min)
 *    - Active Movement (4 min)
 *    - Interactive/Social (4 min)
 *    - Creative Expression (3 min) - optional
 * 3. Goodbye Song (2 min) - Transition and closure
 *
 * Clinical rationale:
 * - Predictable structure reduces anxiety in ASD children
 * - Visual schedule helps with transitions
 * - Multiple short activities maintain engagement
 * - Variety addresses different therapeutic goals
 * - Consistent opening/closing creates safety and routine
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type SessionPhase = 'hello' | 'activity' | 'goodbye' | 'complete';
export type CoreActivityType = 'receptive' | 'movement' | 'interactive' | 'creative' | 'cognitive';

export interface CoreActivity {
  id: CoreActivityType;
  name: string;
  icon: string;
  color: string;
  durationMinutes: number;
  description: string;
  caregiverPrompt: string;
  musicStyle: string;
  examples: string[];
  therapeuticGoals: string[];
}

export const CORE_ACTIVITIES: CoreActivity[] = [
  {
    id: 'receptive',
    name: 'Receptive Listening',
    icon: '🎧',
    color: 'indigo',
    durationMinutes: 3,
    description: 'Calm listening and sensory regulation',
    caregiverPrompt: 'Encourage relaxed listening. Use soft voice and gentle prompts like "Listen to the music..."',
    musicStyle: 'calming_regulation',
    examples: ['Ambient listening', 'Guided breathing', 'Body scan with music', 'Sound identification'],
    therapeuticGoals: ['Sensory regulation', 'Attention', 'Calming', 'Auditory processing'],
  },
  {
    id: 'movement',
    name: 'Active Movement',
    icon: '🏃',
    color: 'orange',
    durationMinutes: 4,
    description: 'Physical activity with music',
    caregiverPrompt: 'Model the movements. Celebrate all attempts! Adjust intensity based on energy level.',
    musicStyle: 'movement_motor',
    examples: ['Animal walks', 'Dance prompts', 'Yoga poses', 'Marching', 'Freeze dance'],
    therapeuticGoals: ['Gross motor skills', 'Body awareness', 'Energy regulation', 'Following instructions'],
  },
  {
    id: 'interactive',
    name: 'Interactive Music',
    icon: '🥁',
    color: 'purple',
    durationMinutes: 4,
    description: 'Turn-taking and social music games',
    caregiverPrompt: 'Take turns and wait patiently. Praise participation. Keep instructions simple.',
    musicStyle: 'social_interactive',
    examples: ['Drum circle', 'Call & response', 'Pass the instrument', 'Copy my rhythm', 'Sing along'],
    therapeuticGoals: ['Turn-taking', 'Joint attention', 'Social skills', 'Imitation'],
  },
  {
    id: 'creative',
    name: 'Creative Expression',
    icon: '🎨',
    color: 'pink',
    durationMinutes: 3,
    description: 'Self-expression and choice-making',
    caregiverPrompt: 'Follow their lead. Accept all forms of expression. Offer choices, not instructions.',
    musicStyle: 'focus_attention',
    examples: ['Free instrument play', 'Song choice', 'Movement improvisation', 'Musical storytelling'],
    therapeuticGoals: ['Self-expression', 'Choice-making', 'Creativity', 'Autonomy'],
  },
  {
    id: 'cognitive',
    name: 'Cognitive Focus',
    icon: '🧩',
    color: 'teal',
    durationMinutes: 3,
    description: 'Attention and learning activities',
    caregiverPrompt: 'Keep it playful! Use visual supports if needed. Celebrate correct responses.',
    musicStyle: 'focus_attention',
    examples: ['Sound matching', 'Pattern games', 'Musical memory', 'Instrument identification'],
    therapeuticGoals: ['Attention', 'Memory', 'Pattern recognition', 'Cognitive flexibility'],
  },
];

export interface PhaseDefinition {
  id: SessionPhase;
  name: string;
  icon: string;
  color: string;
  durationMinutes: number;
  description: string;
  caregiverPrompt: string;
  musicStyle?: string;
  autoPlayMusic?: boolean;
  hasSubActivities?: boolean;
}

export const SESSION_PHASES: PhaseDefinition[] = [
  {
    id: 'hello',
    name: 'Hello Song',
    icon: '👋',
    color: 'green',
    durationMinutes: 2,
    description: 'Welcome and greeting routine',
    caregiverPrompt: 'Greet your child by name. Make eye contact and sing along with the hello song.',
    musicStyle: 'social_interactive',
    autoPlayMusic: true,
    hasSubActivities: false,
  },
  {
    id: 'activity',
    name: 'Core Activities',
    icon: '🎵',
    color: 'blue',
    durationMinutes: 14, // Sum of selected activities (flexible)
    description: 'Multiple therapeutic activities',
    caregiverPrompt: 'Follow the activity sequence. Watch for engagement cues and adjust as needed.',
    autoPlayMusic: false,
    hasSubActivities: true,
  },
  {
    id: 'goodbye',
    name: 'Goodbye Song',
    icon: '👋',
    color: 'orange',
    durationMinutes: 2,
    description: 'Closing and transition routine',
    caregiverPrompt: 'Signal the end of the session. Sing the goodbye song and prepare for the next activity.',
    musicStyle: 'calming_regulation',
    autoPlayMusic: true,
    hasSubActivities: false,
  },
];

interface UseSessionStructureOptions {
  enabled: boolean;
  onPhaseChange?: (phase: SessionPhase) => void;
  onPhaseComplete?: (phase: SessionPhase) => void;
  onSessionComplete?: () => void;
  onActivityChange?: (activity: CoreActivity) => void;
  onActivityComplete?: (activity: CoreActivity) => void;
}

export function useSessionStructure({
  enabled,
  onPhaseChange,
  onPhaseComplete,
  onSessionComplete,
  onActivityChange,
  onActivityComplete,
}: UseSessionStructureOptions) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseStartTime, setPhaseStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showingTransitionWarning, setShowingTransitionWarning] = useState(false);

  // Sub-activity state for Core Activity phase
  const [selectedActivities, setSelectedActivities] = useState<CoreActivity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [activityStartTime, setActivityStartTime] = useState<Date | null>(null);
  const [activityElapsedSeconds, setActivityElapsedSeconds] = useState(0);
  const [activitiesConfigured, setActivitiesConfigured] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = SESSION_PHASES[currentPhaseIndex];
  const isComplete = currentPhaseIndex >= SESSION_PHASES.length;
  const progress = isComplete ? 100 : (currentPhaseIndex / SESSION_PHASES.length) * 100;

  // Current sub-activity (only during activity phase)
  const currentActivity = currentPhase?.id === 'activity' && selectedActivities.length > 0
    ? selectedActivities[currentActivityIndex]
    : null;
  const isLastActivity = currentActivityIndex >= selectedActivities.length - 1;
  const activityProgress = selectedActivities.length > 0
    ? ((currentActivityIndex + 1) / selectedActivities.length) * 100
    : 0;

  // Calculate remaining time (for current activity during activity phase, or phase otherwise)
  const totalSeconds = currentActivity
    ? currentActivity.durationMinutes * 60
    : (currentPhase ? currentPhase.durationMinutes * 60 : 0);

  const currentElapsed = currentActivity ? activityElapsedSeconds : elapsedSeconds;
  const remainingSeconds = Math.max(0, totalSeconds - currentElapsed);
  const progressPercent = totalSeconds > 0 ? (currentElapsed / totalSeconds) * 100 : 0;

  // Calculate total activity phase duration based on selected activities
  const totalActivityDuration = selectedActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

  // Timer logic - handles both phase and activity timing
  useEffect(() => {
    if (!enabled || isPaused || isComplete) {
      return;
    }

    // For activity phase with sub-activities, track activity time
    const trackingActivity = currentPhase?.id === 'activity' && activityStartTime && currentActivity;

    timerRef.current = setInterval(() => {
      const now = new Date();

      if (trackingActivity && activityStartTime) {
        // Track activity elapsed time
        const activityElapsed = Math.floor((now.getTime() - activityStartTime.getTime()) / 1000);
        setActivityElapsedSeconds(activityElapsed);

        // Show warning 30 seconds before activity ends
        const activityTotal = currentActivity!.durationMinutes * 60;
        const activityRemaining = Math.max(0, activityTotal - activityElapsed);
        if (activityRemaining <= 30 && activityRemaining > 25 && !showingTransitionWarning) {
          setShowingTransitionWarning(true);
        }
      } else if (phaseStartTime) {
        // Track phase elapsed time (for hello/goodbye phases)
        const elapsed = Math.floor((now.getTime() - phaseStartTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);

        // Show transition warning 1 minute before phase ends
        const phaseTotal = currentPhase ? currentPhase.durationMinutes * 60 : 0;
        const phaseRemaining = Math.max(0, phaseTotal - elapsed);
        if (phaseRemaining <= 60 && phaseRemaining > 55 && !showingTransitionWarning) {
          setShowingTransitionWarning(true);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, isPaused, phaseStartTime, activityStartTime, currentPhase, currentActivity, showingTransitionWarning, isComplete]);

  // Start session structure
  const start = useCallback(() => {
    setCurrentPhaseIndex(0);
    setPhaseStartTime(new Date());
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowingTransitionWarning(false);
    // Reset activity state
    setCurrentActivityIndex(0);
    setActivityStartTime(null);
    setActivityElapsedSeconds(0);

    if (onPhaseChange && SESSION_PHASES[0]) {
      onPhaseChange(SESSION_PHASES[0].id);
    }
  }, [onPhaseChange]);

  // Configure activities for Core Activity phase
  const configureActivities = useCallback((activities: CoreActivity[]) => {
    setSelectedActivities(activities);
    setActivitiesConfigured(true);
    setCurrentActivityIndex(0);
    setActivityElapsedSeconds(0);
  }, []);

  // Start the first activity (called when entering activity phase)
  // Can optionally pass activities directly to avoid stale closure issue
  const startFirstActivity = useCallback((activitiesOverride?: CoreActivity[]) => {
    const activities = activitiesOverride || selectedActivities;
    if (activities.length > 0) {
      const firstActivity = activities[0];
      setCurrentActivityIndex(0);
      setActivityStartTime(new Date());
      setActivityElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onActivityChange && firstActivity) {
        onActivityChange(firstActivity);
      }
    }
  }, [selectedActivities, onActivityChange]);

  // Move to next activity within Core Activity phase
  const nextActivity = useCallback(() => {
    if (currentActivity && onActivityComplete) {
      onActivityComplete(currentActivity);
    }

    const nextActivityIdx = currentActivityIndex + 1;

    if (nextActivityIdx >= selectedActivities.length) {
      // All activities complete, move to next phase (goodbye)
      nextPhaseInternal();
    } else {
      // Move to next activity
      setCurrentActivityIndex(nextActivityIdx);
      setActivityStartTime(new Date());
      setActivityElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onActivityChange && selectedActivities[nextActivityIdx]) {
        onActivityChange(selectedActivities[nextActivityIdx]);
      }
    }
  }, [currentActivityIndex, selectedActivities, currentActivity, onActivityChange, onActivityComplete]);

  // Skip to specific activity
  const skipToActivity = useCallback((activityId: CoreActivityType) => {
    const index = selectedActivities.findIndex(a => a.id === activityId);
    if (index !== -1) {
      const targetActivity = selectedActivities[index];
      setCurrentActivityIndex(index);
      setActivityStartTime(new Date());
      setActivityElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onActivityChange && targetActivity) {
        onActivityChange(targetActivity);
      }
    }
  }, [selectedActivities, onActivityChange]);

  // Internal next phase (used by nextActivity when activities complete)
  const nextPhaseInternal = useCallback(() => {
    const nextIndex = currentPhaseIndex + 1;

    if (onPhaseComplete && currentPhase) {
      onPhaseComplete(currentPhase.id);
    }

    // Reset activity state
    setCurrentActivityIndex(0);
    setActivityStartTime(null);
    setActivityElapsedSeconds(0);

    if (nextIndex >= SESSION_PHASES.length) {
      setCurrentPhaseIndex(nextIndex);
      if (onSessionComplete) {
        onSessionComplete();
      }
    } else {
      setCurrentPhaseIndex(nextIndex);
      setPhaseStartTime(new Date());
      setElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onPhaseChange && SESSION_PHASES[nextIndex]) {
        onPhaseChange(SESSION_PHASES[nextIndex].id);
      }
    }
  }, [currentPhaseIndex, currentPhase, onPhaseChange, onPhaseComplete, onSessionComplete]);

  // Move to next phase (public version)
  const nextPhase = useCallback(() => {
    // If in activity phase with activities, complete all remaining
    if (currentPhase?.id === 'activity' && currentActivity && onActivityComplete) {
      onActivityComplete(currentActivity);
    }
    nextPhaseInternal();
  }, [currentPhase, currentActivity, onActivityComplete, nextPhaseInternal]);

  // Skip to specific phase
  const skipToPhase = useCallback((phaseId: SessionPhase) => {
    const index = SESSION_PHASES.findIndex(p => p.id === phaseId);
    if (index !== -1) {
      // Reset activity state when skipping phases
      setCurrentActivityIndex(0);
      setActivityStartTime(null);
      setActivityElapsedSeconds(0);

      setCurrentPhaseIndex(index);
      setPhaseStartTime(new Date());
      setElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onPhaseChange) {
        onPhaseChange(phaseId);
      }
    }
  }, [onPhaseChange]);

  // Pause/Resume
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    const now = new Date();

    // Adjust phase start time
    if (phaseStartTime) {
      const newStartTime = new Date(now.getTime() - (elapsedSeconds * 1000));
      setPhaseStartTime(newStartTime);
    }

    // Adjust activity start time if tracking activity
    if (activityStartTime) {
      const newActivityStartTime = new Date(now.getTime() - (activityElapsedSeconds * 1000));
      setActivityStartTime(newActivityStartTime);
    }

    setIsPaused(false);
  }, [phaseStartTime, elapsedSeconds, activityStartTime, activityElapsedSeconds]);

  // Reset
  const reset = useCallback(() => {
    setCurrentPhaseIndex(0);
    setPhaseStartTime(null);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowingTransitionWarning(false);
    // Reset activity state
    setSelectedActivities([]);
    setCurrentActivityIndex(0);
    setActivityStartTime(null);
    setActivityElapsedSeconds(0);
    setActivitiesConfigured(false);
  }, []);

  // Dismiss transition warning
  const dismissTransitionWarning = useCallback(() => {
    setShowingTransitionWarning(false);
  }, []);

  return {
    // Phase State
    currentPhase,
    currentPhaseIndex,
    isComplete,
    progress,
    elapsedSeconds,
    remainingSeconds,
    progressPercent,
    isPaused,
    showingTransitionWarning,

    // Activity State
    currentActivity,
    currentActivityIndex,
    selectedActivities,
    activitiesConfigured,
    activityElapsedSeconds,
    activityProgress,
    isLastActivity,
    totalActivityDuration,

    // Phase Actions
    start,
    nextPhase,
    skipToPhase,
    pause,
    resume,
    reset,
    dismissTransitionWarning,

    // Activity Actions
    configureActivities,
    startFirstActivity,
    nextActivity,
    skipToActivity,

    // Helpers
    allPhases: SESSION_PHASES,
    allActivities: CORE_ACTIVITIES,
  };
}

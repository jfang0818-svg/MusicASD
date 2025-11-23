/**
 * Session Structure Hook
 *
 * Manages the structured flow of a therapy session:
 * 1. Hello Song (2 min) - Greeting and rapport building
 * 2. Core Activity (10-15 min) - Main therapeutic intervention
 * 3. Goodbye Song (2 min) - Transition and closure
 *
 * Clinical rationale:
 * - Predictable structure reduces anxiety in ASD children
 * - Visual schedule helps with transitions
 * - Consistent opening/closing creates safety and routine
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type SessionPhase = 'hello' | 'activity' | 'goodbye' | 'complete';

export interface PhaseDefinition {
  id: SessionPhase;
  name: string;
  icon: string;
  color: string;
  durationMinutes: number;
  description: string;
  caregiverPrompt: string;
  musicStyle?: 'calming_regulation' | 'focus_attention' | 'movement_motor';
  autoPlayMusic?: boolean;
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
  },
  {
    id: 'activity',
    name: 'Core Activity',
    icon: '🎵',
    color: 'blue',
    durationMinutes: 12,
    description: 'Main therapeutic activity',
    caregiverPrompt: 'Engage with your child through music. Follow their lead and respond to their cues.',
    // Music is chosen based on real-time analysis
    autoPlayMusic: false,
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
  },
];

interface UseSessionStructureOptions {
  enabled: boolean;
  onPhaseChange?: (phase: SessionPhase) => void;
  onPhaseComplete?: (phase: SessionPhase) => void;
  onSessionComplete?: () => void;
}

export function useSessionStructure({
  enabled,
  onPhaseChange,
  onPhaseComplete,
  onSessionComplete,
}: UseSessionStructureOptions) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseStartTime, setPhaseStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showingTransitionWarning, setShowingTransitionWarning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = SESSION_PHASES[currentPhaseIndex];
  const isComplete = currentPhaseIndex >= SESSION_PHASES.length;
  const progress = isComplete ? 100 : (currentPhaseIndex / SESSION_PHASES.length) * 100;

  // Calculate remaining time
  const totalSeconds = currentPhase ? currentPhase.durationMinutes * 60 : 0;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const progressPercent = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;

  // Timer logic
  useEffect(() => {
    if (!enabled || isPaused || !phaseStartTime || isComplete) {
      return;
    }

    timerRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - phaseStartTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);

      // Show transition warning 1 minute before phase ends
      if (remainingSeconds <= 60 && remainingSeconds > 55 && !showingTransitionWarning) {
        setShowingTransitionWarning(true);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, isPaused, phaseStartTime, remainingSeconds, showingTransitionWarning, isComplete]);

  // Start session structure
  const start = useCallback(() => {
    setCurrentPhaseIndex(0);
    setPhaseStartTime(new Date());
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowingTransitionWarning(false);

    if (onPhaseChange && SESSION_PHASES[0]) {
      onPhaseChange(SESSION_PHASES[0].id);
    }
  }, [onPhaseChange]);

  // Move to next phase
  const nextPhase = useCallback(() => {
    const nextIndex = currentPhaseIndex + 1;

    if (onPhaseComplete && currentPhase) {
      onPhaseComplete(currentPhase.id);
    }

    if (nextIndex >= SESSION_PHASES.length) {
      // Session complete
      setCurrentPhaseIndex(nextIndex);
      if (onSessionComplete) {
        onSessionComplete();
      }
    } else {
      // Move to next phase
      setCurrentPhaseIndex(nextIndex);
      setPhaseStartTime(new Date());
      setElapsedSeconds(0);
      setShowingTransitionWarning(false);

      if (onPhaseChange && SESSION_PHASES[nextIndex]) {
        onPhaseChange(SESSION_PHASES[nextIndex].id);
      }
    }
  }, [currentPhaseIndex, currentPhase, onPhaseChange, onPhaseComplete, onSessionComplete]);

  // Skip to specific phase
  const skipToPhase = useCallback((phaseId: SessionPhase) => {
    const index = SESSION_PHASES.findIndex(p => p.id === phaseId);
    if (index !== -1) {
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
    // Adjust start time to account for pause
    if (phaseStartTime) {
      const now = new Date();
      const newStartTime = new Date(now.getTime() - (elapsedSeconds * 1000));
      setPhaseStartTime(newStartTime);
    }
    setIsPaused(false);
  }, [phaseStartTime, elapsedSeconds]);

  // Reset
  const reset = useCallback(() => {
    setCurrentPhaseIndex(0);
    setPhaseStartTime(null);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowingTransitionWarning(false);
  }, []);

  // Dismiss transition warning
  const dismissTransitionWarning = useCallback(() => {
    setShowingTransitionWarning(false);
  }, []);

  return {
    // State
    currentPhase,
    currentPhaseIndex,
    isComplete,
    progress,
    elapsedSeconds,
    remainingSeconds,
    progressPercent,
    isPaused,
    showingTransitionWarning,

    // Actions
    start,
    nextPhase,
    skipToPhase,
    pause,
    resume,
    reset,
    dismissTransitionWarning,

    // Helpers
    allPhases: SESSION_PHASES,
  };
}

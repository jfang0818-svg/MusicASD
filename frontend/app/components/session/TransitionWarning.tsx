'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { PhaseDefinition, CoreActivity } from '@/app/hooks/useSessionStructure';

interface TransitionWarningProps {
  show: boolean;
  currentPhase: PhaseDefinition | undefined;
  nextPhase: PhaseDefinition | undefined;
  remainingSeconds: number;
  onDismiss: () => void;
  // Activity-specific props
  currentActivity?: CoreActivity | null;
  nextActivity?: CoreActivity;
  isActivityTransition?: boolean;
}

export default function TransitionWarning({
  show,
  currentPhase,
  nextPhase,
  remainingSeconds,
  onDismiss,
  currentActivity,
  nextActivity,
  isActivityTransition = false,
}: TransitionWarningProps) {
  // For activity transitions, check activity instead of phase
  if (!show) {
    return null;
  }

  if (isActivityTransition && !currentActivity) {
    return null;
  }

  if (!isActivityTransition && !currentPhase) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine what to display
  const currentName = isActivityTransition ? currentActivity?.name : currentPhase?.name;
  const currentIcon = isActivityTransition ? currentActivity?.icon : currentPhase?.icon;
  const nextName = isActivityTransition ? nextActivity?.name : nextPhase?.name;
  const nextIcon = isActivityTransition ? nextActivity?.icon : nextPhase?.icon;
  const nextDescription = isActivityTransition ? nextActivity?.description : nextPhase?.description;
  const isLastItem = isActivityTransition ? !nextActivity : !nextPhase;
  const transitionType = isActivityTransition ? 'Activity' : 'Phase';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <div className={`${isActivityTransition ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600'} border-2 rounded-xl p-4 shadow-lg`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <Clock className={`h-6 w-6 ${isActivityTransition ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className={`font-bold text-sm ${isActivityTransition ? 'text-blue-900 dark:text-blue-100' : 'text-yellow-900 dark:text-yellow-100'} mb-1`}>
                ⏰ {transitionType} Ending Soon
              </h3>
              <p className={`text-sm ${isActivityTransition ? 'text-blue-800 dark:text-blue-200' : 'text-yellow-800 dark:text-yellow-200'} mb-2`}>
                <span className="font-semibold">{currentIcon} {currentName}</span> will end in{' '}
                <span className="font-bold">{formatTime(remainingSeconds)}</span>
              </p>

              {!isLastItem && nextName ? (
                <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-gray-900/30 rounded-lg p-2">
                  <span className="text-2xl">{nextIcon}</span>
                  <div>
                    <p className={`font-semibold ${isActivityTransition ? 'text-blue-900 dark:text-blue-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                      Next: {nextName}
                    </p>
                    <p className={isActivityTransition ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'}>
                      {nextDescription}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-lg p-2">
                  <p className="font-semibold">
                    {isActivityTransition ? 'Moving to Goodbye Song next 🎉' : 'Session will complete soon 🎉'}
                  </p>
                </div>
              )}

              <p className={`text-xs ${isActivityTransition ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'} mt-2`}>
                💡 {isActivityTransition
                  ? 'Prepare to transition to the next activity'
                  : 'Give your child a 1-minute warning to prepare for the transition'}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 p-1 ${isActivityTransition ? 'hover:bg-blue-200 dark:hover:bg-blue-800' : 'hover:bg-yellow-200 dark:hover:bg-yellow-800'} rounded-lg transition-colors`}
            >
              <X className={`h-4 w-4 ${isActivityTransition ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

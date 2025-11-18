'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { PhaseDefinition } from '@/app/hooks/useSessionStructure';

interface TransitionWarningProps {
  show: boolean;
  currentPhase: PhaseDefinition | undefined;
  nextPhase: PhaseDefinition | undefined;
  remainingSeconds: number;
  onDismiss: () => void;
}

export default function TransitionWarning({
  show,
  currentPhase,
  nextPhase,
  remainingSeconds,
  onDismiss,
}: TransitionWarningProps) {
  if (!show || !currentPhase) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold text-sm text-yellow-900 dark:text-yellow-100 mb-1">
                ⏰ Transition Coming Soon
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                <span className="font-semibold">{currentPhase.name}</span> will end in{' '}
                <span className="font-bold">{formatTime(remainingSeconds)}</span>
              </p>

              {nextPhase ? (
                <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-gray-900/30 rounded-lg p-2">
                  <span className="text-2xl">{nextPhase.icon}</span>
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                      Next: {nextPhase.name}
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      {nextPhase.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-lg p-2">
                  <p className="font-semibold">Session will complete soon 🎉</p>
                </div>
              )}

              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                💡 Give your child a 1-minute warning to prepare for the transition
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

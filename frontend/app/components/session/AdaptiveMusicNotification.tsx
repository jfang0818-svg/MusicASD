'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Sparkles, AlertCircle } from 'lucide-react';

interface AdaptiveMusicRecommendation {
  shouldChange: boolean;
  recommendedStyle: 'calm' | 'happy' | 'energetic' | null;
  reason: string;
  confidence: number;
}

interface AdaptiveMusicNotificationProps {
  recommendation: AdaptiveMusicRecommendation | null;
  onAccept: () => void;
  onDismiss: () => void;
  autoAcceptEnabled?: boolean;
}

export default function AdaptiveMusicNotification({
  recommendation,
  onAccept,
  onDismiss,
  autoAcceptEnabled = false,
}: AdaptiveMusicNotificationProps) {
  if (!recommendation || !recommendation.shouldChange) {
    return null;
  }

  const styleColors = {
    calm: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-900 dark:text-blue-100',
      badge: 'bg-blue-200 dark:bg-blue-800',
    },
    happy: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      text: 'text-yellow-900 dark:text-yellow-100',
      badge: 'bg-yellow-200 dark:bg-yellow-800',
    },
    energetic: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-300 dark:border-orange-700',
      text: 'text-orange-900 dark:text-orange-100',
      badge: 'bg-orange-200 dark:bg-orange-800',
    },
  };

  const colors = recommendation.recommendedStyle
    ? styleColors[recommendation.recommendedStyle]
    : styleColors.calm;

  const confidencePercent = Math.round(recommendation.confidence * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <div
          className={`${colors.bg} ${colors.border} ${colors.text} border-2 rounded-xl p-4 shadow-lg`}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              {recommendation.confidence >= 0.8 ? (
                <Sparkles className="h-6 w-6" />
              ) : (
                <Music className="h-6 w-6" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-sm">
                  {autoAcceptEnabled
                    ? '🤖 Auto-Adapting Music'
                    : '🎵 AI Music Suggestion'}
                </h3>
                <span className={`${colors.badge} text-xs px-2 py-0.5 rounded-full font-semibold`}>
                  {recommendation.recommendedStyle?.toUpperCase()}
                </span>
                <span className="text-xs opacity-70">
                  {confidencePercent}% confidence
                </span>
              </div>

              <p className="text-sm mb-3">{recommendation.reason}</p>

              {/* Actions */}
              {!autoAcceptEnabled && (
                <div className="flex gap-2">
                  <button
                    onClick={onAccept}
                    className="flex-1 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm"
                  >
                    ✓ Switch Music
                  </button>
                  <button
                    onClick={onDismiss}
                    className="px-4 py-2 rounded-lg font-semibold text-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    Keep Current
                  </button>
                </div>
              )}

              {autoAcceptEnabled && (
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <AlertCircle className="h-3 w-3" />
                  <span>Music will change automatically in a few seconds...</span>
                </div>
              )}
            </div>

            {/* Close button */}
            {!autoAcceptEnabled && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

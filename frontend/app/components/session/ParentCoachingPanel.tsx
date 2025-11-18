/**
 * Parent Coaching Panel
 *
 * Displays real-time coaching prompts to empower caregivers during therapy sessions.
 * Provides evidence-based techniques, verbal prompts, and safety alerts.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  MessageSquare,
  Eye,
  AlertTriangle,
  Sparkles,
  Target,
  X,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import type { CoachingPrompt } from '@/app/hooks/useParentCoaching';

interface ParentCoachingPanelProps {
  prompts: CoachingPrompt[];
  onDismiss: (promptId: string) => void;
  onComplete: (promptId: string) => void;
  enabled: boolean;
}

const ICON_MAP = {
  technique: Lightbulb,
  verbal: MessageSquare,
  observation: Eye,
  safety: AlertTriangle,
  encouragement: Sparkles,
  goal: Target
};

const PRIORITY_COLORS = {
  high: {
    border: 'border-red-300 dark:border-red-700',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500 text-white'
  },
  medium: {
    border: 'border-blue-300 dark:border-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500 text-white'
  },
  low: {
    border: 'border-green-300 dark:border-green-700',
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-500 text-white'
  }
};

export default function ParentCoachingPanel({
  prompts,
  onDismiss,
  onComplete,
  enabled
}: ParentCoachingPanelProps) {
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

  if (!enabled || prompts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">
            Parent Coaching
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time guidance for caregivers
          </p>
        </div>
      </div>

      {/* Prompts */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {prompts.map((prompt) => {
            const Icon = ICON_MAP[prompt.type];
            const colors = PRIORITY_COLORS[prompt.priority];
            const isExpanded = expandedPromptId === prompt.id;

            return (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.2 }}
                className={`border-2 rounded-lg ${colors.border} ${colors.bg} overflow-hidden`}
              >
                {/* Main Content */}
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 ${colors.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title and Priority Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {prompt.title}
                        </h4>
                        {prompt.priority === 'high' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                            High Priority
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                        {prompt.description}
                      </p>

                      {/* Action (always visible) */}
                      {prompt.action && (
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                            💡 Try This:
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-200">
                            {prompt.action}
                          </p>
                        </div>
                      )}

                      {/* Rationale (expandable) */}
                      {prompt.rationale && (
                        <>
                          <button
                            onClick={() => setExpandedPromptId(isExpanded ? null : prompt.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Hide clinical rationale
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Why this works
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2 mb-2"
                            >
                              <p className="text-xs text-gray-700 dark:text-gray-200 italic">
                                📚 {prompt.rationale}
                              </p>
                            </motion.div>
                          )}
                        </>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onComplete(prompt.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Done
                        </button>
                        <button
                          onClick={() => onDismiss(prompt.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Coaching prompts update based on child's responses
        </p>
      </div>
    </div>
  );
}

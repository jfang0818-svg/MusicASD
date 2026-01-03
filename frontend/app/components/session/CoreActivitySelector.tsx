'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Target, ChevronLeft, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import { CoreActivity, CORE_ACTIVITIES, CoreActivityType, PhaseDefinition, SessionPhase } from '@/app/hooks/useSessionStructure';

interface CoreActivitySelectorProps {
  onConfirm: (activities: CoreActivity[]) => void;
  onCancel?: () => void;
  childName?: string;
  recommendedActivities?: CoreActivityType[];
  maxActivities?: number;
  // Phase navigation props
  allPhases?: PhaseDefinition[];
  currentPhaseIndex?: number;
  onSkipToPhase?: (phaseId: SessionPhase) => void;
}

// Pre-defined activity templates
const ACTIVITY_TEMPLATES = [
  {
    id: 'regulation',
    name: 'Regulation Focus',
    description: 'Calming → Movement → Calming',
    activities: ['receptive', 'movement', 'receptive'] as CoreActivityType[],
    icon: '🧘',
    color: 'indigo',
  },
  {
    id: 'social',
    name: 'Social Skills',
    description: 'Movement → Interactive → Interactive',
    activities: ['movement', 'interactive', 'interactive'] as CoreActivityType[],
    icon: '🤝',
    color: 'purple',
  },
  {
    id: 'balanced',
    name: 'Balanced Session',
    description: 'Receptive → Movement → Interactive → Creative',
    activities: ['receptive', 'movement', 'interactive', 'creative'] as CoreActivityType[],
    icon: '⚖️',
    color: 'blue',
  },
  {
    id: 'energetic',
    name: 'High Energy',
    description: 'Movement → Interactive → Movement',
    activities: ['movement', 'interactive', 'movement'] as CoreActivityType[],
    icon: '⚡',
    color: 'orange',
  },
];

export default function CoreActivitySelector({
  onConfirm,
  onCancel,
  childName,
  recommendedActivities,
  maxActivities = 4,
  allPhases,
  currentPhaseIndex,
  onSkipToPhase,
}: CoreActivitySelectorProps) {
  const [selectedActivities, setSelectedActivities] = useState<CoreActivity[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);

  // Calculate total duration
  const totalDuration = selectedActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

  // Toggle activity selection
  const toggleActivity = (activity: CoreActivity) => {
    const isSelected = selectedActivities.some(a => a.id === activity.id);

    if (isSelected) {
      setSelectedActivities(prev => prev.filter(a => a.id !== activity.id));
    } else if (selectedActivities.length < maxActivities) {
      setSelectedActivities(prev => [...prev, activity]);
    }
  };

  // Apply template
  const applyTemplate = (templateActivities: CoreActivityType[]) => {
    const activities: CoreActivity[] = [];
    for (const id of templateActivities) {
      const activity = CORE_ACTIVITIES.find(a => a.id === id);
      if (activity) {
        activities.push(activity);
      }
    }
    setSelectedActivities(activities);
    setShowTemplates(false);
  };

  // Move activity up in order
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...selectedActivities];
    const temp = newOrder[index - 1];
    const current = newOrder[index];
    if (temp && current) {
      newOrder[index - 1] = current;
      newOrder[index] = temp;
      setSelectedActivities(newOrder);
    }
  };

  // Move activity down in order
  const moveDown = (index: number) => {
    if (index === selectedActivities.length - 1) return;
    const newOrder = [...selectedActivities];
    const current = newOrder[index];
    const next = newOrder[index + 1];
    if (current && next) {
      newOrder[index] = next;
      newOrder[index + 1] = current;
      setSelectedActivities(newOrder);
    }
  };

  // Get color class for activity
  const getColorClass = (color: string, type: 'bg' | 'border' | 'text') => {
    const colors: Record<string, Record<string, string>> = {
      indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-500', text: 'text-indigo-600' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-600' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-600' },
      pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-600' },
      teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-500', text: 'text-teal-600' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-600' },
    };
    const colorSet = colors[color] ?? colors.blue;
    return colorSet?.[type] ?? colorSet?.bg ?? 'bg-blue-100';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Phase Navigation */}
      {allPhases && onSkipToPhase && currentPhaseIndex !== undefined && (
        <div className="flex items-center justify-end gap-1 mb-4">
          <button
            onClick={() => currentPhaseIndex > 0 && onSkipToPhase(allPhases[currentPhaseIndex - 1].id)}
            disabled={currentPhaseIndex === 0}
            className={`p-1 rounded-lg transition-all ${
              currentPhaseIndex === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label="Previous phase"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-center">
            Phase {currentPhaseIndex + 1} of {allPhases.length}
          </span>
          <button
            onClick={() => currentPhaseIndex < allPhases.length - 1 && onSkipToPhase(allPhases[currentPhaseIndex + 1].id)}
            disabled={currentPhaseIndex === allPhases.length - 1}
            className={`p-1 rounded-lg transition-all ${
              currentPhaseIndex === allPhases.length - 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label="Next phase"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Plan Core Activities {childName && `for ${childName}`}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select 2-4 activities to create a structured therapy sequence
        </p>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Quick Templates
            </h3>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Hide templates
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACTIVITY_TEMPLATES.map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => applyTemplate(template.activities)}
                className={`p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-${template.color}-400 bg-white dark:bg-gray-800 text-left transition-all`}
              >
                <div className="text-2xl mb-1">{template.icon}</div>
                <div className="font-semibold text-sm text-gray-800 dark:text-white">
                  {template.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {template.description}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {!showTemplates && (
        <button
          onClick={() => setShowTemplates(true)}
          className="mb-4 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Show templates
        </button>
      )}

      {/* Activity Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {CORE_ACTIVITIES.map((activity) => {
          const isSelected = selectedActivities.some(a => a.id === activity.id);
          const selectionIndex = selectedActivities.findIndex(a => a.id === activity.id);
          const isRecommended = recommendedActivities?.includes(activity.id);

          return (
            <motion.button
              key={activity.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleActivity(activity)}
              disabled={!isSelected && selectedActivities.length >= maxActivities}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? `${getColorClass(activity.color, 'border')} ${getColorClass(activity.color, 'bg')}`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
              } ${!isSelected && selectedActivities.length >= maxActivities ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${getColorClass(activity.color, 'text')} bg-white flex items-center justify-center font-bold text-sm shadow`}>
                  {selectionIndex + 1}
                </div>
              )}

              {/* Recommended badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full font-semibold">
                  Recommended
                </div>
              )}

              {/* Icon */}
              <div className="text-3xl mb-2">{activity.icon}</div>

              {/* Name & Duration */}
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-gray-800 dark:text-white">
                  {activity.name}
                </h4>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.durationMinutes}m
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {activity.description}
              </p>

              {/* Examples */}
              <div className="flex flex-wrap gap-1">
                {activity.examples.slice(0, 3).map((example, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                  >
                    {example}
                  </span>
                ))}
              </div>

              {/* Goals */}
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Target className="w-3 h-3" />
                  {activity.therapeuticGoals.slice(0, 2).join(', ')}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Activities Order */}
      <AnimatePresence>
        {selectedActivities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Activity Sequence ({totalDuration} min total)
              </h3>
              <button
                onClick={() => setSelectedActivities([])}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            </div>

            <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-x-auto">
              {selectedActivities.map((activity, index) => (
                <motion.div
                  key={`${activity.id}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center"
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getColorClass(activity.color, 'bg')} border ${getColorClass(activity.color, 'border')}`}
                  >
                    <span className="text-lg">{activity.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-800 dark:text-white truncate">
                        {activity.name}
                      </div>
                      <div className="text-xs text-gray-500">{activity.durationMinutes}m</div>
                    </div>
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 ml-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="w-3 h-3 -rotate-90" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                        disabled={index === selectedActivities.length - 1}
                        className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>
                  </div>
                  {index < selectedActivities.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-gray-400 mx-1 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold transition-colors"
          >
            Cancel
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onConfirm(selectedActivities)}
          disabled={selectedActivities.length < 2}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Start Activities ({selectedActivities.length} selected)
        </motion.button>
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-gray-500 mt-4">
        💡 Tip: Start with calming activities if the child needs regulation, or movement if they have excess energy.
      </p>
    </div>
  );
}

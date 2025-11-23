'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';

interface TherapyGoal {
  goal_id: string;
  child_id: string;
  category: string;
  title: string;
  description: string;
  measurement_type: string;
  baseline: number;
  target: number;
  unit: string;
  status: string;
  current_value: number;
  sessions_tracked: number;
  created_date: string;
  target_date?: string;
  notes?: string;
  intervention_strategies: string[];
}

interface QuickGoal {
  id: string;
  title: string;
  type: 'binary' | 'categorical';
  description: string;
  // For binary metrics
  binaryValue?: boolean;
  // For categorical metrics
  categoricalValue?: string;
  options?: string[];
}

interface QuickGoalTrackerProps {
  sessionId: string;
  goals: TherapyGoal[];
  onGoalUpdate?: (goalId: string, value: number) => void;
}

// Fallback goals if no backend goals exist - 9 comprehensive therapy metrics
const DEFAULT_GOALS: QuickGoal[] = [
  {
    id: 'initiation',
    title: 'Initiation',
    type: 'binary',
    description: 'Student initiates participation without additional prompting',
    binaryValue: undefined
  },
  {
    id: 'task_persistence',
    title: 'Task Persistence',
    type: 'categorical',
    description: 'Student engagement throughout activity',
    categoricalValue: undefined,
    options: ['Full completion', 'Majority completion', 'Some completion', 'No completion']
  },
  {
    id: 'response_to_prompt',
    title: 'Response to Prompt',
    type: 'binary',
    description: 'Student responds appropriately to therapist prompts',
    binaryValue: undefined
  },
  {
    id: 'communication',
    title: 'Communication',
    type: 'binary',
    description: 'Student demonstrates verbal or non-verbal communication',
    binaryValue: undefined
  },
  {
    id: 'motor_movement',
    title: 'Motor Movement',
    type: 'binary',
    description: 'Student exhibits purposeful motor responses',
    binaryValue: undefined
  },
  {
    id: 'rhythmic_synchronization',
    title: 'Rhythmic Synchronization',
    type: 'categorical',
    description: 'Student synchronizes movements with music rhythm',
    categoricalValue: undefined,
    options: ['Continuous sync', 'Brief sync', 'No sync']
  },
  {
    id: 'emotion',
    title: 'Emotion',
    type: 'categorical',
    description: 'Student displays emotional response',
    categoricalValue: undefined,
    options: ['Positive affect', 'Neutral affect', 'Disengaged']
  },
  {
    id: 'aversion',
    title: 'Aversion',
    type: 'binary',
    description: 'Student shows signs of discomfort or aversion',
    binaryValue: undefined
  },
  {
    id: 'deviance_engagement',
    title: 'Deviance from Typical Engagement',
    type: 'categorical',
    description: 'Comparison to student\'s baseline engagement',
    categoricalValue: undefined,
    options: [
      'Significantly less engaged',
      'Somewhat less engaged',
      'Typical engagement',
      'Somewhat greater engaged',
      'Significantly greater engaged'
    ]
  }
];

// Convert backend TherapyGoal to QuickGoal format
function convertToQuickGoal(therapyGoal: TherapyGoal): QuickGoal {
  const isBinary = therapyGoal.measurement_type === 'binary';
  const isCategorical = therapyGoal.measurement_type === 'categorical';

  return {
    id: therapyGoal.goal_id,
    title: therapyGoal.title,
    type: isBinary ? 'binary' : isCategorical ? 'categorical' : 'binary',
    description: therapyGoal.description || '',
    binaryValue: isBinary ? undefined : undefined,
    categoricalValue: isCategorical ? undefined : undefined,
    options: isCategorical ? [] : undefined
  };
}

export default function QuickGoalTracker({
  sessionId: _sessionId,
  goals: backendGoals,
  onGoalUpdate
}: QuickGoalTrackerProps) {
  const [goals, setGoals] = useState<QuickGoal[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize goals from backend or use defaults
  useEffect(() => {
    if (backendGoals && backendGoals.length > 0) {
      // Convert backend goals to QuickGoal format
      const quickGoals = backendGoals.slice(0, 8).map(convertToQuickGoal); // Show up to 8 goals
      setGoals(quickGoals);
    } else {
      // Use default 8 therapy metrics if none from backend
      setGoals(DEFAULT_GOALS);
    }
  }, [backendGoals]);

  const toggleBinaryGoal = (goalId: string, value: boolean) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId && goal.type === 'binary') {
        onGoalUpdate?.(goalId, value ? 1 : 0);
        return { ...goal, binaryValue: value };
      }
      return goal;
    }));
  };

  const setCategoricalGoal = (goalId: string, value: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId && goal.type === 'categorical') {
        const valueIndex = goal.options?.indexOf(value) ?? -1;
        onGoalUpdate?.(goalId, valueIndex);
        return { ...goal, categoricalValue: value };
      }
      return goal;
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="font-bold text-gray-900 dark:text-white">
            Quick Goal Tracker
          </h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Info message when using default goals */}
          {backendGoals && backendGoals.length === 0 && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> Create personalized therapy goals in the child's profile to track real progress!
              </p>
            </div>
          )}

          <div className="space-y-3">
            {goals.map(goal => {
              return (
                <motion.div
                  key={goal.id}
                  className="p-3 rounded-lg border-2 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                        {goal.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {goal.description}
                      </p>
                    </div>
                  </div>

                  {/* Binary Toggle */}
                  {goal.type === 'binary' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleBinaryGoal(goal.id, true)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                          goal.binaryValue === true
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {goal.binaryValue === true && <Check className="inline h-4 w-4 mr-1" />}
                        Yes
                      </button>
                      <button
                        onClick={() => toggleBinaryGoal(goal.id, false)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                          goal.binaryValue === false
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {goal.binaryValue === false && <Check className="inline h-4 w-4 mr-1" />}
                        No
                      </button>
                    </div>
                  )}

                  {/* Categorical Dropdown */}
                  {goal.type === 'categorical' && (
                    <div className="mt-3">
                      <select
                        value={goal.categoricalValue || ''}
                        onChange={(e) => setCategoricalGoal(goal.id, e.target.value)}
                        className="w-full p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select option...</option>
                        {goal.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Summary */}
      {!isCollapsed && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Metrics Tracked:{' '}
              <span className="font-bold text-purple-600">
                {goals.filter(g =>
                  (g.type === 'binary' && g.binaryValue !== undefined) ||
                  (g.type === 'categorical' && g.categoricalValue !== undefined && g.categoricalValue !== '')
                ).length}
              </span>{' '}
              / {goals.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

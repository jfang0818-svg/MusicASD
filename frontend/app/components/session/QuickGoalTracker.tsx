'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Minus, Check } from 'lucide-react';

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
  targetValue: number;
  currentValue: number;
  unit: string;
  type: 'count' | 'quality';
}

interface QuickGoalTrackerProps {
  sessionId: string;
  goals: TherapyGoal[];
  onGoalUpdate?: (goalId: string, value: number) => void;
}

// Fallback goals if no backend goals exist
const DEFAULT_GOALS: QuickGoal[] = [
  {
    id: 'vocalizations_default',
    title: 'Vocalizations',
    targetValue: 5,
    currentValue: 0,
    unit: 'times',
    type: 'count'
  },
  {
    id: 'eye_contact_default',
    title: 'Eye Contact',
    targetValue: 5,
    currentValue: 0,
    unit: 'times',
    type: 'count'
  },
  {
    id: 'turn_taking_default',
    title: 'Turn Taking',
    targetValue: 4,
    currentValue: 0,
    unit: 'successful',
    type: 'count'
  }
];

// Convert backend TherapyGoal to QuickGoal format
function convertToQuickGoal(therapyGoal: TherapyGoal): QuickGoal {
  return {
    id: therapyGoal.goal_id,
    title: therapyGoal.title,
    targetValue: therapyGoal.target,
    currentValue: therapyGoal.current_value,
    unit: therapyGoal.unit,
    type: therapyGoal.measurement_type === 'quality_1_5' ? 'quality' : 'count'
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
      const quickGoals = backendGoals.slice(0, 5).map(convertToQuickGoal); // Limit to 5 for UI space
      setGoals(quickGoals);
    } else {
      // Use default goals if none from backend
      setGoals(DEFAULT_GOALS);
    }
  }, [backendGoals]);

  const incrementGoal = (goalId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId && goal.currentValue < goal.targetValue + 10) {
        const newValue = goal.currentValue + 1;
        onGoalUpdate?.(goalId, newValue);
        return { ...goal, currentValue: newValue };
      }
      return goal;
    }));
  };

  const decrementGoal = (goalId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId && goal.currentValue > 0) {
        const newValue = goal.currentValue - 1;
        onGoalUpdate?.(goalId, newValue);
        return { ...goal, currentValue: newValue };
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
            const progress = (goal.currentValue / goal.targetValue) * 100;
            const isAchieved = goal.currentValue >= goal.targetValue;

            return (
              <motion.div
                key={goal.id}
                className={`p-3 rounded-lg border-2 ${
                  isAchieved
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {goal.title}
                      </p>
                      {isAchieved && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {goal.targetValue} {goal.unit}
                    </p>
                  </div>

                  {/* Counter */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementGoal(goal.id)}
                      disabled={goal.currentValue === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="w-12 text-center">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {goal.currentValue}
                      </span>
                    </div>

                    <button
                      onClick={() => incrementGoal(goal.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      isAchieved ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
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
              Goals Achieved:{' '}
              <span className="font-bold text-green-600">
                {goals.filter(g => g.currentValue >= g.targetValue).length}
              </span>{' '}
              / {goals.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { cn } from '@/app/lib/utils';

export type EngagementLevel = 'LOW' | 'MED' | 'HIGH';

interface EngagementControlsProps {
  engagement: EngagementLevel;
  updateEngagement: (level: EngagementLevel) => void;
  sessionActive: boolean;
  autoSuggest: boolean;
  setAutoSuggest: (value: boolean) => void;
}

export function EngagementControls({
  engagement,
  updateEngagement,
  sessionActive,
  autoSuggest,
  setAutoSuggest
}: EngagementControlsProps) {
  const levels: { value: EngagementLevel; label: string; emoji: string; color: string }[] = [
    { value: 'LOW', label: 'LOW', emoji: '😴', color: 'bg-blue-500' },
    { value: 'MED', label: 'MED', emoji: '😊', color: 'bg-orange-500' },
    { value: 'HIGH', label: 'HIGH', emoji: '🎉', color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Current Engagement Level
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => updateEngagement(level.value)}
              disabled={!sessionActive}
              className={cn(
                'relative py-3 px-4 rounded-lg border-2 transition-all duration-200',
                'flex flex-col items-center justify-center gap-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                engagement === level.value ? [
                  level.color,
                  'text-white border-transparent shadow-lg transform scale-105'
                ] : [
                  'bg-white dark:bg-gray-700',
                  'border-gray-200 dark:border-gray-600',
                  'hover:border-gray-300 dark:hover:border-gray-500',
                  'text-gray-700 dark:text-gray-300'
                ]
              )}
            >
              <span className="text-2xl">{level.emoji}</span>
              <span className="text-sm font-medium">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Auto-suggest when engagement changes
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={autoSuggest}
              onChange={(e) => setAutoSuggest(e.target.checked)}
              disabled={!sessionActive}
              className="sr-only"
            />
            <div className={cn(
              'block w-12 h-6 rounded-full transition-colors',
              autoSuggest ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            )}>
              <div className={cn(
                'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform',
                autoSuggest && 'translate-x-6'
              )} />
            </div>
          </div>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Default: Off
        </p>
      </div>
    </div>
  );
}
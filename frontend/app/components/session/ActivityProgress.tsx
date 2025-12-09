'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Play, Pause, SkipForward, Target, Lightbulb } from 'lucide-react';
import { CoreActivity } from '@/app/hooks/useSessionStructure';

interface ActivityProgressProps {
  currentActivity: CoreActivity;
  currentIndex: number;
  totalActivities: number;
  selectedActivities: CoreActivity[];
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  isPaused: boolean;
  onNextActivity: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipToActivity: (activityId: string) => void;
  musicStyle?: string;
  onPlayMusic?: (style: string) => void;
}

export default function ActivityProgress({
  currentActivity,
  currentIndex,
  totalActivities,
  selectedActivities,
  elapsedSeconds: _elapsedSeconds,
  remainingSeconds,
  progressPercent,
  isPaused,
  onNextActivity,
  onPause,
  onResume,
  onSkipToActivity,
  musicStyle,
  onPlayMusic,
}: ActivityProgressProps) {
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get color classes for activity
  const getColorClass = (color: string, type: 'bg' | 'gradient' | 'text' | 'border') => {
    const colors: Record<string, Record<string, string>> = {
      indigo: {
        bg: 'bg-indigo-500',
        gradient: 'from-indigo-500 to-purple-500',
        text: 'text-indigo-600',
        border: 'border-indigo-500',
      },
      orange: {
        bg: 'bg-orange-500',
        gradient: 'from-orange-500 to-red-500',
        text: 'text-orange-600',
        border: 'border-orange-500',
      },
      purple: {
        bg: 'bg-purple-500',
        gradient: 'from-purple-500 to-pink-500',
        text: 'text-purple-600',
        border: 'border-purple-500',
      },
      pink: {
        bg: 'bg-pink-500',
        gradient: 'from-pink-500 to-rose-500',
        text: 'text-pink-600',
        border: 'border-pink-500',
      },
      teal: {
        bg: 'bg-teal-500',
        gradient: 'from-teal-500 to-cyan-500',
        text: 'text-teal-600',
        border: 'border-teal-500',
      },
      blue: {
        bg: 'bg-blue-500',
        gradient: 'from-blue-500 to-indigo-500',
        text: 'text-blue-600',
        border: 'border-blue-500',
      },
    };
    const colorSet = colors[color] ?? colors.blue;
    return colorSet?.[type] ?? colorSet?.bg ?? 'bg-blue-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${getColorClass(currentActivity.color, 'gradient')} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentActivity.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{currentActivity.name}</h3>
              <p className="text-sm text-white/80">
                Activity {currentIndex + 1} of {totalActivities}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">
              {formatTime(remainingSeconds)}
            </div>
            <div className="text-sm text-white/80">remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {selectedActivities.map((activity, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={`${activity.id}-${index}`} className="flex items-center">
                <button
                  onClick={() => onSkipToActivity(activity.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                    isActive
                      ? `${getColorClass(activity.color, 'bg')} text-white`
                      : isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-sm">{activity.icon}</span>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {activity.name.split(' ')[0]}
                  </span>
                </button>
                {index < selectedActivities.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Caregiver Prompt */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Caregiver Tip
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {currentActivity.caregiverPrompt}
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2">Activity Ideas:</div>
          <div className="flex flex-wrap gap-2">
            {currentActivity.examples.map((example, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  getColorClass(currentActivity.color, 'text')
                } bg-gray-100 dark:bg-gray-700`}
              >
                {example}
              </span>
            ))}
          </div>
        </div>

        {/* Therapeutic Goals */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Target className="w-4 h-4" />
          <span>Goals: {currentActivity.therapeuticGoals.join(', ')}</span>
        </div>

        {/* Recommended Music */}
        {onPlayMusic && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onPlayMusic(currentActivity.musicStyle)}
              className={`w-full px-4 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                musicStyle === currentActivity.musicStyle
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                  : `${getColorClass(currentActivity.color, 'bg')} text-white hover:opacity-90`
              }`}
            >
              <Play className="w-4 h-4" />
              {musicStyle === currentActivity.musicStyle
                ? `Playing ${currentActivity.musicStyle.replace('_', ' ')} music`
                : `Play ${currentActivity.musicStyle.replace('_', ' ')} music`}
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex items-center gap-3">
        {/* Pause/Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          )}
        </button>

        {/* Next Activity */}
        <button
          onClick={onNextActivity}
          className={`flex-1 px-4 py-2 bg-gradient-to-r ${getColorClass(currentActivity.color, 'gradient')} text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90`}
        >
          <SkipForward className="w-4 h-4" />
          {currentIndex < totalActivities - 1 ? 'Next Activity' : 'Finish Activities'}
        </button>
      </div>
    </motion.div>
  );
}

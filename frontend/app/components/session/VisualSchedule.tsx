'use client';

import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Check, Music2, Upload, Sparkles, Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { PhaseDefinition, SessionPhase } from '@/app/hooks/useSessionStructure';

interface VisualScheduleProps {
  allPhases: PhaseDefinition[];
  currentPhase: PhaseDefinition | undefined;
  currentPhaseIndex: number;
  isComplete: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  isPaused: boolean;
  onNextPhase: () => void;
  onSkipToPhase: (phaseId: SessionPhase) => void;
  onPause: () => void;
  onResume: () => void;
  onPlayPhaseMusic?: (phase: 'hello' | 'goodbye') => void;
  getPhaseSongInfo?: (phase: 'hello' | 'goodbye') => string;
  onUploadSong?: (file: File, phase: 'hello' | 'goodbye') => Promise<void>;
  onAIGenerate?: (phase: 'hello' | 'goodbye') => void;
  currentlyPlayingMusic?: string | null;
  musicPlaying?: boolean;
  onSaveAsDefault?: (phase: 'hello' | 'goodbye', filename: string) => Promise<void>;
}

export default function VisualSchedule({
  allPhases,
  currentPhase,
  currentPhaseIndex,
  isComplete,
  elapsedSeconds,
  remainingSeconds,
  progressPercent,
  isPaused,
  onNextPhase,
  onSkipToPhase,
  onPause,
  onResume,
  onPlayPhaseMusic,
  getPhaseSongInfo,
  onUploadSong,
  onAIGenerate,
  currentlyPlayingMusic,
  musicPlaying,
  onSaveAsDefault,
}: VisualScheduleProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClasses = (color: string) => {
    const colors = {
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        border: 'border-green-500',
        text: 'text-green-700 dark:text-green-300',
        badge: 'bg-green-500',
      },
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        border: 'border-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-500',
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        border: 'border-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        badge: 'bg-orange-500',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Session Complete! 🎉</h3>
          <p className="text-white/80">
            Great work! Your structured session is finished.
          </p>
        </div>
      </motion.div>
    );
  }

  if (!currentPhase) {
    return null;
  }

  const colors = getColorClasses(currentPhase.color);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          📅 Session Structure
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Phase {currentPhaseIndex + 1} of {allPhases.length}
        </span>
      </div>

      {/* Current Phase Card */}
      <motion.div
        key={currentPhase.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6`}
      >
        <div className="flex items-start gap-4">
          {/* Phase Icon */}
          <div className={`w-14 h-14 ${colors.badge} rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}>
            {currentPhase.icon}
          </div>

          {/* Phase Info */}
          <div className="flex-1">
            <h4 className={`text-xl font-bold ${colors.text} mb-1`}>
              {currentPhase.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {currentPhase.description}
            </p>

            {/* Caregiver Prompt */}
            <div className="bg-white/50 dark:bg-gray-900/30 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                💡 Caregiver Tip:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentPhase.caregiverPrompt}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-semibold ${colors.text}`}>
                  {formatTime(elapsedSeconds)} / {formatTime(currentPhase.durationMinutes * 60)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatTime(remainingSeconds)} remaining
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${colors.badge}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Now Playing - Show currently playing music */}
            {currentlyPlayingMusic && musicPlaying && (currentPhase.id === 'hello' || currentPhase.id === 'goodbye') && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                      ▶️ Now Playing:
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {currentlyPlayingMusic}
                    </p>
                  </div>
                  {onSaveAsDefault && (
                    <button
                      onClick={() => {
                        onSaveAsDefault(currentPhase.id as 'hello' | 'goodbye', currentlyPlayingMusic);
                        toast.success(`Saved as default ${currentPhase.id} song`);
                      }}
                      className="ml-3 flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Save as default song for this phase"
                    >
                      <Save className="h-3 w-3" />
                      Save as Default
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Song Info - Show what will play for Hello/Goodbye */}
            {onPlayPhaseMusic && getPhaseSongInfo && (currentPhase.id === 'hello' || currentPhase.id === 'goodbye') && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-3 border border-purple-200 dark:border-purple-800">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                  🎵 Music for this phase:
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  {getPhaseSongInfo(currentPhase.id as 'hello' | 'goodbye')}
                </p>
              </div>
            )}

            {/* Upload/AI Generate Buttons - Only for Hello/Goodbye phases */}
            {(onUploadSong || onAIGenerate) && (currentPhase.id === 'hello' || currentPhase.id === 'goodbye') && (
              <div className="flex gap-2 mb-3">
                {onUploadSong && (
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadSong(file, currentPhase.id as 'hello' | 'goodbye');
                        }
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors">
                      <Upload className="h-4 w-4" />
                      Upload Song
                    </div>
                  </label>
                )}
                {onAIGenerate && (
                  <button
                    onClick={() => onAIGenerate(currentPhase.id as 'hello' | 'goodbye')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Generate
                  </button>
                )}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2 mt-4">
              {/* Play Music Button - Only show if no music is playing AND it's hello/goodbye phase */}
              {onPlayPhaseMusic && !musicPlaying && (currentPhase.id === 'hello' || currentPhase.id === 'goodbye') && (
                <button
                  onClick={() => onPlayPhaseMusic(currentPhase.id as 'hello' | 'goodbye')}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  <Music2 className="h-4 w-4" />
                  Play Music
                </button>
              )}

              {/* Session Control: Pause/Resume Timer & Music */}
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Resume{musicPlaying ? ' Session' : ''}
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  <Pause className="h-4 w-4" />
                  Pause{musicPlaying ? ' Session' : ''}
                </button>
              )}

              <button
                onClick={onNextPhase}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                <SkipForward className="h-4 w-4" />
                Next Phase
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Phase Timeline */}
      <div className="flex justify-between items-center gap-2">
        {allPhases.map((phase, index) => {
          const isActive = index === currentPhaseIndex;
          const isComplete = index < currentPhaseIndex;
          const phaseColors = getColorClasses(phase.color);

          return (
            <button
              key={phase.id}
              onClick={() => onSkipToPhase(phase.id)}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                isActive
                  ? `${phaseColors.bg} border-2 ${phaseColors.border}`
                  : isComplete
                  ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 opacity-60'
                  : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  isActive ? phaseColors.badge + ' text-white' : isComplete ? 'bg-gray-400 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {isComplete ? <Check className="h-5 w-5" /> : phase.icon}
              </div>
              <span className={`text-xs font-semibold ${isActive ? phaseColors.text : 'text-gray-600 dark:text-gray-400'}`}>
                {phase.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {phase.durationMinutes}min
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

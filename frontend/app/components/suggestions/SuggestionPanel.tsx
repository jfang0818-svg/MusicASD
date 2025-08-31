'use client';

import { Check, X, RefreshCw, ThumbsUp, Meh, ThumbsDown } from 'lucide-react';
import type { Suggestion } from '@/app/types';

interface SuggestionPanelProps {
  sessionActive: boolean;
  currentSuggestion: Suggestion | null;
  generateSuggestion: () => void;
  acceptSuggestion: () => void;
  skipSuggestion: () => void;
  logResponse: (response: 'worked' | 'neutral' | 'didnt_work') => void;
}

export function SuggestionPanel({
  sessionActive,
  currentSuggestion,
  generateSuggestion,
  acceptSuggestion,
  skipSuggestion,
  logResponse
}: SuggestionPanelProps) {
  if (!sessionActive) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Start a session to get AI suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Suggestion Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Current Suggestion
        </h3>

        {currentSuggestion ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <blockquote className="text-lg italic text-gray-700 dark:text-gray-300 mb-3">
                "{currentSuggestion.phrase}"
              </blockquote>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  Style: {currentSuggestion.style}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">
                  Activity: {currentSuggestion.activity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={acceptSuggestion}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Accept</span>
              </button>
              <button
                onClick={skipSuggestion}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Skip</span>
              </button>
              <button
                onClick={generateSuggestion}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generateSuggestion}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200"
          >
            Generate First Suggestion
          </button>
        )}
      </div>

      {/* Response Section */}
      {currentSuggestion && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Log Child Response
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => logResponse('worked')}
              className="flex flex-col items-center gap-1 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors"
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="text-xs font-medium">Worked</span>
            </button>
            <button
              onClick={() => logResponse('neutral')}
              className="flex flex-col items-center gap-1 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
            >
              <Meh className="h-5 w-5" />
              <span className="text-xs font-medium">Neutral</span>
            </button>
            <button
              onClick={() => logResponse('didnt_work')}
              className="flex flex-col items-center gap-1 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
            >
              <ThumbsDown className="h-5 w-5" />
              <span className="text-xs font-medium">Didn't Work</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
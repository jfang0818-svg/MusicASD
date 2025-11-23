'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Target, Play, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getMusicRecommendations,
  getMusicInsights,
  recordRecommendationFeedback,
  logMusicPlay
} from '@/app/lib/api';
import type { MusicRecommendation, MusicInsights as InsightsType } from '@/app/types';

interface MusicRecommendationsProps {
  childId: string;
  sessionId?: string;
  context?: {
    goal?: string;
    time_of_day?: string;
    mood?: string;
    activity_type?: string;
  };
  onPlaySong?: (song: MusicRecommendation) => void;
}

export default function MusicRecommendations({ childId, sessionId, context, onPlaySong }: MusicRecommendationsProps) {
  const [selectedContext, setSelectedContext] = useState({
    goal: context?.goal || 'calming',
    time_of_day: context?.time_of_day || 'any',
    mood: context?.mood || '',
    activity_type: context?.activity_type || 'free_play'
  });

  const { data: recommendationsData, isLoading: loadingRecs, refetch } = useQuery({
    queryKey: ['recommendations', childId, selectedContext],
    queryFn: () => getMusicRecommendations({
      child_id: childId,
      context: selectedContext,
      limit: 5
    })
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights', childId],
    queryFn: () => getMusicInsights(childId)
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ songName, wasPlayed, wasSuccessful }: any) =>
      recordRecommendationFeedback(childId, {
        song_name: songName,
        was_played: wasPlayed,
        was_successful: wasSuccessful
      }),
    onSuccess: () => {
      toast.success('Feedback recorded', { icon: '✅' });
      refetch();
    }
  });

  const recommendations = recommendationsData?.recommendations || [];
  const insights: InsightsType | undefined = insightsData;

  const handlePlaySong = async (song: MusicRecommendation) => {
    if (onPlaySong) {
      onPlaySong(song);
    }
    toast.success(`Playing ${song.name}`, { icon: '🎵' });

    // Track music play from recommendations
    try {
      await logMusicPlay({
        child_id: childId,
        session_id: sessionId,
        music_file: song.name,
        music_title: song.name,
        music_style: song.style as 'calm' | 'happy' | 'energetic',
        duration_played: 0,
        completed: false,
        skipped: false,
        replay: false,
        context: 'ai_recommendation',
        goal: selectedContext.goal
      });
    } catch (error) {
      console.error('Failed to log recommendation play:', error);
    }
  };

  const handleFeedback = (songName: string, wasSuccessful: boolean) => {
    feedbackMutation.mutate({
      songName,
      wasPlayed: true,
      wasSuccessful
    });
  };

  const confidenceColors = {
    high: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  return (
    <div className="space-y-6">
      {/* Context Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Music Recommendations
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Goal Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Session Goal
            </label>
            <select
              value={selectedContext.goal}
              onChange={(e) => setSelectedContext({ ...selectedContext, goal: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="calming">Calming</option>
              <option value="energizing">Energizing</option>
              <option value="focus">Focus</option>
              <option value="regulation">Regulation</option>
              <option value="exploration">Exploration</option>
            </select>
          </div>

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Time of Day
            </label>
            <select
              value={selectedContext.time_of_day}
              onChange={(e) => setSelectedContext({ ...selectedContext, time_of_day: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="any">Any Time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Recommended Songs</h4>

        {loadingRecs ? (
          <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recommendations yet. Play some songs to build preferences!
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((song: MusicRecommendation, index: number) => (
              <motion.div
                key={song.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-gray-800">{song.name}</h5>
                      <span className={`text-xs px-2 py-1 rounded-full border ${confidenceColors[song.confidence]}`}>
                        {song.confidence} confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {song.style}
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {song.energy}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="text-sm text-gray-600 mb-1">
                        Score: <span className="font-semibold text-purple-600">{song.recommendation_score}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${song.recommendation_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Why recommended:</span>
                      <ul className="ml-4 mt-1 space-y-1">
                        {song.recommendation_reasons.map((reason, i) => (
                          <li key={i} className="list-disc">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handlePlaySong(song)}
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      title="Play song"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(song.name, true)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Good recommendation"
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(song.name, false)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Not good"
                    >
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      {insights && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Music Preferences Insights
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {insights.analysis_period.total_sessions}
              </div>
              <div className="text-xs text-gray-600">Total Sessions</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">
                {insights.analysis_period.total_favorites}
              </div>
              <div className="text-xs text-gray-600">Favorites</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {insights.analysis_period.avg_quality_score.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600">Avg Quality</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600">
                {insights.style_performance.length}
              </div>
              <div className="text-xs text-gray-600">Styles Tried</div>
            </div>
          </div>

          {/* Top Styles */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Top Music Styles</h5>
            <div className="space-y-2">
              {insights.favorite_styles.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{item.style}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(item.count / insights.favorite_styles[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-blue-800 mb-2">💡 AI Insights</h5>
            <ul className="space-y-2">
              {insights.recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

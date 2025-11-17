'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChildProfile, getMusicElements, analyzeChildProfile, getMusicEffectiveness } from '../../../lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Music, Clock, Key, Volume2, TrendingDown, AlertCircle, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfileAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const childId = params.id as string;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch child profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['child-profile', childId],
    queryFn: () => getChildProfile(childId),
  });

  // Fetch music elements (if they exist)
  const { data: musicElements, isLoading: elementsLoading, error: elementsError } = useQuery({
    queryKey: ['music-elements', childId],
    queryFn: () => getMusicElements(childId),
    retry: false,
  });

  // Fetch music effectiveness data
  const { data: musicEffectiveness, isLoading: effectivenessLoading } = useQuery({
    queryKey: ['music-effectiveness', childId],
    queryFn: () => getMusicEffectiveness(childId),
    retry: false,
  });

  // Mutation for analyzing profile
  const analyzeMutation = useMutation({
    mutationFn: () => analyzeChildProfile(childId),
    onSuccess: (data) => {
      queryClient.setQueryData(['music-elements', childId], data);
      toast.success('Profile analyzed successfully! 🎉');
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to analyze profile');
      setIsAnalyzing(false);
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    analyzeMutation.mutate();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const hasAnalysis = musicElements && !elementsError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-purple-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {profile?.demographics.name}
                </h1>
                <p className="text-gray-600">
                  {profile?.demographics.age} years old • ASD Level {profile?.demographics.asd_level || 'N/A'}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing with GPT-5.1...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {hasAnalysis ? 'Re-analyze Profile' : 'Analyze Profile'}
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Music Element Recommendations */}
        {hasAnalysis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-800">
                  GPT-5.1 Music Recommendations
                </h2>
              </div>
              <p className="text-gray-600">
                Analyzed on {new Date(musicElements.analyzed_at).toLocaleDateString()} at{' '}
                {new Date(musicElements.analyzed_at).toLocaleTimeString()}
              </p>
            </div>

            {/* Music Elements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tempo */}
              <ElementCard
                icon={<Clock className="w-6 h-6" />}
                title="Tempo Range"
                value={musicElements.elements.tempo_range}
                color="from-blue-500 to-cyan-500"
              />

              {/* Key */}
              <ElementCard
                icon={<Key className="w-6 h-6" />}
                title="Musical Key"
                value={musicElements.elements.key}
                color="from-purple-500 to-pink-500"
              />

              {/* Dynamics */}
              <ElementCard
                icon={<Volume2 className="w-6 h-6" />}
                title="Dynamics"
                value={musicElements.elements.dynamics}
                color="from-green-500 to-emerald-500"
              />

              {/* Duration */}
              <ElementCard
                icon={<TrendingDown className="w-6 h-6" />}
                title="Recommended Duration"
                value={musicElements.elements.recommended_duration}
                color="from-orange-500 to-red-500"
              />
            </div>

            {/* Instruments */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-800">Recommended Instruments</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {musicElements.elements.instruments.map((instrument: string, index: number) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full font-semibold text-sm"
                  >
                    {instrument}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎭</span>
                <h3 className="text-xl font-bold text-gray-800">Mood & Atmosphere</h3>
              </div>
              <p className="text-lg text-gray-700">{musicElements.elements.mood}</p>
            </div>

            {/* Style Tags */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏷️</span>
                <h3 className="text-xl font-bold text-gray-800">Style Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {musicElements.elements.style_tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Elements to Avoid */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-xl font-bold text-gray-800">Elements to Avoid</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {musicElements.elements.avoid_elements.map((element: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-semibold text-sm"
                  >
                    ❌ {element}
                  </span>
                ))}
              </div>
            </div>

            {/* Reasoning */}
            {musicElements.elements.reasoning && (
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-6 shadow-lg border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-xl font-bold text-purple-800">Therapeutic Reasoning</h3>
                </div>
                <p className="text-purple-900 leading-relaxed">
                  {musicElements.elements.reasoning}
                </p>
              </div>
            )}
          </motion.div>
        ) : null}

        {/* Music Effectiveness Insights (from real session data) */}
        {musicEffectiveness && musicEffectiveness.total_sessions_analyzed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-6"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6" />
                <h2 className="text-2xl font-bold">
                  Music Effectiveness Insights
                </h2>
              </div>
              <p className="text-green-100">
                Based on {musicEffectiveness.total_sessions_analyzed} session(s) of real therapy data
              </p>
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-bold text-gray-800">AI Analysis</h3>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {musicEffectiveness.ai_insights}
              </p>
            </div>

            {/* Music Style Rankings */}
            {musicEffectiveness.music_effectiveness.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Music className="w-5 h-5 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-800">Music Style Performance</h3>
                </div>

                <div className="space-y-4">
                  {musicEffectiveness.music_effectiveness.map((style: any, index: number) => {
                    const isTopChoice = index === 0;
                    const emoji = style.style === 'calm' ? '😌' : style.style === 'happy' ? '😊' : '🎉';

                    return (
                      <motion.div
                        key={style.style}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-2xl ${
                          isTopChoice
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300'
                            : 'bg-gray-50 border-2 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{emoji}</span>
                            <div>
                              <h4 className="font-bold text-gray-800 capitalize flex items-center gap-2">
                                {style.style}
                                {isTopChoice && (
                                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                                    Top Choice
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Used {style.total_plays} time(s) across {style.total_sessions} session(s)
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-gray-800">
                              {style.avg_engagement.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">Avg Engagement</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${style.avg_engagement}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                            className={`h-full ${
                              style.avg_engagement >= 75
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : style.avg_engagement >= 60
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                : 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            }`}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Recommendation */}
                <div className="mt-6 p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-purple-800 mb-1">Recommendation</h4>
                      <p className="text-purple-700 text-sm">
                        Based on the data, <strong className="capitalize">{musicEffectiveness.top_recommendation}</strong> music is most effective for {musicEffectiveness.child_name}.
                        Focus on this style for optimal engagement in future sessions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* No Analysis Section */}
        {!hasAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              No Analysis Yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Click the "Analyze Profile" button to get GPT-5.1 powered music element recommendations tailored to {profile?.demographics.name}'s needs
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Element Card Component
function ElementCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4 text-white`}>
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-gray-500 mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </motion.div>
  );
}

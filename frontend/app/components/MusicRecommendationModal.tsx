'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Brain, Target, Volume2, Clock, Lightbulb, TrendingUp } from 'lucide-react';
import { MusicRecommendation } from '@/app/lib/api';

interface MusicRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: MusicRecommendation | null;
  onApplyRecommendation: (recommendation: MusicRecommendation) => void;
  onRequestAlternative: () => void;
  loading?: boolean;
}

export default function MusicRecommendationModal({
  isOpen,
  onClose,
  recommendation,
  onApplyRecommendation,
  onRequestAlternative,
  loading = false
}: MusicRecommendationModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'calm': return 'blue';
      case 'happy': return 'yellow';
      case 'energetic': return 'red';
      default: return 'gray';
    }
  };

  const getConfidenceColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return 'text-green-600';
    if (numScore >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const styleColor = recommendation ? getStyleColor(recommendation.recommended_style) : 'gray';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r from-${styleColor}-500 to-${styleColor}-600 p-6 rounded-t-2xl text-white relative`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-8 w-8" />
                <h2 className="text-2xl font-bold">AI Music Recommendation</h2>
              </div>
              <p className="text-white/90 text-sm">Personalized therapeutic music suggestion</p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Analyzing context and generating recommendation...</p>
              </div>
            ) : recommendation ? (
              <div className="p-6 space-y-6">
                {/* Caregiver Phrase - Prominent */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-500 text-white p-2 rounded-lg">
                      <Lightbulb className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Say to the child:
                      </h3>
                      <p className="text-xl font-medium text-purple-900 dark:text-purple-200 italic">
                        "{recommendation.caregiver_phrase}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Music Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                    <Music className="h-5 w-5 text-gray-500 mb-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Style</p>
                    <p className="font-semibold text-lg capitalize">{recommendation.recommended_style}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-gray-500 mb-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tempo</p>
                    <p className="font-semibold text-lg">{recommendation.tempo_bpm} BPM</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                    <Clock className="h-5 w-5 text-gray-500 mb-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-semibold text-lg">{recommendation.duration_minutes} min</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                    <Volume2 className="h-5 w-5 text-gray-500 mb-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Volume</p>
                    <p className="font-semibold text-lg capitalize">{recommendation.volume_level}</p>
                  </div>
                </div>

                {/* Therapeutic Rationale */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Therapeutic Rationale
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {recommendation.therapeutic_rationale}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expected Outcome */}
                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Expected Outcome
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {recommendation.expected_outcome}
                  </p>
                </div>

                {/* Confidence Score */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI Confidence Score:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${parseFloat(recommendation.confidence_score) * 100}%` }}
                      />
                    </div>
                    <span className={`font-semibold ${getConfidenceColor(recommendation.confidence_score)}`}>
                      {(parseFloat(recommendation.confidence_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Show More Details Toggle */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline w-full text-center py-2"
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </button>

                {/* Technical Details (Collapsible) */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Musical Key</p>
                          <p className="font-medium">{recommendation.musical_key}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mood</p>
                          <p className="font-medium">{recommendation.mood}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recommended Instruments</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {recommendation.instruments.map((instrument, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                              >
                                {instrument}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transition Type</p>
                          <p className="font-medium capitalize">{recommendation.transition_type}</p>
                        </div>

                        {recommendation.specific_parameters && (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Complexity</p>
                              <p className="font-medium text-sm capitalize">{recommendation.specific_parameters.complexity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Rhythm Pattern</p>
                              <p className="font-medium text-sm capitalize">{recommendation.specific_parameters.rhythm_pattern}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Melodic Contour</p>
                              <p className="font-medium text-sm capitalize">{recommendation.specific_parameters.melodic_contour}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Harmonic Structure</p>
                              <p className="font-medium text-sm capitalize">{recommendation.specific_parameters.harmonic_structure}</p>
                            </div>
                          </div>
                        )}

                        {recommendation.alternative_if_ineffective && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              If This Doesn't Work:
                            </p>
                            <p className="font-medium text-sm">{recommendation.alternative_if_ineffective}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => onApplyRecommendation(recommendation)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Music className="h-5 w-5" />
                    Apply Recommendation
                  </button>

                  <button
                    onClick={onRequestAlternative}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl font-semibold transition-colors"
                  >
                    Try Alternative
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">No recommendation available</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

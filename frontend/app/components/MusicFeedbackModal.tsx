'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, Meh, Star, MessageSquare, FileText } from 'lucide-react';

interface MusicFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  childId: string;
  musicStyle: string;
  tempo?: number;
  onSubmit: (feedback: {
    effectiveness: 'very_effective' | 'effective' | 'neutral' | 'not_effective';
    notes: string;
    outcome_notes: string;
  }) => void;
  loading?: boolean;
}

export default function MusicFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  childId,
  musicStyle,
  tempo,
  onSubmit,
  loading = false
}: MusicFeedbackModalProps) {
  // Mark unused params to avoid TS errors
  void sessionId; void childId;

  const [effectiveness, setEffectiveness] = useState<'very_effective' | 'effective' | 'neutral' | 'not_effective' | null>(null);
  const [notes, setNotes] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const handleSubmit = () => {
    if (!effectiveness) {
      alert('Please rate the music effectiveness');
      return;
    }

    onSubmit({
      effectiveness,
      notes,
      outcome_notes: outcomeNotes
    });

    // Reset form
    setEffectiveness(null);
    setNotes('');
    setOutcomeNotes('');
  };

  if (!isOpen) return null;

  const effectivenessOptions = [
    {
      value: 'very_effective' as const,
      label: 'Very Effective',
      icon: Star,
      color: 'green',
      description: 'Music worked excellently - clear positive response'
    },
    {
      value: 'effective' as const,
      label: 'Effective',
      icon: ThumbsUp,
      color: 'blue',
      description: 'Music worked well - noticeable improvement'
    },
    {
      value: 'neutral' as const,
      label: 'Neutral',
      icon: Meh,
      color: 'yellow',
      description: 'Music had little to no effect'
    },
    {
      value: 'not_effective' as const,
      label: 'Not Effective',
      icon: ThumbsDown,
      color: 'red',
      description: 'Music did not help or made things worse'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-t-2xl text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Music Feedback</h2>
              </div>
              <p className="text-white/90 text-sm">
                Help us learn what works best for your child
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Session Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Music Style:</span>
                    <span className="ml-2 font-semibold capitalize">{musicStyle}</span>
                  </div>
                  {tempo && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tempo:</span>
                      <span className="ml-2 font-semibold">{tempo} BPM</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Effectiveness Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  How effective was this music? *
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {effectivenessOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = effectiveness === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => setEffectiveness(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected
                                ? `bg-${option.color}-500 text-white`
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold mb-1 ${isSelected ? `text-${option.color}-900 dark:text-${option.color}-100` : ''}`}>
                              {option.label}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Any observations, challenges, or specific reactions
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Child seemed more engaged during the chorus, or became agitated when tempo increased..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                  rows={3}
                />
              </div>

              {/* Outcome Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Therapeutic Outcomes (Optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  What therapeutic goals were achieved or improved?
                </p>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="E.g., Improved eye contact, reduced stimming behavior, better verbal responses..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                  rows={3}
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Why is this important?
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                      Your feedback helps our AI learn what music works best for your child.
                      Over time, recommendations will become more personalized and effective based on this data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={!effectiveness || loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

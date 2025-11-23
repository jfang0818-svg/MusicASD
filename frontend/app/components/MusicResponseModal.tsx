'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, AlertCircle, MessageSquare, Music, Clock,
  Activity, Smile, Meh, Frown, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import type { MusicStyle } from '@/app/types';

interface MusicResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  childId: string;
  musicFile: string;
  musicStyle: MusicStyle;
  durationPlayed: number;
  onSubmit: (metrics: MusicResponseMetrics) => void;
  loading?: boolean;
}

export interface MusicResponseMetrics {
  // Binary Metrics
  initiation: boolean | null;
  response_to_prompt: boolean | null;
  communication: boolean | null;
  motor_movement: boolean | null;
  aversion: boolean | null;

  // Categorical Metrics
  task_persistence: 'none' | 'partial' | 'majority' | 'full' | null;
  rhythmic_sync: 'none' | 'brief' | 'continuous' | null;
  emotion: 'disengaged' | 'neutral' | 'positive' | null;
  deviance_from_typical: 'significantly_less' | 'somewhat_less' | 'typical' | 'somewhat_greater' | 'significantly_greater' | null;

  // Notes
  observer_notes: string;
}

export default function MusicResponseModal({
  isOpen,
  onClose,
  sessionId,
  childId,
  musicFile,
  musicStyle,
  durationPlayed,
  onSubmit,
  loading = false
}: MusicResponseModalProps) {
  // Mark unused params
  void sessionId; void childId;

  // Binary metrics state
  const [initiation, setInitiation] = useState<boolean | null>(null);
  const [responseToPrompt, setResponseToPrompt] = useState<boolean | null>(null);
  const [communication, setCommunication] = useState<boolean | null>(null);
  const [motorMovement, setMotorMovement] = useState<boolean | null>(null);
  const [aversion, setAversion] = useState<boolean | null>(null);

  // Categorical metrics state
  const [taskPersistence, setTaskPersistence] = useState<'none' | 'partial' | 'majority' | 'full' | null>(null);
  const [rhythmicSync, setRhythmicSync] = useState<'none' | 'brief' | 'continuous' | null>(null);
  const [emotion, setEmotion] = useState<'disengaged' | 'neutral' | 'positive' | null>(null);
  const [deviance, setDeviance] = useState<'significantly_less' | 'somewhat_less' | 'typical' | 'somewhat_greater' | 'significantly_greater' | null>(null);

  // Notes
  const [observerNotes, setObserverNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      initiation,
      response_to_prompt: responseToPrompt,
      communication,
      motor_movement: motorMovement,
      aversion,
      task_persistence: taskPersistence,
      rhythmic_sync: rhythmicSync,
      emotion,
      deviance_from_typical: deviance,
      observer_notes: observerNotes
    });

    // Reset form
    setInitiation(null);
    setResponseToPrompt(null);
    setCommunication(null);
    setMotorMovement(null);
    setAversion(null);
    setTaskPersistence(null);
    setRhythmicSync(null);
    setEmotion(null);
    setDeviance(null);
    setObserverNotes('');
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const taskPersistenceOptions = [
    { value: 'full' as const, label: 'Full Duration', description: 'Continuously focused for entire song', score: 4 },
    { value: 'majority' as const, label: 'Majority', description: 'Focused most of the time with brief pauses', score: 3 },
    { value: 'partial' as const, label: 'Partial', description: 'Focused for some time, inconsistent', score: 2 },
    { value: 'none' as const, label: 'No Engagement', description: 'Did not engage with the song', score: 1 }
  ];

  const rhythmicSyncOptions = [
    { value: 'continuous' as const, label: 'Continuous Sync', description: 'Consistently moved with the beat' },
    { value: 'brief' as const, label: 'Brief Sync', description: 'Synced for 5+ seconds' },
    { value: 'none' as const, label: 'No Sync', description: 'Did not move rhythmically' }
  ];

  const emotionOptions = [
    { value: 'positive' as const, label: 'Positive', icon: Smile, description: 'Smiling, laughing, singing along', color: 'green' },
    { value: 'neutral' as const, label: 'Neutral', icon: Meh, description: 'No affect but maintained participation', color: 'blue' },
    { value: 'disengaged' as const, label: 'Disengaged', icon: Frown, description: 'No affect, no participation', color: 'gray' }
  ];

  const devianceOptions = [
    { value: 'significantly_greater' as const, label: '++', description: 'Significantly greater than usual' },
    { value: 'somewhat_greater' as const, label: '+', description: 'Somewhat greater than usual' },
    { value: 'typical' as const, label: '=', description: 'Typical engagement level' },
    { value: 'somewhat_less' as const, label: '-', description: 'Somewhat less than usual' },
    { value: 'significantly_less' as const, label: '--', description: 'Significantly less than usual' }
  ];

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
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl text-white relative sticky top-0 z-10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Music Response Assessment</h2>
              </div>
              <p className="text-white/90 text-sm">
                Rate how your child responded to this music
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Music Info */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Music className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    Track Details
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Music:</span>
                    <p className="font-semibold truncate" title={musicFile}>{musicFile}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Style:</span>
                    <p className="font-semibold capitalize">{musicStyle}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                    <p className="font-semibold">{Math.round(durationPlayed)}s</p>
                  </div>
                </div>
              </div>

              {/* Quick Binary Observations */}
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quick Observations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BinaryMetric
                    label="Self-Initiated"
                    description="Started without prompting"
                    value={initiation}
                    onChange={setInitiation}
                  />
                  <BinaryMetric
                    label="Followed Prompts"
                    description="Responded to instructions"
                    value={responseToPrompt}
                    onChange={setResponseToPrompt}
                  />
                  <BinaryMetric
                    label="Communication"
                    description="Spoke, signaled, or gestured"
                    value={communication}
                    onChange={setCommunication}
                  />
                  <BinaryMetric
                    label="Motor Movement"
                    description="Purposeful movement to music"
                    value={motorMovement}
                    onChange={setMotorMovement}
                  />
                  <BinaryMetric
                    label="Signs of Aversion"
                    description="Distress or negative reaction"
                    value={aversion}
                    onChange={setAversion}
                    isNegative
                  />
                </div>
              </div>

              {/* Task Persistence */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  How long did they stay engaged?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {taskPersistenceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTaskPersistence(option.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        taskPersistence === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${
                        taskPersistence === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`}>
                        {option.score}
                      </div>
                      <div className="font-semibold text-sm mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rhythmic Synchronization */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Did they move in sync with the music?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {rhythmicSyncOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRhythmicSync(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        rhythmicSync === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional Response */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  What emotional response did you observe?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {emotionOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = emotion === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setEmotion(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`h-6 w-6 ${isSelected ? `text-${option.color}-600` : 'text-gray-400'}`} />
                          <span className="font-semibold">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 text-left">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deviance from Typical */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Compared to their typical engagement level
                </label>
                <div className="flex gap-2 justify-center items-center">
                  {devianceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDeviance(option.value)}
                      title={option.description}
                      className={`p-4 rounded-xl border-2 transition-all min-w-[60px] ${
                        deviance === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      <div className="text-2xl font-bold">{option.label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  -- (much less) to ++ (much greater)
                </p>
              </div>

              {/* Observer Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Additional Observations (Optional)
                </label>
                <textarea
                  value={observerNotes}
                  onChange={(e) => setObserverNotes(e.target.value)}
                  placeholder="Any specific behaviors, reactions, or notes worth recording..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                  rows={3}
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                      Why track these metrics?
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                      These standardized metrics help identify which music works best for your child.
                      Your observations contribute to better music recommendations and track therapeutic progress over time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-colors"
                  disabled={loading}
                >
                  Skip
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Save Assessment
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

// Binary Metric Component
function BinaryMetric({
  label,
  description,
  value,
  onChange,
  isNegative = false
}: {
  label: string;
  description: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  isNegative?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">{label}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            value === true
              ? isNegative
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            value === false
              ? 'bg-gray-500 text-white'
              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

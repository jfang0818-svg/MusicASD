'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, TrendingUp, CheckCircle, Target } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getEmotionProfiles,
  startEmotionMusicSession,
  recordEmotionCheck,
  endEmotionMusicSession
} from '@/app/lib/api';
import type { EmotionProfile } from '@/app/types';

interface EmotionMatchingMusicProps {
  sessionId: string;
  childId: string;
  onComplete?: (summary: any) => void;
}

type SessionState = 'selection' | 'running' | 'summary';

export default function EmotionMatchingMusic({ sessionId, childId, onComplete }: EmotionMatchingMusicProps) {
  const [sessionState, setSessionState] = useState<SessionState>('selection');
  const [emotionSessionId, setEmotionSessionId] = useState<string>('');
  const [initialEmotion, setInitialEmotion] = useState<string>('anxious');
  const [targetEmotion, setTargetEmotion] = useState<string>('content');
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [transitionPlan, setTransitionPlan] = useState<any[]>([]);
  const [emotionChecks, setEmotionChecks] = useState<any[]>([]);

  const { data: emotionsData } = useQuery({
    queryKey: ['emotionProfiles'],
    queryFn: getEmotionProfiles
  });

  const emotions = emotionsData?.emotions || {};

  const startMutation = useMutation({
    mutationFn: startEmotionMusicSession,
    onSuccess: (data) => {
      setEmotionSessionId(data.emotion_session_id);
      setTransitionPlan(data.transition_plan);
      setCurrentPhase(0);
      setSessionState('running');
      toast.success('Emotion-matching session started', { icon: '🎵' });
    }
  });

  const checkMutation = useMutation({
    mutationFn: recordEmotionCheck,
    onSuccess: (data) => {
      setCurrentPhase(data.current_phase);
      setEmotionChecks([...emotionChecks, data]);
      toast.success(data.message, { icon: '✅' });
    }
  });

  const endMutation = useMutation({
    mutationFn: endEmotionMusicSession,
    onSuccess: (data) => {
      setSessionState('summary');
      if (onComplete) {
        onComplete(data.summary);
      }
      toast.success('Session complete!', { icon: '🏆' });
    }
  });

  const handleStartSession = () => {
    startMutation.mutate({
      session_id: sessionId,
      child_id: childId,
      initial_emotion: initialEmotion,
      target_emotion: targetEmotion,
      session_goal: 'regulation'
    });
  };

  const handleEmotionCheck = (currentEmotion: string, intensity: number) => {
    checkMutation.mutate({
      emotion_session_id: emotionSessionId,
      session_id: sessionId,
      child_id: childId,
      current_emotion: currentEmotion,
      intensity
    });
  };

  const handleEndSession = (finalEmotion: string, goalAchieved: boolean) => {
    endMutation.mutate({
      emotion_session_id: emotionSessionId,
      session_id: sessionId,
      child_id: childId,
      final_emotion: finalEmotion,
      goal_achieved: goalAchieved,
      effectiveness: goalAchieved ? 5 : 3
    });
  };

  const emotionEmojis: { [key: string]: string } = {
    very_anxious: '😰',
    anxious: '😟',
    upset: '😠',
    sad: '😢',
    neutral: '😐',
    calm: '😌',
    content: '😊',
    very_happy: '😄',
    overstimulated: '🤯'
  };

  const emotionColors: { [key: string]: string } = {
    very_anxious: 'from-red-100 to-orange-100',
    anxious: 'from-orange-100 to-yellow-100',
    upset: 'from-red-100 to-pink-100',
    sad: 'from-blue-100 to-purple-100',
    neutral: 'from-gray-100 to-blue-100',
    calm: 'from-blue-100 to-green-100',
    content: 'from-green-100 to-emerald-100',
    very_happy: 'from-yellow-100 to-green-100',
    overstimulated: 'from-purple-100 to-pink-100'
  };

  if (sessionState === 'selection') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Emotion-Matching Music</h2>
          <p className="text-gray-600">Using the iso-principle to support emotional regulation</p>
        </div>

        <div className="space-y-6">
          {/* Initial Emotion Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What emotion is the child experiencing now?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(emotions).slice(0, 9).map(([key, emotion]: [string, any]) => (
                <button
                  key={key}
                  onClick={() => setInitialEmotion(key)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    initialEmotion === key
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{emotionEmojis[key] || '😐'}</div>
                  <div className="font-medium text-gray-800 text-sm">{emotion.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Emotion Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What is your goal emotion?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['neutral', 'calm', 'content'].map((key) => {
                const emotion = emotions[key];
                return (
                  <button
                    key={key}
                    onClick={() => setTargetEmotion(key)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      targetEmotion === key
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">{emotionEmojis[key] || '😐'}</div>
                    <div className="font-medium text-gray-800 text-sm">{emotion?.label || key}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 About the Iso-Principle</h4>
            <p className="text-sm text-blue-800">
              This technique matches the child's current emotional state with music, then gradually
              transitions to music that represents the target emotional state. It's a proven method
              for emotional regulation in music therapy.
            </p>
          </div>

          <button
            onClick={handleStartSession}
            disabled={startMutation.isPending}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {startMutation.isPending ? 'Starting...' : 'Start Regulation Session'}
          </button>
        </div>
      </div>
    );
  }

  if (sessionState === 'summary') {
    const goalAchieved = emotionChecks.length > 0 && emotionChecks[emotionChecks.length - 1].goal_achieved;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-8xl mb-4"
          >
            {goalAchieved ? '🎉' : '💪'}
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {goalAchieved ? 'Great Progress!' : 'Good Session!'}
          </h2>
          <p className="text-gray-600 mb-8">Emotion regulation session complete</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{transitionPlan.length}</div>
              <div className="text-sm text-gray-600">Total Phases</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{currentPhase + 1}</div>
              <div className="text-sm text-gray-600">Phases Completed</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{emotionChecks.length}</div>
              <div className="text-sm text-gray-600">Emotion Checks</div>
            </div>
          </div>

          {/* Emotion Journey */}
          <div className="bg-gradient-to-r from-purple-50 to-green-50 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-gray-800 mb-4">Emotion Journey</h4>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-5xl mb-2">{emotionEmojis[initialEmotion]}</div>
                <div className="text-sm text-gray-600">Started</div>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="text-center">
                <div className="text-5xl mb-2">{emotionEmojis[targetEmotion]}</div>
                <div className="text-sm text-gray-600">Goal</div>
              </div>
            </div>
          </div>

          <p className="text-lg text-gray-700">
            {goalAchieved
              ? 'Successfully reached the target emotional state! 🌟'
              : 'Made good progress toward emotional regulation. Keep practicing! 💪'}
          </p>
        </div>
      </motion.div>
    );
  }

  if (transitionPlan.length === 0) return null;

  const currentPhaseData = transitionPlan[currentPhase];
  const progress = ((currentPhase + 1) / transitionPlan.length) * 100;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Phase {currentPhase + 1} of {transitionPlan.length}</span>
          <span className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            Goal: {emotions[targetEmotion]?.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-gradient-to-r from-purple-600 to-green-600 h-2 rounded-full"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="space-y-6"
        >
          {/* Current Phase Info */}
          <div className={`bg-gradient-to-br ${emotionColors[currentPhaseData.emotion]} rounded-lg p-8 text-center`}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl mb-4"
            >
              {emotionEmojis[currentPhaseData.emotion] || '😐'}
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Phase {currentPhase + 1}: {emotions[currentPhaseData.emotion]?.label}
            </h3>
            <p className="text-gray-600">
              Duration: {currentPhaseData.duration_minutes} minutes
            </p>
          </div>

          {/* Musical Characteristics */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-600" />
              Current Music Characteristics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Tempo:</span>
                <span className="ml-2 font-semibold">{currentPhaseData.characteristics.tempo} BPM</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Key:</span>
                <span className="ml-2 font-semibold capitalize">{currentPhaseData.characteristics.key}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Dynamics:</span>
                <span className="ml-2 font-semibold capitalize">{currentPhaseData.characteristics.dynamics}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Texture:</span>
                <span className="ml-2 font-semibold capitalize">{currentPhaseData.characteristics.texture}</span>
              </div>
            </div>
          </div>

          {/* Music Visualizer */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-8">
            <div className="flex items-center justify-center gap-2 h-32">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scaleY: [1, Math.random() * 1.5 + 0.5, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: Math.random() * 1.5 + 0.5,
                    ease: 'easeInOut'
                  }}
                  className="w-3 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full"
                  style={{ height: '100%' }}
                />
              ))}
            </div>
          </div>

          {/* Emotion Check */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">
              Check the child's current emotional state:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(emotions).slice(0, 9).map(([key, emotion]: [string, any]) => (
                <button
                  key={key}
                  onClick={() => handleEmotionCheck(key, 3)}
                  disabled={checkMutation.isPending}
                  className="p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  <div className="text-3xl mb-1">{emotionEmojis[key] || '😐'}</div>
                  <div className="text-xs font-medium text-gray-700">{emotion.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleEndSession(currentPhaseData.emotion, false)}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              End Session
            </button>
            {currentPhase === transitionPlan.length - 1 && (
              <button
                onClick={() => handleEndSession(targetEmotion, true)}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Goal Achieved!
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

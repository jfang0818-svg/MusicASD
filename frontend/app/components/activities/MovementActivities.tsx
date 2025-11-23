'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronRight, CheckCircle, Star } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getMovementActivities,
  startMovementActivity,
  completeMovement,
  endMovementActivity
} from '@/app/lib/api';
import type { MovementActivity, Movement } from '@/app/types';

interface MovementActivitiesProps {
  sessionId: string;
  childId: string;
  onComplete?: (summary: any) => void;
}

type ActivityState = 'selection' | 'playing' | 'summary';

export default function MovementActivities({ sessionId, childId, onComplete }: MovementActivitiesProps) {
  const [activityState, setActivityState] = useState<ActivityState>('selection');
  const [movementId, setMovementId] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<MovementActivity | null>(null);
  const [currentMovementIndex, setCurrentMovementIndex] = useState<number>(0);
  const [completedMovements, setCompletedMovements] = useState<any[]>([]);

  const { data: activitiesData } = useQuery({
    queryKey: ['movementActivities'],
    queryFn: getMovementActivities
  });

  const activities = activitiesData?.activities || {};

  const startMutation = useMutation({
    mutationFn: startMovementActivity,
    onSuccess: (data) => {
      setMovementId(data.movement_id);
      setSelectedActivity(data.activity);
      setActivityState('playing');
      toast.success('Activity started!', { icon: '🏃' });
    }
  });

  const completeMutation = useMutation({
    mutationFn: completeMovement,
    onSuccess: (data) => {
      if (data.is_complete) {
        handleEndActivity();
      } else {
        setCurrentMovementIndex(data.current_movement);
        toast.success('Movement complete!', { icon: '✅' });
      }
    }
  });

  const endMutation = useMutation({
    mutationFn: endMovementActivity,
    onSuccess: (data) => {
      setActivityState('summary');
      if (onComplete) {
        onComplete(data.summary);
      }
      toast.success('Activity complete!', { icon: '🏆' });
    }
  });

  const handleStartActivity = (activityId: string) => {
    startMutation.mutate({
      session_id: sessionId,
      child_id: childId,
      activity_id: activityId
    });
  };

  const handleMovementComplete = (
    participation: 'full' | 'partial' | 'minimal' | 'refused',
    quality: 'excellent' | 'good' | 'fair' | 'needs_support'
  ) => {
    if (!selectedActivity) return;

    const completedData = { participation, quality, movement_index: currentMovementIndex };
    setCompletedMovements([...completedMovements, completedData]);

    completeMutation.mutate({
      movement_id: movementId,
      session_id: sessionId,
      child_id: childId,
      movement_index: currentMovementIndex,
      participation,
      quality
    });
  };

  const handleEndActivity = () => {
    endMutation.mutate({
      movement_id: movementId,
      session_id: sessionId,
      child_id: childId,
      overall_engagement: 'high',
      overall_quality: 'good',
      therapeutic_notes: 'Movement activity completed'
    });
  };

  const activityIcons: { [key: string]: string } = {
    animal_walks: '🐾',
    dance_prompts: '💃',
    yoga_kids: '🧘',
    sensory_regulation: '🌈',
    rhythm_games: '🥁'
  };

  const energyColors: { [key: string]: string } = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-green-100 text-green-700',
    medium_high: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    variable: 'bg-purple-100 text-purple-700'
  };

  if (activityState === 'selection') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏃</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Movement Activities</h2>
          <p className="text-gray-600">Get moving with fun, therapeutic exercises</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(activities).map(([key, activity]: [string, any]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartActivity(key)}
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 text-left border-2 border-transparent hover:border-purple-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{activityIcons[key] || '🏃'}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{activity.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{activity.description}</p>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${energyColors[activity.energy_level] || 'bg-gray-100 text-gray-700'}`}>
                      {activity.energy_level.replace('_', ' ')} energy
                    </span>
                    <span className="text-xs text-gray-500">
                      {activity.movements?.length || 0} movements
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {activity.therapeutic_goals?.slice(0, 3).map((goal: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"
                      >
                        {goal.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (activityState === 'summary') {
    const fullParticipation = completedMovements.filter(m => m.participation === 'full').length;
    const excellentQuality = completedMovements.filter(m => m.quality === 'excellent').length;
    const totalMovements = completedMovements.length;

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
            🏆
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Amazing Work!</h2>
          <p className="text-gray-600 mb-8">You completed the movement activity!</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{totalMovements}</div>
              <div className="text-sm text-gray-600">Movements</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{fullParticipation}</div>
              <div className="text-sm text-gray-600">Full Participation</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-600">{excellentQuality}</div>
              <div className="text-sm text-gray-600">Excellent</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-yellow-500 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-8 h-8 ${i < 4 ? 'fill-current' : ''}`} />
            ))}
          </div>

          <p className="text-lg text-gray-700">
            Great job moving and staying active! Keep up the awesome work! 💪
          </p>
        </div>
      </motion.div>
    );
  }

  if (!selectedActivity) return null;

  const currentMovement = selectedActivity.movements[currentMovementIndex];
  const progress = ((currentMovementIndex + 1) / selectedActivity.movements.length) * 100;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Movement {currentMovementIndex + 1} of {selectedActivity.movements.length}</span>
          <span className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            {selectedActivity.name}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-purple-600 h-2 rounded-full"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovementIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="space-y-6"
        >
          {/* Movement Title */}
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              {activityIcons[selectedActivity.id] || '🏃'}
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentMovement.name}</h3>
            <p className="text-gray-600">{currentMovement.description}</p>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">How to do it:</h4>
                <p className="text-gray-700 leading-relaxed">{currentMovement.instructions}</p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {currentMovement.duration_seconds}s
            </div>
            <div className="text-sm text-gray-600">Duration for this movement</div>
          </div>

          {/* Music Visualization */}
          <div className="bg-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 bg-purple-600 rounded-full"
              />
              <span className="text-sm text-gray-600">Music: {currentMovement.music_cue}</span>
            </div>
          </div>

          {/* Participation Rating */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Participation Level:</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(['full', 'partial', 'minimal', 'refused'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleMovementComplete(level, 'good')}
                  disabled={completeMutation.isPending}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition-all border-2 capitalize ${
                    level === 'full'
                      ? 'bg-green-50 border-green-300 hover:bg-green-100 text-green-800'
                      : level === 'partial'
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-800'
                      : level === 'minimal'
                      ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 text-yellow-800'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-800'
                  } disabled:opacity-50`}
                >
                  {level}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">Quality:</p>
            <div className="grid grid-cols-4 gap-2">
              {(['excellent', 'good', 'fair', 'needs_support'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => handleMovementComplete('full', quality)}
                  disabled={completeMutation.isPending}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition-all border-2 capitalize ${
                    quality === 'excellent'
                      ? 'bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-800'
                      : quality === 'good'
                      ? 'bg-green-50 border-green-300 hover:bg-green-100 text-green-800'
                      : quality === 'fair'
                      ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 text-yellow-800'
                      : 'bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-800'
                  } disabled:opacity-50`}
                >
                  {quality === 'needs_support' ? 'Support' : quality}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

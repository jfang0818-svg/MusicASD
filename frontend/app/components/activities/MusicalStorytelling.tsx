'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ChevronRight, Star, Heart } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getStoryLibrary,
  startStorytellingSession,
  completeStoryScene,
  endStorytellingSession
} from '@/app/lib/api';
import type { Story, StoryScene } from '@/app/types';

interface MusicalStorytellingProps {
  sessionId: string;
  childId: string;
  onComplete?: (summary: any) => void;
}

type StoryState = 'selection' | 'playing' | 'summary';

export default function MusicalStorytelling({ sessionId, childId, onComplete }: MusicalStorytellingProps) {
  const [storyState, setStoryState] = useState<StoryState>('selection');
  const [storytellingId, setStorytellingId] = useState<string>('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [participationLevels, setParticipationLevels] = useState<string[]>([]);

  const { data: storyData } = useQuery({
    queryKey: ['stories'],
    queryFn: getStoryLibrary
  });

  const stories = storyData?.stories || {};

  const startMutation = useMutation({
    mutationFn: startStorytellingSession,
    onSuccess: (data) => {
      setStorytellingId(data.storytelling_id);
      setSelectedStory(data.story);
      setStoryState('playing');
      toast.success('Story started!', { icon: '📖' });
    }
  });

  const sceneCompleteMutation = useMutation({
    mutationFn: completeStoryScene,
    onSuccess: (data) => {
      if (data.is_complete) {
        handleEndStory();
      } else {
        setCurrentSceneIndex(data.current_scene);
        toast.success('Scene complete!', { icon: '✨' });
      }
    }
  });

  const endMutation = useMutation({
    mutationFn: endStorytellingSession,
    onSuccess: (data) => {
      setStoryState('summary');
      if (onComplete) {
        onComplete(data.summary);
      }
      toast.success('Story complete!', { icon: '🎉' });
    }
  });

  const handleStartStory = (storyId: string) => {
    startMutation.mutate({
      session_id: sessionId,
      child_id: childId,
      story_id: storyId
    });
  };

  const handleSceneComplete = (participationLevel: 'high' | 'moderate' | 'low' | 'none') => {
    if (!selectedStory) return;

    const scene = selectedStory.scenes[currentSceneIndex];

    setParticipationLevels([...participationLevels, participationLevel]);

    sceneCompleteMutation.mutate({
      storytelling_id: storytellingId,
      session_id: sessionId,
      child_id: childId,
      scene_id: scene.id,
      participation_level: participationLevel
    });
  };

  const handleEndStory = () => {
    endMutation.mutate({
      storytelling_id: storytellingId,
      session_id: sessionId,
      child_id: childId,
      overall_engagement: 'high',
      therapeutic_notes: 'Musical storytelling session completed'
    });
  };

  const storyIcons: { [key: string]: string } = {
    morning_routine: '☀️',
    bedtime_journey: '🌙',
    friendship_story: '👫',
    emotions_adventure: '😊',
    sensory_exploration: '🌈'
  };

  if (storyState === 'selection') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Musical Stories</h2>
          <p className="text-gray-600">Choose a story to begin your musical adventure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(stories).map(([key, story]: [string, any]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartStory(key)}
              className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 text-left border-2 border-transparent hover:border-purple-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{storyIcons[key] || '📖'}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{story.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{story.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {story.therapeutic_goals?.slice(0, 3).map((goal: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                      >
                        {goal.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">
                    ⏱️ {story.duration_minutes} min • {story.scenes?.length || 0} scenes
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (storyState === 'summary') {
    const highParticipation = participationLevels.filter(p => p === 'high').length;
    const totalScenes = participationLevels.length;

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
            🎉
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Story Complete!</h2>
          <p className="text-gray-600 mb-8">What a wonderful adventure!</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{totalScenes}</div>
              <div className="text-sm text-gray-600">Scenes Completed</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{highParticipation}</div>
              <div className="text-sm text-gray-600">High Engagement</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-8 h-8 ${i < 4 ? 'fill-current' : ''}`}
              />
            ))}
          </div>
          <p className="text-lg text-gray-700 mt-4">
            Excellent participation! Keep up the great work! 🌟
          </p>
        </div>
      </motion.div>
    );
  }

  if (!selectedStory) return null;

  const currentScene = selectedStory.scenes[currentSceneIndex];
  const progress = ((currentSceneIndex + 1) / selectedStory.scenes.length) * 100;

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Scene {currentSceneIndex + 1} of {selectedStory.scenes.length}</span>
          <span className="flex items-center gap-1">
            <Book className="w-4 h-4" />
            {selectedStory.title}
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
          key={currentSceneIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="space-y-6"
        >
          {/* Scene Title */}
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              {storyIcons[selectedStory.id] || '📖'}
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentScene.title}</h3>
          </div>

          {/* Narrative */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <p className="text-lg text-gray-700 leading-relaxed">
              {currentScene.narrative}
            </p>
          </div>

          {/* Participation Prompt */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-gray-800">Let's Participate!</h4>
            </div>
            <p className="text-gray-700 mb-2">{currentScene.participation.prompt}</p>
            <div className="text-sm text-gray-600">
              Activity: <span className="font-medium">{currentScene.participation.action.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Music Visualization */}
          <div className="bg-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-3 h-3 bg-purple-600 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                className="w-3 h-3 bg-purple-600 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                className="w-3 h-3 bg-purple-600 rounded-full"
              />
              <span className="ml-2 text-sm text-gray-600">Playing: {currentScene.music_cue}</span>
            </div>
          </div>

          {/* Participation Level Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">
              How did the child participate?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['high', 'moderate', 'low', 'none'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleSceneComplete(level)}
                  disabled={sceneCompleteMutation.isPending}
                  className={`py-3 px-4 rounded-lg font-medium transition-all border-2 capitalize ${
                    level === 'high'
                      ? 'bg-green-50 border-green-300 hover:bg-green-100 text-green-800'
                      : level === 'moderate'
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-800'
                      : level === 'low'
                      ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 text-yellow-800'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-800'
                  } disabled:opacity-50`}
                >
                  {level} Participation
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

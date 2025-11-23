'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Brain, Book, Activity, Heart, Sparkles } from 'lucide-react';
import SoundMatchingGame from '../activities/SoundMatchingGame';
import AmbientMusicPlayer from '../activities/AmbientMusicPlayer';
import MusicalStorytelling from '../activities/MusicalStorytelling';
import MusicRecommendations from '../recommendations/MusicRecommendations';
import MovementActivities from '../activities/MovementActivities';
import EmotionMatchingMusic from '../activities/EmotionMatchingMusic';

interface ActivitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  childId: string;
}

type ActivityType = 'sound-matching' | 'ambient' | 'storytelling' | 'recommendations' | 'movement' | 'emotion' | null;

const activities = [
  {
    id: 'sound-matching' as const,
    name: 'Sound Matching Game',
    description: 'Auditory processing and matching skills',
    icon: '🎵',
    IconComponent: Music,
    color: 'from-purple-500 to-blue-500'
  },
  {
    id: 'ambient' as const,
    name: 'Ambient Soundscapes',
    description: 'Calming generative music',
    icon: '🌊',
    IconComponent: Music,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'storytelling' as const,
    name: 'Musical Stories',
    description: 'Interactive therapeutic stories',
    icon: '📚',
    IconComponent: Book,
    color: 'from-pink-500 to-purple-500'
  },
  {
    id: 'recommendations' as const,
    name: 'AI Recommendations',
    description: 'Smart song suggestions',
    icon: '✨',
    IconComponent: Sparkles,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'movement' as const,
    name: 'Movement Activities',
    description: 'Guided exercises',
    icon: '🏃',
    IconComponent: Activity,
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'emotion' as const,
    name: 'Emotion-Matching Music',
    description: 'Iso-principle regulation',
    icon: '❤️',
    IconComponent: Heart,
    color: 'from-red-500 to-pink-500'
  }
];

export default function ActivitySelectorModal({ isOpen, onClose, sessionId, childId }: ActivitySelectorModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(null);

  const handleBack = () => {
    setSelectedActivity(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              {selectedActivity && (
                <button
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back
                </button>
              )}
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedActivity ? activities.find(a => a.id === selectedActivity)?.name : 'Select Activity'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedActivity ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((activity) => (
                  <motion.button
                    key={activity.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedActivity(activity.id)}
                    className="relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 transition-all text-left group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${activity.color} opacity-5 group-hover:opacity-10 transition-opacity rounded-xl`} />
                    <div className="relative">
                      <div className="text-5xl mb-3">{activity.icon}</div>
                      <h3 className="font-bold text-lg text-gray-800 mb-2">{activity.name}</h3>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div>
                {selectedActivity === 'sound-matching' && (
                  <SoundMatchingGame sessionId={sessionId} childId={childId} onComplete={onClose} />
                )}
                {selectedActivity === 'ambient' && (
                  <AmbientMusicPlayer sessionId={sessionId} childId={childId} onStop={onClose} />
                )}
                {selectedActivity === 'storytelling' && (
                  <MusicalStorytelling sessionId={sessionId} childId={childId} onComplete={onClose} />
                )}
                {selectedActivity === 'recommendations' && (
                  <MusicRecommendations childId={childId} />
                )}
                {selectedActivity === 'movement' && (
                  <MovementActivities sessionId={sessionId} childId={childId} onComplete={onClose} />
                )}
                {selectedActivity === 'emotion' && (
                  <EmotionMatchingMusic sessionId={sessionId} childId={childId} onComplete={onClose} />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

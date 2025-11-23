'use client';

import { Star, Gamepad2, Music, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export type ActivityType = 'favorites' | 'freeze_game' | 'free_play' | 'evaluation';

interface ActivityOption {
  id: ActivityType;
  title: string;
  description: string;
  icon: typeof Star;
  color: string;
  bgColor: string;
}

const ACTIVITIES: ActivityOption[] = [
  {
    id: 'favorites',
    title: 'Favorite Songs',
    description: 'Play favorite songs for high engagement',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  {
    id: 'freeze_game',
    title: 'Freeze Dance Game',
    description: 'Interactive music game - freeze when music stops',
    icon: Gamepad2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  {
    id: 'free_play',
    title: 'Free Music Play',
    description: 'Explore music styles and respond naturally',
    icon: Music,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    id: 'evaluation',
    title: 'Music Response Evaluation',
    description: 'Track detailed therapeutic metrics',
    icon: BarChart3,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  }
];

interface ActivitySelectorProps {
  onSelect: (activity: ActivityType) => void;
  childName?: string;
}

export default function ActivitySelector({ onSelect, childName }: ActivitySelectorProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Choose an Activity {childName && `for ${childName}`}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select how you'd like to structure this session
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACTIVITIES.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <motion.button
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(activity.id)}
              className="group relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left hover:border-primary hover:shadow-xl transition-all duration-200"
            >
              {/* Icon */}
              <div className={`w-14 h-14 ${activity.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-7 h-7 ${activity.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                {activity.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </p>

              {/* Hover Arrow */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Tip:</strong> Start with Favorite Songs for familiar, engaging content,
          or try Freeze Game for active participation and motor skills practice.
        </p>
      </div>
    </div>
  );
}

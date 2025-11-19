'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Play,
  CheckCircle,
  ArrowRight,
  Star,
  X
} from 'lucide-react';

interface ActivityTemplate {
  activity_type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  turn_duration_seconds: number;
  targets_skills: string[];
}

interface ActivitySession {
  activity_session_id: string;
  activity_name: string;
  activity_type: string;
  participants: string[];
  current_turn_index: number;
  total_turns_taken: number;
  status: string;
}

interface InteractiveActivityPanelProps {
  sessionId: string;
  childId: string;
  childName: string;
  isActive: boolean;
}

const ACTIVITY_ICONS: Record<string, string> = {
  drum_circle: '🥁',
  call_response: '🎤',
  instrument_pass: '🎺',
  rhythm_copy: '👏',
  freeze_dance: '🕺',
  song_choice: '🎵'
};

const ACTIVITY_COLORS: Record<string, string> = {
  orange: 'bg-orange-100 border-orange-300 text-orange-800',
  blue: 'bg-blue-100 border-blue-300 text-blue-800',
  purple: 'bg-purple-100 border-purple-300 text-purple-800',
  green: 'bg-green-100 border-green-300 text-green-800',
  pink: 'bg-pink-100 border-pink-300 text-pink-800',
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-800'
};

export default function InteractiveActivityPanel({
  sessionId,
  childId,
  childName,
  isActive
}: InteractiveActivityPanelProps) {
  const [activities, setActivities] = useState<Record<string, ActivityTemplate>>({});
  const [currentActivity, setCurrentActivity] = useState<ActivitySession | null>(null);
  const [showActivitySelect, setShowActivitySelect] = useState(false);
  const [participants] = useState<string[]>([childName, 'Therapist']);
  const [engagementRating, setEngagementRating] = useState(3);

  // Load activity templates
  useEffect(() => {
    if (isActive) {
      loadActivityTemplates();
    }
  }, [isActive]);

  const loadActivityTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/activities/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const startActivity = async (activityType: string) => {
    try {
      const response = await fetch('http://localhost:8000/activities/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          child_id: childId,
          activity_type: activityType,
          participants
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentActivity(data);
        setShowActivitySelect(false);
      }
    } catch (error) {
      console.error('Failed to start activity:', error);
    }
  };

  const recordTurn = async (completedSuccessfully = true) => {
    if (!currentActivity) return;

    const currentParticipant = currentActivity.participants[currentActivity.current_turn_index];

    try {
      const response = await fetch('http://localhost:8000/activities/turn/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          activity_session_id: currentActivity.activity_session_id,
          participant_name: currentParticipant,
          turn_status: 'completed',
          completed_successfully: completedSuccessfully
        })
      });

      if (response.ok) {
        // Refresh activity session
        const activityResponse = await fetch(
          `http://localhost:8000/activities/${currentActivity.activity_session_id}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        if (activityResponse.ok) {
          const updatedActivity = await activityResponse.json();
          setCurrentActivity(updatedActivity);
        }
      }
    } catch (error) {
      console.error('Failed to record turn:', error);
    }
  };

  const completeActivity = async () => {
    if (!currentActivity) return;

    try {
      const response = await fetch('http://localhost:8000/activities/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          activity_session_id: currentActivity.activity_session_id,
          engagement_rating: engagementRating,
          therapist_notes: `Completed ${currentActivity.total_turns_taken} turns`
        })
      });

      if (response.ok) {
        setCurrentActivity(null);
        setEngagementRating(3);
      }
    } catch (error) {
      console.error('Failed to complete activity:', error);
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Interactive Activities</h3>
        </div>
        {!currentActivity && (
          <button
            onClick={() => setShowActivitySelect(!showActivitySelect)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Activity
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Activity Selection */}
        {showActivitySelect && !currentActivity && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-600 mb-3">Choose an activity:</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(activities).map((activity) => (
                <button
                  key={activity.activity_type}
                  onClick={() => startActivity(activity.activity_type)}
                  className={`p-4 rounded-lg border-2 ${
                    ACTIVITY_COLORS[activity.color] || 'bg-gray-100 border-gray-300'
                  } hover:shadow-md transition-all text-left`}
                >
                  <div className="text-3xl mb-2">{ACTIVITY_ICONS[activity.activity_type] || activity.icon}</div>
                  <div className="font-semibold text-sm mb-1">{activity.name}</div>
                  <div className="text-xs opacity-75">{activity.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowActivitySelect(false)}
              className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Active Activity */}
        {currentActivity && (
          <motion.div
            key="active-activity"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Activity Header */}
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-4xl">
                  {ACTIVITY_ICONS[currentActivity.activity_type] || '🎮'}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-800">
                    {currentActivity.activity_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {currentActivity.total_turns_taken} turns completed
                  </p>
                </div>
              </div>
              <button
                onClick={completeActivity}
                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                title="End Activity"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Current Turn Indicator */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-300">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Current Turn:</p>
                <motion.div
                  key={currentActivity.current_turn_index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-green-700 mb-4"
                >
                  {currentActivity.participants[currentActivity.current_turn_index]}
                </motion.div>
                <button
                  onClick={() => recordTurn(true)}
                  className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-lg font-semibold flex items-center gap-2 mx-auto shadow-lg"
                >
                  <CheckCircle className="w-6 h-6" />
                  Turn Complete!
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Participants Circle */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              {currentActivity.participants.map((participant, index) => (
                <React.Fragment key={participant}>
                  <motion.div
                    animate={{
                      scale: index === currentActivity.current_turn_index ? 1.2 : 1,
                      opacity: index === currentActivity.current_turn_index ? 1 : 0.5
                    }}
                    className={`px-4 py-2 rounded-full ${
                      index === currentActivity.current_turn_index
                        ? 'bg-green-500 text-white font-bold shadow-lg'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {participant}
                  </motion.div>
                  {index < currentActivity.participants.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Engagement Rating (shown when ending) */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Activity Engagement:</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setEngagementRating(rating)}
                    className={`p-2 rounded-lg transition-colors ${
                      rating <= engagementRating
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  >
                    <Star className="w-6 h-6" fill={rating <= engagementRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder when nothing active */}
      {!showActivitySelect && !currentActivity && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Start an interactive activity to practice turn-taking</p>
        </div>
      )}
    </motion.div>
  );
}

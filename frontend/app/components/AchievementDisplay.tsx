'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Zap,
  Award
} from 'lucide-react';

interface ChildProgress {
  child_id: string;
  total_points: number;
  total_achievements: number;
  current_streak_days: number;
  longest_streak_days: number;
  level: number;
  points_to_next_level: number;
  total_sessions: number;
}

interface UnlockedAchievement {
  unlock_id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_icon: string;
  points_awarded: number;
  unlocked_at: string;
  seen_by_child: boolean;
}

interface AchievementDisplayProps {
  childId: string;
  childName: string;
  showCelebration?: boolean;
}

export default function AchievementDisplay({
  childId,
  childName,
  showCelebration = true
}: AchievementDisplayProps) {
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [newAchievements, setNewAchievements] = useState<UnlockedAchievement[]>([]);
  const [celebratingAchievement, setCelebratingAchievement] = useState<UnlockedAchievement | null>(null);

  useEffect(() => {
    loadProgress();
    loadAchievements();
    checkNewAchievements();
  }, [childId]);

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/gamification/child/${childId}/progress`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/gamification/child/${childId}/unlocked`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setUnlocked(data);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const checkNewAchievements = async () => {
    if (!showCelebration) return;

    try {
      const response = await fetch(
        `http://localhost:8000/gamification/child/${childId}/new-achievements`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setNewAchievements(data);
          // Show first new achievement
          setCelebratingAchievement(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to check new achievements:', error);
    }
  };

  const markAchievementSeen = async (unlockId: string) => {
    try {
      await fetch(
        `http://localhost:8000/gamification/achievement/${unlockId}/mark-seen?child_id=${childId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Remove from new achievements
      setNewAchievements(prev => prev.filter(a => a.unlock_id !== unlockId));

      // Show next achievement if any
      const remaining = newAchievements.filter(a => a.unlock_id !== unlockId);
      if (remaining.length > 0 && remaining[0]) {
        setCelebratingAchievement(remaining[0]);
      } else {
        setCelebratingAchievement(null);
      }
    } catch (error) {
      console.error('Failed to mark achievement seen:', error);
    }
  };

  const levelProgress = progress ? ((100 - progress.points_to_next_level) / 100) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7" />
                Level {progress.level}
              </h3>
              <p className="text-purple-100 text-sm">{childName}'s Progress</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{progress.total_points}</div>
              <div className="text-purple-100 text-sm">Total Points</div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {progress.level}</span>
              <span>{progress.points_to_next_level} to next level</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{progress.total_achievements}</div>
              <div className="text-xs text-purple-100">Achievements</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                <Zap className="w-5 h-5 text-yellow-300" />
                {progress.current_streak_days}
              </div>
              <div className="text-xs text-purple-100">Day Streak</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{progress.total_sessions}</div>
              <div className="text-xs text-purple-100">Sessions</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Achievement Grid */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-purple-600" />
          <h4 className="text-lg font-bold text-gray-800">Achievements</h4>
          <span className="text-sm text-gray-600">({unlocked.length} unlocked)</span>
        </div>

        {unlocked.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Complete sessions to unlock achievements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {unlocked.map((achievement) => (
              <motion.div
                key={achievement.unlock_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200 hover:border-yellow-300 transition-all cursor-pointer"
              >
                <div className="text-4xl mb-2 text-center">
                  {achievement.achievement_icon}
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-gray-800 mb-1">
                    {achievement.achievement_name}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-yellow-700">
                    <Star className="w-3 h-3 fill-current" />
                    +{achievement.points_awarded}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {celebratingAchievement && showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => markAchievementSeen(celebratingAchievement.unlock_id)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.2, 1.2, 1.2, 1]
                }}
                transition={{ duration: 0.5 }}
                className="text-8xl mb-4"
              >
                {celebratingAchievement.achievement_icon}
              </motion.div>

              <h2 className="text-3xl font-bold text-purple-600 mb-2">
                Achievement Unlocked!
              </h2>

              <p className="text-xl font-semibold text-gray-800 mb-4">
                {celebratingAchievement.achievement_name}
              </p>

              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-700">
                  <Star className="w-6 h-6 fill-current" />
                  <span className="text-2xl font-bold">
                    +{celebratingAchievement.points_awarded} Points!
                  </span>
                </div>
              </div>

              <button
                onClick={() => markAchievementSeen(celebratingAchievement.unlock_id)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                Awesome! 🎉
              </button>

              {newAchievements.length > 1 && (
                <p className="text-sm text-gray-600 mt-3">
                  +{newAchievements.length - 1} more achievement{newAchievements.length > 2 ? 's' : ''}!
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

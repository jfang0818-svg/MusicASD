'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayCircle, Sparkles, Plus, LogOut, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: children, isLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const handleStartSession = (childId: string) => {
    router.push(`/dashboard/session?childId=${childId}`);
  };

  const handleAnalyzeProfile = (childId: string) => {
    router.push(`/dashboard/profiles/${childId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🎵</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  musicASD
                </h1>
                <p className="text-xs text-gray-500">Music Therapy for ASD</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            {children && children.length > 0
              ? `You have ${children.length} child profile${children.length > 1 ? 's' : ''}`
              : "Let's get started by creating a child profile"}
          </p>
        </motion.div>

        {/* Children Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Loading State */}
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="h-12 w-12 bg-gray-200 rounded-2xl mb-4" />
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </>
          )}

          {/* Child Profile Cards */}
          {!isLoading && children && children.map((child: any, index: number) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredCard(child.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />

              <div className="relative">
                {/* Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">{getEmojiForAge(child.demographics.age)}</span>
                </div>

                {/* Child Info */}
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {child.demographics.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {child.demographics.age} years old
                  {child.demographics.asd_level && ` • ASD Level ${child.demographics.asd_level}`}
                </p>

                {/* Quick Stats */}
                <div className="flex gap-2 mb-4">
                  {child.demographics.gender && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {child.demographics.gender}
                    </span>
                  )}
                  {child.music_preferences?.preferred_tempo && (
                    <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">
                      {child.music_preferences.preferred_tempo} tempo
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStartSession(child.id)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start Session
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAnalyzeProfile(child.id)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analyze
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add New Child Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (children?.length || 0) * 0.1 }}
          >
            <Link
              href="/dashboard/profiles/new"
              className="block bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 shadow-lg border-2 border-purple-200 hover:shadow-2xl transition-all group h-full"
            >
              <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Add New Child</h3>
                <p className="text-sm text-white/80 text-center">
                  Create a profile to get started
                </p>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Empty State */}
        {!isLoading && (!children || children.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎵</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No profiles yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first child profile to start using musicASD for therapy sessions
            </p>
            <Link
              href="/dashboard/profiles/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              Create First Profile
            </Link>
          </motion.div>
        )}

        {/* Quick Links */}
        {children && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Link
              href="/dashboard/library"
              className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎶</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Music Library</h4>
                  <p className="text-sm text-gray-500">Browse therapy music</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/logs"
              className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Session History</h4>
                  <p className="text-sm text-gray-500">View past sessions</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Settings</h4>
                  <p className="text-sm text-gray-500">Manage account</p>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Helper function to get emoji based on age
function getEmojiForAge(age: number): string {
  if (age < 3) return '👶';
  if (age < 6) return '👧';
  if (age < 10) return '🧒';
  if (age < 13) return '👦';
  if (age < 18) return '👨';
  return '🧑';
}
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayCircle, Sparkles, Plus, LogOut, Settings, LayoutGrid, List, History, Calendar, Clock, TrendingUp, Library, CalendarPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChildProfiles, getPlannedSessions, createPlannedSession } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { SessionStartModal } from '../components/modals/SessionStartModal';
import { PlanSessionModal } from '../components/modals/PlanSessionModal';
import type { PlannedSession } from '../types';

type ViewMode = 'cards' | 'list';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [_hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedChildName, setSelectedChildName] = useState<string>('');

  const { data: children, isLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const { data: plannedSessions = [] } = useQuery({
    queryKey: ['planned-sessions'],
    queryFn: () => getPlannedSessions(),
  });

  const createSessionMutation = useMutation({
    mutationFn: createPlannedSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  const handleOpenStartModal = (childId: string, childName: string) => {
    setSelectedChildId(childId);
    setSelectedChildName(childName);
    setShowStartModal(true);
  };

  const handleOpenPlanModal = (childId: string, childName: string) => {
    setSelectedChildId(childId);
    setSelectedChildName(childName);
    setShowPlanModal(true);
  };

  const handleStartAdHocSession = () => {
    router.push(`/dashboard/session?childId=${selectedChildId}`);
  };

  const handleStartPlannedSession = (sessionId: string) => {
    router.push(`/dashboard/session?childId=${selectedChildId}&plannedSessionId=${sessionId}`);
  };

  const handleSavePlannedSession = async (sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createSessionMutation.mutateAsync(sessionData as any);
  };

  const handleAnalyzeProfile = (childId: string) => {
    router.push(`/dashboard/profiles/${childId}`);
  };

  const handleSettings = (childId: string) => {
    router.push(`/dashboard/profiles/${childId}/settings`);
  };

  const handleLibrary = (childId: string) => {
    router.push(`/dashboard/library?childId=${childId}`);
  };

  const handleSessionHistory = (childId: string) => {
    router.push(`/dashboard/logs?childId=${childId}`);
  };

  const handleProgress = (childId: string) => {
    router.push(`/dashboard/progress/${childId}`);
  };

  // Determine terminology based on user role
  const userRole = user?.role || 'caregiver'; // 'self', 'parent', 'caregiver', 'therapist'
  const isSelf = userRole === 'self';
  const participantLabel = isSelf ? 'My Profile' : 'Participant';
  const addButtonText = isSelf ? 'Set Up My Profile' : 'Add New Participant';

  // Mock session data - replace with real API calls
  const getLastSession = (childId: string) => {
    // TODO: Fetch from API
    return '2 days ago';
  };

  const getNextSession = (childId: string) => {
    // TODO: Fetch from API
    return 'Tomorrow, 2:00 PM';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🎵</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  SonicSoothe
                </h1>
                <p className="text-xs text-gray-500">Music that heals</p>
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
      <div className="py-8">
        {/* Welcome Section with View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h2>
            <p className="text-gray-600">
              {children && children.length > 0
                ? `You have ${children.length} ${children.length > 1 ? participantLabel + 's' : participantLabel}`
                : `Let's get started by creating ${isSelf ? 'your profile' : 'a profile'}`}
            </p>
          </div>

          {/* View Toggle */}
          {children && children.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-md">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
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
          </div>
        )}

        {/* Cards View */}
        {!isLoading && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Child Profile Cards */}
            {children && children.map((child: any, index: number) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredCard(child.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all group relative overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className="relative">
                  {/* Settings Button - Top Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSettings(child.id);
                    }}
                    className="absolute top-0 right-0 p-2 hover:bg-gray-100 rounded-lg transition-colors group/settings"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-400 group-hover/settings:text-purple-600 transition-colors" />
                  </button>

                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
                    <span className="text-3xl">{getEmojiForAge(child.demographics.age)}</span>
                  </div>

                  {/* Child Info */}
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {child.demographics.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {child.demographics.age} years old
                    {child.demographics.asd_level && ` • ASD Level ${child.demographics.asd_level}`}
                  </p>

                  {/* Session Schedule */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">Last:</span>
                      <span>{getLastSession(child.id)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span className="font-medium">Next:</span>
                      <span>{getNextSession(child.id)}</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => handleProgress(child.id)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-3 rounded-lg transition-colors"
                      title="Progress"
                    >
                      <TrendingUp className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleAnalyzeProfile(child.id)}
                      className="bg-pink-50 hover:bg-pink-100 text-pink-600 p-3 rounded-lg transition-colors"
                      title="AI Profile"
                    >
                      <Sparkles className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleLibrary(child.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-3 rounded-lg transition-colors"
                      title="Library"
                    >
                      <Library className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/plans')}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-3 rounded-lg transition-colors"
                      title="Session Plans"
                    >
                      <CalendarPlus className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleSessionHistory(child.id)}
                      className="bg-green-50 hover:bg-green-100 text-green-600 p-3 rounded-lg transition-colors"
                      title="Session History"
                    >
                      <History className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleSettings(child.id)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-600 p-3 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5 mx-auto" />
                    </button>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenPlanModal(child.id, child.demographics.name)}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Plan
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenStartModal(child.id, child.demographics.name)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add New Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (children?.length || 0) * 0.1 }}
            >
              <Link
                href="/dashboard/profiles/new"
                className="block bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 shadow-lg border-2 border-purple-200 hover:shadow-2xl transition-all group h-full"
              >
                <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{addButtonText}</h3>
                  <p className="text-sm text-white/80 text-center">
                    {isSelf ? 'Set up your profile to get started' : 'Create a profile to get started'}
                  </p>
                </div>
              </Link>
            </motion.div>
          </div>
        )}

        {/* List View */}
        {!isLoading && viewMode === 'list' && (
          <div className="space-y-4">
            {children && children.map((child: any, index: number) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{getEmojiForAge(child.demographics.age)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg truncate">
                      {child.demographics.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {child.demographics.age} years old
                      {child.demographics.asd_level && ` • ASD Level ${child.demographics.asd_level}`}
                    </p>
                  </div>

                  {/* Session Schedule */}
                  <div className="hidden md:flex flex-col gap-1 text-xs text-gray-600 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Last: {getLastSession(child.id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>Next: {getNextSession(child.id)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleProgress(child.id)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                      title="Progress"
                    >
                      <TrendingUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAnalyzeProfile(child.id)}
                      className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg transition-colors"
                      title="AI Profile"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleLibrary(child.id)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Library"
                    >
                      <Library className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/plans')}
                      className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors"
                      title="Session Plans"
                    >
                      <CalendarPlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSessionHistory(child.id)}
                      className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                      title="Session History"
                    >
                      <History className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSettings(child.id)}
                      className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    <div className="w-px h-8 bg-gray-200 mx-2" />

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenPlanModal(child.id, child.demographics.name)}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Plan
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenStartModal(child.id, child.demographics.name)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add New List Item */}
            <Link
              href="/dashboard/profiles/new"
              className="flex items-center gap-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-white group"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{addButtonText}</h3>
                <p className="text-sm text-white/80">
                  {isSelf ? 'Set up your profile to get started' : 'Create a profile to get started'}
                </p>
              </div>
            </Link>
          </div>
        )}

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
              {isSelf
                ? 'Set up your profile to start using SonicSoothe for music therapy'
                : 'Create a profile to start using SonicSoothe for therapy sessions'}
            </p>
            <Link
              href="/dashboard/profiles/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              {addButtonText}
            </Link>
          </motion.div>
        )}

      </div>

      {/* Modals */}
      <SessionStartModal
        show={showStartModal}
        onClose={() => setShowStartModal(false)}
        childId={selectedChildId}
        childName={selectedChildName}
        plannedSessions={plannedSessions}
        onStartAdHoc={handleStartAdHocSession}
        onStartPlanned={handleStartPlannedSession}
      />

      <PlanSessionModal
        show={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        childId={selectedChildId}
        childName={selectedChildName}
        onSave={handleSavePlannedSession}
      />
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

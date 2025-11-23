'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getChildProfile, updateChildProfile } from '@/app/lib/api';
import { useMusicStore } from '@/app/store/useMusicStore';
import CustomSessionSongsManager from '@/app/components/CustomSessionSongsManager';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Music, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProfileSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;
  const { uploadMusicFile } = useMusicStore();

  const { data: childProfile, isLoading, refetch } = useQuery({
    queryKey: ['child-profile', childId],
    queryFn: () => getChildProfile(childId),
    enabled: !!childId,
  });

  const handleUpdateProfile = async (updates: any) => {
    try {
      await updateChildProfile(childId, updates);
      await refetch();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!childProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile not found</h2>
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Profile Settings</h1>
                <p className="text-sm text-gray-500">{childProfile.demographics.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{childProfile.demographics.name}</h2>
                <p className="text-gray-600">
                  {childProfile.demographics.age} years old
                  {childProfile.demographics.gender && ` • ${childProfile.demographics.gender}`}
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              {childProfile.demographics.asd_level && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 font-semibold mb-1">ASD Level</p>
                  <p className="text-lg font-bold text-purple-800">Level {childProfile.demographics.asd_level}</p>
                </div>
              )}
              {childProfile.music_preferences?.preferred_tempo && (
                <div className="bg-pink-50 rounded-lg p-4">
                  <p className="text-xs text-pink-600 font-semibold mb-1">Preferred Tempo</p>
                  <p className="text-lg font-bold text-pink-800 capitalize">{childProfile.music_preferences.preferred_tempo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Music Settings Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Music className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-800">Music Settings</h3>
            </div>

            {/* Custom Session Songs */}
            <CustomSessionSongsManager
              childId={childId}
              childName={childProfile.demographics.name}
              customHelloSong={childProfile.music_preferences?.custom_hello_song}
              customGoodbyeSong={childProfile.music_preferences?.custom_goodbye_song}
              onUpdate={async (updates) => {
                await handleUpdateProfile({
                  music_preferences: {
                    ...childProfile.music_preferences,
                    ...updates
                  }
                });
              }}
              onUpload={async (file, style) => {
                await uploadMusicFile(file, style);
              }}
            />
          </div>

          {/* Additional Settings (Future) */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Additional Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">Session Duration Preferences</p>
                  <p className="text-sm text-gray-600">Customize default session length</p>
                </div>
                <span className="text-sm text-gray-500">Coming soon</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">Notification Preferences</p>
                  <p className="text-sm text-gray-600">Manage alerts and reminders</p>
                </div>
                <span className="text-sm text-gray-500">Coming soon</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">Data Export</p>
                  <p className="text-sm text-gray-600">Download session history and metrics</p>
                </div>
                <span className="text-sm text-gray-500">Coming soon</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

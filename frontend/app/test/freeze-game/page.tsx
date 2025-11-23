'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles, startSessionForChild } from '@/app/lib/api';
import FreezeGame from '@/app/components/activities/FreezeGame';
import { ArrowLeft, Play, Square } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TestFreezeGamePage() {
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [gameActive, setGameActive] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<'calm' | 'happy' | 'energetic'>('happy');

  // Fetch children profiles
  const { data: children, isLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const handleStartSession = async () => {
    if (!selectedChildId) return;

    try {
      const response = await startSessionForChild(selectedChildId);
      setSessionId(response.session_id);
      toast.success('Session started!');
      setGameActive(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start session');
    }
  };

  const playMusic = (style: 'calm' | 'happy' | 'energetic') => {
    console.log('🎵 Playing music:', style);
    setCurrentStyle(style);
    setMusicPlaying(true);
    toast.success(`Playing ${style} music`);

    // In real implementation, this would trigger actual music playback
    // For testing, we just simulate it
  };

  const stopMusic = () => {
    console.log('⏹️ Stopping music');
    setMusicPlaying(false);
    toast('Music stopped');
  };

  const handleGameComplete = (summary: any) => {
    console.log('Game completed:', summary);
    setGameActive(false);
    toast.success(`Game complete! ${summary?.success_rate?.toFixed(0)}% success rate`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🎮 Freeze Game Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the Musical Freeze Dance game
          </p>
        </div>

        {!gameActive ? (
          <>
            {/* Child Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                1. Select Child Profile
              </h2>
              {children && children.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {children.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChildId(child.id)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${selectedChildId === child.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }
                      `}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {child.demographics.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {child.demographics.age} years old
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No child profiles found.</p>
                  <Link
                    href="/dashboard/profiles/new"
                    className="text-purple-600 hover:underline mt-2 inline-block"
                  >
                    Create a profile first
                  </Link>
                </div>
              )}
            </div>

            {/* Start Session */}
            {selectedChildId && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  2. Start Test Session
                </h2>

                <div className="text-center py-8">
                  <button
                    onClick={handleStartSession}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                  >
                    <Play className="w-6 h-6" />
                    Start Freeze Game
                  </button>

                  <div className="mt-6 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
                    <strong>💡 How to test:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                      <li>Click start to begin the game</li>
                      <li>Music will "play" (simulated in console)</li>
                      <li>When music stops, mark if child froze</li>
                      <li>Complete 5-10 rounds to see summary</li>
                      <li>Check browser console for music events</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Music Status Indicator */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${musicPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {musicPlaying ? `🎵 Playing ${currentStyle} music` : '⏸️ Music stopped'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setGameActive(false);
                    setMusicPlaying(false);
                    toast.success('Session ended');
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </button>
              </div>
            </div>

            {/* Freeze Game Component */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <FreezeGame
                sessionId={sessionId}
                childId={selectedChildId}
                onPlayMusic={playMusic}
                onStopMusic={stopMusic}
                onComplete={handleGameComplete}
              />
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                🎮 Testing Instructions:
              </h3>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• <strong>Watch console:</strong> Music play/stop events are logged</li>
                <li>• <strong>Simulate gameplay:</strong> Click "Yes" or "No" when asked if child froze</li>
                <li>• <strong>Complete rounds:</strong> Game auto-progresses through rounds</li>
                <li>• <strong>View summary:</strong> Final screen shows stats and success rate</li>
                <li>• <strong>Real integration:</strong> Connect to actual music player in session page</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

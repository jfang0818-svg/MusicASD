'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles } from '@/app/lib/api';
import FavoritesPanel from '@/app/components/favorites/FavoritesPanel';
import AddToFavoritesButton from '@/app/components/favorites/AddToFavoritesButton';
import { ArrowLeft, Music } from 'lucide-react';
import Link from 'next/link';

export default function TestFavoritesPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [testSong, setTestSong] = useState({
    file: 'ocean_waves.mp3',
    style: 'calm' as 'calm' | 'happy' | 'energetic',
    score: 85
  });

  // Fetch children profiles
  const { data: children, isLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

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
            🌟 Favorites System Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the favorites functionality with your child profiles
          </p>
        </div>

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

        {selectedChildId && (
          <>
            {/* Add to Favorites Test */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                2. Test "Add to Favorites" Button
              </h2>

              <div className="space-y-4">
                {/* Test Song Selector */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Music className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Test Song Configuration
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Song File:
                      </label>
                      <input
                        type="text"
                        value={testSong.file}
                        onChange={(e) => setTestSong({ ...testSong, file: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="ocean_waves.mp3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Style:
                      </label>
                      <select
                        value={testSong.style}
                        onChange={(e) => setTestSong({ ...testSong, style: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="calm">Calm</option>
                        <option value="happy">Happy</option>
                        <option value="energetic">Energetic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Quality Score:
                      </label>
                      <input
                        type="number"
                        value={testSong.score}
                        onChange={(e) => setTestSong({ ...testSong, score: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <div className="flex items-center justify-center py-4">
                  <AddToFavoritesButton
                    childId={selectedChildId}
                    musicFile={testSong.file}
                    musicStyle={testSong.style}
                    qualityScore={testSong.score}
                  />
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <strong>💡 Tip:</strong> Try clicking the button to add this song to favorites.
                  You can change the song details above and add multiple songs!
                </div>
              </div>
            </div>

            {/* Favorites Panel Test */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                3. Favorites List
              </h2>

              <FavoritesPanel
                childId={selectedChildId}
                onPlayFavorite={(fav) => {
                  console.log('Play favorite:', fav);
                  alert(`Would play: ${fav.music_file} (${fav.music_style})`);
                }}
              />

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <strong>✅ Features to test:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Click play button to "play" a favorite</li>
                  <li>Edit tags by clicking "Edit" or "Add tags"</li>
                  <li>Remove songs with the X button</li>
                  <li>Notice songs sorted by quality score</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

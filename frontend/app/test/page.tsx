'use client';

import Link from 'next/link';
import { Star, Gamepad2, Sparkles } from 'lucide-react';

export default function TestIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sprint 1 Feature Tests
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Test the new professional features before integrating them
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Favorites Test */}
          <Link
            href="/test/favorites"
            className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-yellow-500"
          >
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-yellow-600 transition-colors">
              Favorites System
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Test adding songs to favorites, viewing the list, editing tags, and playing favorites
            </p>
            <div className="flex items-center text-yellow-600 font-semibold">
              Test Now
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>

          {/* Freeze Game Test */}
          <Link
            href="/test/freeze-game"
            className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-purple-500"
          >
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
              Freeze Game
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Test the interactive Musical Freeze Dance game with simulated music playback
            </p>
            <div className="flex items-center text-purple-600 font-semibold">
              Test Now
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                What you can test:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>✅ <strong>Favorites:</strong> Add songs, view favorites list, edit tags, remove songs</li>
                <li>✅ <strong>Freeze Game:</strong> Complete full game flow with scoring and summary</li>
                <li>✅ <strong>Data Persistence:</strong> All changes save to Azure Blob Storage</li>
                <li>✅ <strong>Real API:</strong> Full backend integration (no mocks)</li>
              </ul>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Next Step:</strong> After testing, these features will be integrated into the main session page with full music player integration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

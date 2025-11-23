'use client';

import Link from 'next/link';
import { Music, Brain, Book, Activity, Heart, Sparkles } from 'lucide-react';

export default function Sprint2TestLanding() {
  const features = [
    {
      id: 'sound-matching',
      name: 'Sound Matching Game',
      description: 'Auditory processing and matching skills game',
      icon: '🎵',
      IconComponent: Music,
      color: 'from-purple-500 to-blue-500',
      path: '/test/sprint2/sound-matching'
    },
    {
      id: 'ambient-music',
      name: 'Ambient Music',
      description: 'Real-time soundscape generation for calming',
      icon: '🌊',
      IconComponent: Music,
      color: 'from-blue-500 to-cyan-500',
      path: '/test/sprint2/ambient-music'
    },
    {
      id: 'storytelling',
      name: 'Musical Storytelling',
      description: 'Interactive therapeutic stories with music',
      icon: '📚',
      IconComponent: Book,
      color: 'from-pink-500 to-purple-500',
      path: '/test/sprint2/storytelling'
    },
    {
      id: 'recommendations',
      name: 'AI Recommendations',
      description: 'Smart song suggestions based on preferences',
      icon: '✨',
      IconComponent: Sparkles,
      color: 'from-green-500 to-emerald-500',
      path: '/test/sprint2/recommendations'
    },
    {
      id: 'movement',
      name: 'Movement Activities',
      description: 'Guided movement sequences and exercises',
      icon: '🏃',
      IconComponent: Activity,
      color: 'from-orange-500 to-red-500',
      path: '/test/sprint2/movement'
    },
    {
      id: 'emotion-music',
      name: 'Emotion-Matching Music',
      description: 'Iso-principle emotional regulation',
      icon: '❤️',
      IconComponent: Heart,
      color: 'from-red-500 to-pink-500',
      path: '/test/sprint2/emotion-music'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎮 Sprint 2 Feature Tests
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Test all 6 new therapeutic features
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              ✅ <strong>6</strong> Backend APIs
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              ✅ <strong>6</strong> Frontend Components
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              ✅ <strong>37</strong> API Endpoints
            </span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature) => (
            <Link
              key={feature.id}
              href={feature.path}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

              {/* Content */}
              <div className="relative p-6">
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Test Feature →
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -translate-x-16 -translate-y-16" />
            </Link>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Testing Instructions</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Before Testing:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Ensure backend server is running on port 8000</li>
              <li>Have a test child profile created</li>
              <li>Start a test session if needed</li>
            </ol>

            <p className="mt-4">
              <strong>Testing Each Feature:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Click on any feature card above</li>
              <li>Follow the on-screen instructions</li>
              <li>Complete the full activity flow</li>
              <li>Check console for API calls and responses</li>
              <li>Verify data is saved to Azure (check backend logs)</li>
            </ul>

            <p className="mt-4">
              <strong>What to Verify:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>UI components render correctly</li>
              <li>API calls complete successfully</li>
              <li>Data persists between sessions</li>
              <li>Animations and transitions work smoothly</li>
              <li>Error handling works properly</li>
            </ul>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/test"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            ← Back to Sprint 1 Tests
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

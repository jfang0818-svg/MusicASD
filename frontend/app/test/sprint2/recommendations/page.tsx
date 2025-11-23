'use client';

import { useState } from 'react';
import Link from 'next/link';
import MusicRecommendations from '@/app/components/recommendations/MusicRecommendations';

export default function RecommendationsTestPage() {
  const [childId] = useState('test-child-123');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/test/sprint2" className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2 mb-4">
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">✨ AI Recommendations Test</h1>
          <p className="text-gray-600">Test smart music suggestions and preference insights</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="text-sm">
            <span className="text-gray-600">Child ID:</span>
            <span className="ml-2 font-mono text-green-600">{childId}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Note: To see meaningful recommendations, you need existing favorites and response data.
            The system will show mock data for testing.
          </p>
        </div>

        <MusicRecommendations
          childId={childId}
          context={{
            goal: 'calming',
            time_of_day: 'any',
            activity_type: 'free_play'
          }}
        />

        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>✓ Can select different goals (calming, energizing, etc.)</li>
            <li>✓ Can select time of day</li>
            <li>✓ Recommendations load and display</li>
            <li>✓ Each recommendation shows score and reasons</li>
            <li>✓ Confidence badges display correctly</li>
            <li>✓ Can play recommended songs</li>
            <li>✓ Can give thumbs up/down feedback</li>
            <li>✓ Insights panel shows statistics</li>
            <li>✓ Top styles and performance data display</li>
            <li>✓ AI insights and recommendations appear</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

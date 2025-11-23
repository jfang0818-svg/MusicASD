'use client';

import { useState } from 'react';
import Link from 'next/link';
import EmotionMatchingMusic from '@/app/components/activities/EmotionMatchingMusic';

export default function EmotionMusicTestPage() {
  const [childId] = useState('test-child-123');
  const [sessionId] = useState('test-session-' + Date.now());

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/test/sprint2" className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-2 mb-4">
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">❤️ Emotion-Matching Music Test</h1>
          <p className="text-gray-600">Test iso-principle emotional regulation with music</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Child ID:</span>
              <span className="ml-2 font-mono text-red-600">{childId}</span>
            </div>
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono text-red-600">{sessionId}</span>
            </div>
          </div>
        </div>

        <EmotionMatchingMusic
          sessionId={sessionId}
          childId={childId}
        />

        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li>✓ Can select initial emotion (9 options)</li>
            <li>✓ Can select target emotion (neutral, calm, content)</li>
            <li>✓ Session starts successfully</li>
            <li>✓ Transition plan is calculated automatically</li>
            <li>✓ Current phase displays with emotion emoji</li>
            <li>✓ Musical characteristics show (tempo, key, dynamics, texture)</li>
            <li>✓ Music visualizer animates correctly</li>
            <li>✓ Can check current emotion during session</li>
            <li>✓ Phase advances based on emotion checks</li>
            <li>✓ Can end session at any time</li>
            <li>✓ Can mark goal as achieved</li>
            <li>✓ Summary shows emotion journey</li>
          </ul>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 About Iso-Principle</h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            The iso-principle is a music therapy technique where music initially matches the client's current
            emotional state (tempo, dynamics, mode), then gradually transitions to music representing the desired
            emotional state. This approach is more effective than immediately playing contrasting music,
            as it meets the client where they are before guiding them toward regulation.
          </p>
        </div>
      </div>
    </div>
  );
}

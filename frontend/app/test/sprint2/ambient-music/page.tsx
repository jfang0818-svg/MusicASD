'use client';

import { useState } from 'react';
import Link from 'next/link';
import AmbientMusicPlayer from '@/app/components/activities/AmbientMusicPlayer';

export default function AmbientMusicTestPage() {
  const [childId] = useState('test-child-123');
  const [sessionId] = useState('test-session-' + Date.now());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/test/sprint2" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2 mb-4">
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🌊 Ambient Music Test</h1>
          <p className="text-gray-600">Test real-time soundscape generation and parameter control</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Child ID:</span>
              <span className="ml-2 font-mono text-blue-600">{childId}</span>
            </div>
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono text-blue-600">{sessionId}</span>
            </div>
          </div>
        </div>

        <AmbientMusicPlayer
          childId={childId}
          sessionId={sessionId}
        />

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Can select different environments (rainforest, ocean, space, etc.)</li>
            <li>✓ Soundscape starts successfully</li>
            <li>✓ Can adjust density slider in real-time</li>
            <li>✓ Can adjust brightness slider</li>
            <li>✓ Can adjust movement slider</li>
            <li>✓ Can adjust base frequency slider</li>
            <li>✓ Can save custom presets</li>
            <li>✓ Can stop the soundscape</li>
            <li>✓ API calls update parameters (check network tab)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

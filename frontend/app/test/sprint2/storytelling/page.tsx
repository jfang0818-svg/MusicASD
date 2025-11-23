'use client';

import { useState } from 'react';
import Link from 'next/link';
import MusicalStorytelling from '@/app/components/activities/MusicalStorytelling';

export default function StorytellingTestPage() {
  const [childId] = useState('test-child-123');
  const [sessionId] = useState('test-session-' + Date.now());

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/test/sprint2" className="text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-2 mb-4">
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📚 Musical Storytelling Test</h1>
          <p className="text-gray-600">Test interactive therapeutic stories with music</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Child ID:</span>
              <span className="ml-2 font-mono text-pink-600">{childId}</span>
            </div>
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono text-pink-600">{sessionId}</span>
            </div>
          </div>
        </div>

        <MusicalStorytelling
          sessionId={sessionId}
          childId={childId}
        />

        <div className="mt-6 bg-pink-50 border border-pink-200 rounded-lg p-6">
          <h3 className="font-semibold text-pink-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-pink-800">
            <li>✓ Can select from 5 different stories</li>
            <li>✓ Story starts successfully</li>
            <li>✓ Scenes progress with narrative text</li>
            <li>✓ Participation prompts display correctly</li>
            <li>✓ Music cues are indicated</li>
            <li>✓ Can rate participation levels</li>
            <li>✓ Scenes advance after rating</li>
            <li>✓ Story completes and shows summary</li>
            <li>✓ Summary shows participation statistics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

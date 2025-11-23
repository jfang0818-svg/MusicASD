'use client';

import { useState } from 'react';
import Link from 'next/link';
import SoundMatchingGame from '@/app/components/activities/SoundMatchingGame';

export default function SoundMatchingTestPage() {
  const [childId] = useState('test-child-123');
  const [sessionId] = useState('test-session-' + Date.now());
  const [gameSummary, setGameSummary] = useState<any>(null);

  const handleGameComplete = (summary: any) => {
    console.log('Game completed:', summary);
    setGameSummary(summary);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/test/sprint2"
            className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-2 mb-4"
          >
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎵 Sound Matching Game Test
          </h1>
          <p className="text-gray-600">
            Test the auditory processing and matching skills game
          </p>
        </div>

        {/* Test Info Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Child ID:</span>
              <span className="ml-2 font-mono text-purple-600">{childId}</span>
            </div>
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono text-purple-600">{sessionId}</span>
            </div>
          </div>
        </div>

        {/* Game Component */}
        <SoundMatchingGame
          sessionId={sessionId}
          childId={childId}
          onComplete={handleGameComplete}
        />

        {/* Summary Display */}
        {gameSummary && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-3">📊 Game Summary (Console Data)</h2>
            <pre className="bg-gray-100 rounded p-4 text-xs overflow-auto">
              {JSON.stringify(gameSummary, null, 2)}
            </pre>
          </div>
        )}

        {/* Testing Notes */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Can select different categories (instruments, animals, nature, everyday)</li>
            <li>✓ Can select difficulty levels (easy, medium, hard)</li>
            <li>✓ Game starts successfully</li>
            <li>✓ Sounds are indicated (check console for "Playing sound" logs)</li>
            <li>✓ Can select answer choices</li>
            <li>✓ Feedback shows correctly (correct/incorrect)</li>
            <li>✓ Rounds progress automatically</li>
            <li>✓ Game ends after 10 rounds</li>
            <li>✓ Summary displays accuracy and statistics</li>
            <li>✓ Data is sent to backend (check network tab)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

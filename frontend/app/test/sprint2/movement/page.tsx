'use client';

import { useState } from 'react';
import Link from 'next/link';
import MovementActivities from '@/app/components/activities/MovementActivities';

export default function MovementTestPage() {
  const [childId] = useState('test-child-123');
  const [sessionId] = useState('test-session-' + Date.now());

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/test/sprint2" className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-2 mb-4">
            ← Back to Sprint 2 Tests
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏃 Movement Activities Test</h1>
          <p className="text-gray-600">Test guided movement sequences and exercises</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Test Session Info</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Child ID:</span>
              <span className="ml-2 font-mono text-orange-600">{childId}</span>
            </div>
            <div>
              <span className="text-gray-600">Session ID:</span>
              <span className="ml-2 font-mono text-orange-600">{sessionId}</span>
            </div>
          </div>
        </div>

        <MovementActivities
          sessionId={sessionId}
          childId={childId}
        />

        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-orange-900 mb-3">🧪 Testing Checklist</h3>
          <ul className="space-y-2 text-sm text-orange-800">
            <li>✓ Can select from 5 different activities</li>
            <li>✓ Activity starts successfully</li>
            <li>✓ Movement instructions display clearly</li>
            <li>✓ Duration is shown for each movement</li>
            <li>✓ Music cues are indicated</li>
            <li>✓ Can rate participation (full, partial, minimal, refused)</li>
            <li>✓ Can rate quality (excellent, good, fair, needs support)</li>
            <li>✓ Movements advance after rating</li>
            <li>✓ Activity completes and shows summary</li>
            <li>✓ Summary displays participation statistics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

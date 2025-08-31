'use client';

import { Clock } from 'lucide-react';
import type { LogEntry } from '@/store/useSessionStore';

interface SessionLogsProps {
  logs: LogEntry[];
}

export function SessionLogs({ logs }: SessionLogsProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No Activity Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Session activity will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Activity
      </h3>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-64 overflow-y-auto scrollbar-thin">
        <div className="space-y-2">
          {logs.slice(-10).reverse().map((log, index) => (
            <div
              key={index}
              className="flex gap-3 p-2 bg-white dark:bg-gray-700 rounded-md border-l-3 border-primary hover:shadow-sm transition-shadow"
            >
              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[60px]">
                {log.time}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                {log.action}
              </span>
              <div className="flex gap-2">
                {log.engagement && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {log.engagement}
                  </span>
                )}
                {log.style && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    {log.style}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, ChevronUp, ChevronDown, CheckCircle, XCircle, Loader2, Play, Download } from 'lucide-react';
import { useMusicGeneration } from '../contexts/MusicGenerationContext';
import toast from 'react-hot-toast';

export default function MusicGenerationStatus() {
  const { tasks, clearCompletedTasks, isGenerating } = useMusicGeneration();
  const [expanded, setExpanded] = useState(true);
  const [minimized, setMinimized] = useState(false);

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  // Don't render if no tasks
  if (tasks.length === 0) return null;

  const handlePlayPreview = (path: string) => {
    const audio = new Audio(`http://localhost:8000/${path}`);
    audio.play();
    toast.success('Playing preview...', { icon: '🎵' });
  };

  const handleDownload = (filename: string, path: string) => {
    const link = document.createElement('a');
    link.href = `http://localhost:8000/${path}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  if (minimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
        >
          <Music className="h-5 w-5" />
          {isGenerating && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span className="font-medium">
            {activeTasks.length > 0 ? `${activeTasks.length} generating` : `${tasks.length} tasks`}
          </span>
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <span className="font-semibold">Music Generation</span>
              {isGenerating && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setMinimized(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-h-80 overflow-y-auto"
            >
              <div className="p-3 space-y-2">
                {/* Active Tasks */}
                {activeTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100 capitalize">
                        {task.params.style}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {task.params.duration}s
                      </span>
                    </div>
                    <div className="h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        className="h-full bg-amber-500"
                      />
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-right">
                      {task.progress}%
                    </p>
                  </div>
                ))}

                {/* Completed Tasks */}
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100 capitalize">
                          {task.params.style}
                        </span>
                      </div>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Done!
                      </span>
                    </div>
                    {task.result && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlayPreview(task.result.path)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          <Play className="h-3 w-3" />
                          Play
                        </button>
                        <button
                          onClick={() => handleDownload(task.result.filename, task.result.path)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded text-xs font-medium transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Failed Tasks */}
                {failedTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900 dark:text-red-100 capitalize">
                        {task.params.style}
                      </span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {task.error || 'Generation failed'}
                    </p>
                  </div>
                ))}

                {/* No active tasks message */}
                {tasks.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No generation tasks
                  </p>
                )}
              </div>

              {/* Footer */}
              {(completedTasks.length > 0 || failedTasks.length > 0) && (
                <div className="px-3 pb-3">
                  <button
                    onClick={clearCompletedTasks}
                    className="w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Clear completed tasks
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useState } from 'react';
import { X, Music, Trash2, Clock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatTime } from '@/lib/utils';
import type { GeneratedTone, ModalProps } from '@/app/types';

interface GeneratedTonesModalProps extends ModalProps {
  generatedTones: GeneratedTone[];
  playMusic: (style: 'calm' | 'happy' | 'energetic', file?: string) => void;
  sessionActive: boolean;
}

export function GeneratedTonesModal({
  show,
  onClose,
  generatedTones,
  playMusic,
  sessionActive
}: GeneratedTonesModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!show) return null;

  const handleDelete = async (toneName: string) => {
    try {
      const response = await fetch(`/api/backend/music/generated/delete/${toneName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        window.location.reload(); // TODO: Use proper state management instead
        setDeleteConfirm(null);
        toast.success('Tone deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting tone:', error);
      toast.error('Failed to delete tone');
    }
  };

  const handleCardClick = (tone: GeneratedTone) => {
    if (sessionActive) {
      playMusic(tone.style, tone.name);
      onClose();
    } else {
      toast.error('Please start a session first');
    }
  };

  const styleConfig = {
    calm: { color: 'from-blue-400 to-purple-500', border: 'border-purple-300' },
    happy: { color: 'from-yellow-400 to-pink-500', border: 'border-pink-300' },
    energetic: { color: 'from-red-400 to-orange-500', border: 'border-orange-300' }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Music className="h-6 w-6" />
              Generated Tones
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-8rem)]">
            {generatedTones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedTones.map((tone, index) => (
                  <div
                    key={index}
                    onClick={() => handleCardClick(tone)}
                    className={`
                      relative p-5 rounded-xl cursor-pointer
                      bg-gradient-to-br ${styleConfig[tone.style]?.color}
                      ${styleConfig[tone.style]?.border}
                      border-2 shadow-lg
                      hover:shadow-xl hover:scale-105
                      transition-all duration-200
                      ${sessionActive ? '' : 'opacity-60 cursor-not-allowed'}
                    `}
                    title={sessionActive ? "Click to play" : "Start session to play"}
                  >
                    {/* Delete Button */}
                    <button
                      className="absolute top-3 right-3 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(tone.name);
                      }}
                      title="Delete tone"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>

                    {/* Card Content */}
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-2 pr-8">
                        {tone.name}
                      </h3>

                      <div className="space-y-2 text-sm text-white/90">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <span>Style: {tone.style}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {tone.duration}s</span>
                        </div>

                        {tone.tempo && (
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span>{tone.tempo} BPM</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/75">
                        Created: {formatDate(tone.created)} at {formatTime(tone.created)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Music className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  No generated tones yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Use the "Generate New" button to create custom tones
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Delete Tone</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deleteConfirm}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
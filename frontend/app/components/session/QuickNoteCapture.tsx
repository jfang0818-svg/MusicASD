/**
 * Quick Note Capture Component
 *
 * Allows therapists to quickly record observations, breakthroughs, and challenges
 * during therapy sessions without interrupting the flow.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  StickyNote,
  Sparkles,
  AlertCircle,
  Eye,
  Lightbulb,
  MessageCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickNoteCaptureProps {
  sessionId: string;
  childId: string;
  onNoteSaved?: () => void;
  currentContext?: {
    musicStyle?: string;
    engagementLevel?: string;
    sessionPhase?: string;
    timeElapsed?: number;
  };
}

type NoteType = 'observation' | 'breakthrough' | 'challenge' | 'safety' | 'strategy' | 'response';

const NOTE_TYPES = [
  { id: 'observation', label: 'Observation', icon: Eye, color: 'blue', description: 'General note' },
  { id: 'breakthrough', label: 'Breakthrough', icon: Sparkles, color: 'green', description: 'Positive milestone' },
  { id: 'challenge', label: 'Challenge', icon: AlertCircle, color: 'orange', description: 'Difficulty encountered' },
  { id: 'safety', label: 'Safety', icon: AlertCircle, color: 'red', description: 'Safety concern' },
  { id: 'strategy', label: 'Strategy', icon: Lightbulb, color: 'purple', description: 'Intervention used' },
  { id: 'response', label: 'Response', icon: MessageCircle, color: 'pink', description: 'Child responded' },
];

const COLOR_CLASSES = {
  blue: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
  green: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
  orange: 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300',
  red: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300',
  purple: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
  pink: 'bg-pink-100 hover:bg-pink-200 text-pink-700 border-pink-300',
};

export default function QuickNoteCapture({
  sessionId,
  childId,
  onNoteSaved,
  currentContext
}: QuickNoteCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<NoteType>('observation');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter note content');
      return;
    }

    setIsSaving(true);
    try {
      const { createSessionNote } = await import('@/app/lib/api');

      await createSessionNote({
        session_id: sessionId,
        child_id: childId,
        note_type: selectedType,
        content: noteContent.trim(),
        session_time_elapsed: currentContext?.timeElapsed,
        music_style: currentContext?.musicStyle,
        engagement_level: currentContext?.engagementLevel,
        session_phase: currentContext?.sessionPhase,
        tags: []
      });

      toast.success('Note saved! 📝');
      setNoteContent('');
      setIsOpen(false);
      onNoteSaved?.();
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNoteType = NOTE_TYPES.find(nt => nt.id === selectedType);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-yellow-600" />
          <h3 className="font-bold text-gray-900 dark:text-white">
            Quick Notes
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors"
        >
          {isOpen ? 'Close' : '+ Add Note'}
        </button>
      </div>

      {/* Note Capture Form */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Note Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Note Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id as NoteType)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? COLOR_CLASSES[type.color as keyof typeof COLOR_CLASSES]
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
            {selectedNoteType && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedNoteType.description}
              </p>
            )}
          </div>

          {/* Note Content */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Note Content
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={`Record ${selectedType}...`}
              maxLength={1000}
              rows={4}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-800 transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {noteContent.length} / 1000 characters
              </p>
              {currentContext && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentContext.musicStyle && `🎵 ${currentContext.musicStyle}`}
                  {currentContext.engagementLevel && ` • ${currentContext.engagementLevel}`}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveNote}
              disabled={isSaving || !noteContent.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <StickyNote className="h-4 w-4" />
                  Save Note
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setNoteContent('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Info */}
      {!isOpen && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Capture observations, breakthroughs, and challenges in real-time
        </p>
      )}
    </div>
  );
}

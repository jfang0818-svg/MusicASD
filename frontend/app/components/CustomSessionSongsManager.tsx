'use client';

import { useState } from 'react';
import { Music, Upload, Sparkles, Trash2, Play, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AIMusicGenerationModal from './AIMusicGenerationModal';

interface CustomSessionSongsManagerProps {
  childId: string;
  childName: string;
  customHelloSong?: string | null;
  customGoodbyeSong?: string | null;
  onUpdate: (updates: { custom_hello_song?: string; custom_goodbye_song?: string }) => Promise<void>;
  onUpload: (file: File, style: 'happy' | 'calm') => Promise<void>;
}

export default function CustomSessionSongsManager({
  childId,
  childName,
  customHelloSong,
  customGoodbyeSong,
  onUpdate,
  onUpload
}: CustomSessionSongsManagerProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<'hello' | 'goodbye' | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'hello' | 'goodbye') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setUploading(true);
    try {
      const style = type === 'hello' ? 'happy' : 'calm';
      await onUpload(file, style);

      // Update profile with new custom song
      const updates = type === 'hello'
        ? { custom_hello_song: file.name }
        : { custom_goodbye_song: file.name };

      await onUpdate(updates);
      toast.success(`Custom ${type} song uploaded!`);
    } catch (error) {
      toast.error(`Failed to upload ${type} song`);
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = (type: 'hello' | 'goodbye') => {
    setGeneratingFor(type);
    setShowAIModal(true);
  };

  const handleAIGenerationComplete = async (filename: string) => {
    if (!generatingFor) return;

    try {
      const updates = generatingFor === 'hello'
        ? { custom_hello_song: filename }
        : { custom_goodbye_song: filename };

      await onUpdate(updates);
      toast.success(`Custom ${generatingFor} song set!`);
      setShowAIModal(false);
      setGeneratingFor(null);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleRemove = async (type: 'hello' | 'goodbye') => {
    try {
      const updates = type === 'hello'
        ? { custom_hello_song: '' }
        : { custom_goodbye_song: '' };

      await onUpdate(updates);
      toast.success(`Custom ${type} song removed`);
    } catch (error) {
      toast.error('Failed to remove song');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Music className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Custom Session Songs
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personalize hello and goodbye songs for {childName}'s structured sessions
          </p>
        </div>
      </div>

      {/* Hello Song */}
      <SongCard
        title="Hello Song"
        description="Played at the start of structured sessions (2 min)"
        icon="👋"
        color="green"
        currentSong={customHelloSong}
        onUpload={(e) => handleFileUpload(e, 'hello')}
        onAIGenerate={() => handleAIGenerate('hello')}
        onRemove={() => handleRemove('hello')}
        uploading={uploading}
      />

      {/* Goodbye Song */}
      <SongCard
        title="Goodbye Song"
        description="Played at the end of structured sessions (2 min)"
        icon="🌙"
        color="orange"
        currentSong={customGoodbyeSong}
        onUpload={(e) => handleFileUpload(e, 'goodbye')}
        onAIGenerate={() => handleAIGenerate('goodbye')}
        onRemove={() => handleRemove('goodbye')}
        uploading={uploading}
      />

      {/* AI Generation Modal */}
      {showAIModal && generatingFor && (
        <AIMusicGenerationModal
          isOpen={showAIModal}
          onClose={() => {
            setShowAIModal(false);
            setGeneratingFor(null);
          }}
          childId={childId}
          userId=""
          onGenerated={handleAIGenerationComplete}
          defaultStyle={generatingFor === 'hello' ? 'happy' : 'calm'}
          defaultDuration={120} // 2 minutes for session songs
          suggestedPrompt={
            generatingFor === 'hello'
              ? `Welcoming ${childName} - uplifting, greeting song`
              : `Goodbye song for ${childName} - calming, closure`
          }
        />
      )}
    </div>
  );
}

// Song Card Component
function SongCard({
  title,
  description,
  icon,
  color,
  currentSong,
  onUpload,
  onAIGenerate,
  onRemove,
  uploading
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  currentSong?: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAIGenerate: () => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 p-5 ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>

      {/* Current Song Display */}
      {currentSong ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {currentSong}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Custom song active</p>
              </div>
            </div>
            <button
              onClick={onRemove}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
              title="Remove custom song"
            >
              <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No custom song set - using random {title === 'Hello Song' ? 'happy' : 'calm'} music
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            onChange={onUpload}
            className="hidden"
            disabled={uploading}
          />
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-colors">
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploading...
                </span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upload File
                </span>
              </>
            )}
          </div>
        </label>

        <button
          onClick={onAIGenerate}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI Generate</span>
        </button>
      </div>
    </motion.div>
  );
}

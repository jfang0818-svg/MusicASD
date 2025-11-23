'use client';

import { Music, Volume2, Play, Square, FileAudio, Sparkles } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import type { MusicLibrary, GeneratedTone, MusicStyle } from '@/app/types';

interface MusicControlsProps {
  sessionActive: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  selectedStyle: MusicStyle;
  playMusic: (style: MusicStyle, file?: string) => void;
  stopMusic: () => void;
  musicPlaying: boolean;
  currentMusic: string | null;
  loading: boolean;
  musicLibrary: MusicLibrary;
  generatedTones: GeneratedTone[];
  loadMusicLibrary: () => void;
  loadGeneratedTones: () => void;
  setShowMusicModal: (show: boolean) => void;
  setShowGeneratedModal: (show: boolean) => void;
  setShowGenerateModal: (show: boolean) => void;
}

export function MusicControls({
  sessionActive,
  volume,
  setVolume,
  selectedStyle,
  playMusic,
  stopMusic,
  musicPlaying,
  currentMusic,
  loading,
  musicLibrary,
  generatedTones,
  loadMusicLibrary,
  loadGeneratedTones,
  setShowMusicModal,
  setShowGeneratedModal,
  setShowGenerateModal
}: MusicControlsProps) {
  const totalFiles = Object.values(musicLibrary).reduce((sum, files) => sum + files.length, 0);

  const styles: { value: MusicStyle; label: string; emoji: string; color: string }[] = [
    { value: 'calming_regulation', label: 'Calming', emoji: '😌', color: 'bg-blue-500' },
    { value: 'focus_attention', label: 'Focus', emoji: '🎯', color: 'bg-purple-500' },
    { value: 'social_interactive', label: 'Social', emoji: '👥', color: 'bg-green-500' },
    { value: 'movement_motor', label: 'Movement', emoji: '🏃', color: 'bg-orange-500' },
    { value: 'sensory_seeking', label: 'Seeking', emoji: '⚡', color: 'bg-yellow-500' },
    { value: 'sensory_soothing', label: 'Soothing', emoji: '🌊', color: 'bg-teal-500' },
    { value: 'sleep_rest', label: 'Sleep', emoji: '😴', color: 'bg-indigo-500' },
    { value: 'transition', label: 'Transition', emoji: '🔄', color: 'bg-pink-500' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Music className="h-5 w-5" />
        Music Controls
      </h2>

      {/* Volume Control */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <label className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Volume: {Math.round(volume * 100)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1"
            style={{ '--value': `${volume * 100}%` } as React.CSSProperties}
          />
        </label>
      </div>

      {/* Quick Play Buttons */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Quick Play
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {styles.map((style) => (
            <button
              key={style.value}
              onClick={() => playMusic(style.value)}
              disabled={!sessionActive || loading}
              className={cn(
                'py-3 px-4 rounded-lg transition-all duration-200',
                'flex flex-col items-center justify-center gap-1',
                'text-white font-medium',
                style.color,
                'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span className="text-2xl">{style.emoji}</span>
              <span className="text-sm">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex justify-center">
        {musicPlaying ? (
          <button
            onClick={stopMusic}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <Square className="h-5 w-5" />
            Stop Music
          </button>
        ) : (
          <button
            onClick={() => playMusic(selectedStyle)}
            disabled={!sessionActive || loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            Play {selectedStyle}
          </button>
        )}
      </div>

      {currentMusic && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          🎵 Now playing: {currentMusic}
        </p>
      )}

      {/* Library Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            loadMusicLibrary();
            setShowMusicModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <FileAudio className="h-4 w-4" />
          <span>Audio Files ({totalFiles})</span>
        </button>

        <button
          onClick={() => {
            loadGeneratedTones();
            setShowGeneratedModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Music className="h-4 w-4" />
          <span>Generated ({generatedTones.length})</span>
        </button>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Sparkles className="h-4 w-4" />
          <span>Generate New</span>
        </button>
      </div>
    </div>
  );
}
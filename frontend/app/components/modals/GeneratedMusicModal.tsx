'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMusicStore } from '@/app/store/useMusicStore';
import type { ModalProps, MusicStyle } from '@/app/types';

interface GenerateMusicModalProps extends ModalProps {
  loadMusicLibrary: () => void;
  loadGeneratedTones: () => void;
}

export function GenerateMusicModal({
  show,
  onClose,
  loadMusicLibrary,
  loadGeneratedTones
}: GenerateMusicModalProps) {
  const { generateNewMusic } = useMusicStore();
  const [loading, setLoading] = useState(false);
  const [generateOptions, setGenerateOptions] = useState({
    style: 'calming_regulation' as MusicStyle,
    duration: 10,
    filename: 'custom_tone',
    tempo: 120,
    key: 'C'
  });

  if (!show) return null;

  const handleGenerate = async () => {
    if (!generateOptions.filename.trim()) {
      toast.error('Please enter a filename');
      return;
    }

    setLoading(true);
    try {
      await generateNewMusic(generateOptions);
      toast.success(`Successfully generated: ${generateOptions.filename}`);

      // Reload data and close modal
      setTimeout(() => {
        onClose();
        loadMusicLibrary();
        loadGeneratedTones();
      }, 1500);
    } catch (error) {
      console.error('Error generating music:', error);
      toast.error('Failed to generate music');
    } finally {
      setLoading(false);
    }
  };

  const musicalKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Generate New Music
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Style Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Music Style
            </label>
            <select
              value={generateOptions.style}
              onChange={(e) => setGenerateOptions({
                ...generateOptions,
                style: e.target.value as 'calm' | 'happy' | 'energetic'
              })}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-700"
            >
              <option value="calm">😌 Calm</option>
              <option value="happy">😊 Happy</option>
              <option value="energetic">🎉 Energetic</option>
            </select>
          </div>

          {/* Duration Slider */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Duration: {generateOptions.duration} seconds
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={generateOptions.duration}
              onChange={(e) => setGenerateOptions({
                ...generateOptions,
                duration: parseInt(e.target.value)
              })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>5s</span>
              <span>15s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Filename Input */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              File Name
            </label>
            <input
              type="text"
              value={generateOptions.filename}
              onChange={(e) => setGenerateOptions({
                ...generateOptions,
                filename: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')
              })}
              placeholder="Enter filename"
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Letters, numbers, underscore, and dash only
            </p>
          </div>

          {/* Tempo Slider */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tempo: {generateOptions.tempo} BPM
            </label>
            <input
              type="range"
              min="60"
              max="180"
              step="10"
              value={generateOptions.tempo}
              onChange={(e) => setGenerateOptions({
                ...generateOptions,
                tempo: parseInt(e.target.value)
              })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Slow</span>
              <span>Medium</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Musical Key */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Musical Key
            </label>
            <select
              value={generateOptions.key}
              onChange={(e) => setGenerateOptions({
                ...generateOptions,
                key: e.target.value
              })}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-700"
            >
              {musicalKeys.map(key => (
                <option key={key} value={key}>{key} Major</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !generateOptions.filename}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
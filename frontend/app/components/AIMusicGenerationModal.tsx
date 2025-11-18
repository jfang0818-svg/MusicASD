'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, Clock, TrendingUp, Key, Palette, Layers, Play, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AIMusicGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId?: string;
  onMusicGenerated?: (audioUrl: string, metadata: any) => void;
}

export default function AIMusicGenerationModal({
  isOpen,
  onClose,
  childId,
  onMusicGenerated
}: AIMusicGenerationModalProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<any | null>(null);

  // Music parameters
  const [style, setStyle] = useState<'calm' | 'happy' | 'energetic'>('calm');
  const [duration, setDuration] = useState(60);
  const [tempo, setTempo] = useState(120);
  const [musicalKey, setMusicalKey] = useState('C');
  const [mood, setMood] = useState('peaceful');
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex'>('simple');

  const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#'];
  const moods = ['peaceful', 'joyful', 'energetic', 'calm', 'playful', 'soothing'];

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const response = await axios.post('http://localhost:8000/music/generate', {
        style,
        duration,
        tempo,
        key: musicalKey,
        use_ai: true,
        child_id: childId,
        mood,
        complexity
      });

      setGeneratedMusic(response.data);
      toast.success('AI music generated successfully!');

      if (onMusicGenerated) {
        onMusicGenerated(response.data.path, response.data);
      }
    } catch (error: any) {
      console.error('Failed to generate music:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate music');
    } finally {
      setGenerating(false);
    }
  };

  const handlePlayPreview = () => {
    if (generatedMusic?.path) {
      // TODO: Implement audio preview playback
      toast('Preview playback not yet implemented', { icon: 'ℹ️' });
    }
  };

  const handleDownload = () => {
    if (generatedMusic?.path) {
      // Create download link
      const link = document.createElement('a');
      link.href = `http://localhost:8000/${generatedMusic.path}`;
      link.download = generatedMusic.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-6 rounded-t-2xl text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-8 w-8" />
                <h2 className="text-2xl font-bold">AI Music Generation</h2>
              </div>
              <p className="text-white/90 text-sm">
                Create personalized therapeutic music with GPT-4
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Style Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Music Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['calm', 'happy', 'energetic'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        style === s
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Music className={`h-6 w-6 mx-auto mb-2 ${
                        style === s ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <p className={`font-semibold capitalize ${
                        style === s ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {s}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration: {duration} seconds
                </label>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>30s</span>
                  <span>5 min</span>
                </div>
              </div>

              {/* Tempo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tempo: {tempo} BPM
                </label>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="10"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Slow (60)</span>
                  <span>Fast (180)</span>
                </div>
              </div>

              {/* Musical Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Musical Key
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {keys.map((k) => (
                    <button
                      key={k}
                      onClick={() => setMusicalKey(k)}
                      className={`p-2 rounded-lg border transition-all ${
                        musicalKey === k
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 font-bold'
                          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 capitalize"
                >
                  {moods.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Complexity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Complexity
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['simple', 'moderate', 'complex'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setComplexity(c)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        complexity === c
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-semibold capitalize text-sm ${
                        complexity === c ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {c}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Child Personalization */}
              {childId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <Sparkles className="h-4 w-4 inline mr-2" />
                    Music will be personalized based on child's profile and preferences
                  </p>
                </div>
              )}

              {/* Generated Music Preview */}
              {generatedMusic && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800"
                >
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Music Generated Successfully!
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm text-green-800 dark:text-green-200 mb-4">
                    <div>
                      <span className="opacity-70">Filename:</span>
                      <p className="font-mono text-xs">{generatedMusic.filename}</p>
                    </div>
                    <div>
                      <span className="opacity-70">Notes:</span>
                      <p className="font-semibold">{generatedMusic.notes_count}</p>
                    </div>
                    <div>
                      <span className="opacity-70">Synthesizer:</span>
                      <p className="font-semibold capitalize">{generatedMusic.synthesizer}</p>
                    </div>
                    <div>
                      <span className="opacity-70">AI Generated:</span>
                      <p className="font-semibold">{generatedMusic.ai_generated ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handlePlayPreview}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-green-600 text-green-900 dark:text-green-100 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-colors"
                  disabled={generating}
                >
                  Close
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Music...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate AI Music
                    </>
                  )}
                </button>
              </div>

              {/* Info */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Generation may take 10-30 seconds depending on duration and complexity
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

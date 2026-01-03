'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, Clock, TrendingUp, Key, Palette, Layers, Play, Download, Pause, Trash2, Edit2, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { MusicStyle } from '@/app/types';
import { useMusicGeneration } from '../contexts/MusicGenerationContext';

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
  const { startGeneration, tasks, isGenerating: globalGenerating } = useMusicGeneration();
  const [generating, setGenerating] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<any | null>(null);
  const [asyncMode, setAsyncMode] = useState(true); // Default to async mode

  // Generation method
  const [generationMethod, setGenerationMethod] = useState<'musicgen' | 'gpt-midi' | 'simple'>('musicgen');

  // Music parameters
  const [style, setStyle] = useState<MusicStyle>('calming_regulation');
  const [duration, setDuration] = useState(60);
  const [tempo, setTempo] = useState(120);
  const [musicalKey, setMusicalKey] = useState('C');
  const [mood, setMood] = useState('peaceful');
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex'>('simple');

  // Preview and rename features
  const [customFilename, setCustomFilename] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Child personalization toggle
  const [usePersonalization, setUsePersonalization] = useState(true);

  const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#'];
  const moods = ['peaceful', 'joyful', 'energetic', 'calm', 'playful', 'soothing'];

  // Set initial filename when music is generated
  useEffect(() => {
    if (generatedMusic?.filename) {
      setCustomFilename(generatedMusic.filename.replace('.wav', ''));
      setIsEditing(false);
    }
  }, [generatedMusic]);

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isOpen && audioElement) {
      audioElement.pause();
      setAudioElement(null);
      setIsPlaying(false);
    }
  }, [isOpen, audioElement]);

  // Watch for completed tasks and update generatedMusic
  useEffect(() => {
    const completedTask = tasks.find(t => t.status === 'completed' && t.result && !generatedMusic);
    if (completedTask && completedTask.result) {
      setGeneratedMusic(completedTask.result);
      if (onMusicGenerated) {
        onMusicGenerated(completedTask.result.path, completedTask.result);
      }
    }
  }, [tasks, generatedMusic, onMusicGenerated]);

  const handleGenerate = async () => {
    // Map generation method to backend parameters
    const getGenerationParams = () => {
      switch(generationMethod) {
        case 'musicgen':
          return { use_musicgen: true, use_ai: false };
        case 'gpt-midi':
          return { use_musicgen: false, use_ai: true };
        case 'simple':
          return { use_musicgen: false, use_ai: false };
      }
    };

    const params = {
      style,
      duration,
      tempo,
      key: musicalKey,
      ...getGenerationParams(),
      child_id: (usePersonalization && childId) ? childId : undefined,
      mood,
      complexity
    };

    // Async mode - start generation in background and close modal
    if (asyncMode && generationMethod === 'musicgen') {
      const taskId = await startGeneration(params);
      if (taskId) {
        onClose(); // Close modal - user can continue using app
      }
      return;
    }

    // Sync mode - wait for generation to complete
    setGenerating(true);

    try {
      const response = await axios.post('http://localhost:8000/music/generate', params);

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
      if (audioElement) {
        // Toggle play/pause
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          audioElement.play();
          setIsPlaying(true);
        }
      } else {
        // Create new audio element
        const audio = new Audio(`http://localhost:8000/${generatedMusic.path}`);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          toast.error('Failed to load audio');
          setIsPlaying(false);
        };
        audio.play();
        setAudioElement(audio);
        setIsPlaying(true);
        toast.success('Playing preview...');
      }
    }
  };

  const handleDownload = () => {
    if (generatedMusic?.path) {
      // Create download link with custom filename
      const link = document.createElement('a');
      link.href = `http://localhost:8000/${generatedMusic.path}`;
      link.download = `${customFilename}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    }
  };

  const handleDelete = () => {
    if (!generatedMusic) return;

    // Stop and cleanup audio
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
      setIsPlaying(false);
    }

    // Clear generated music state
    setGeneratedMusic(null);
    setCustomFilename('');
    toast.success('Music deleted. You can generate a new one.');
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
                Create personalized therapeutic music with AI
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Generation Method Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generation Method
                </label>
                <select
                  value={generationMethod}
                  onChange={(e) => setGenerationMethod(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                >
                  <option value="musicgen">🎵 AI Music (MusicGen) - Recommended</option>
                  <option value="gpt-midi">🎹 AI Music (GPT + MIDI) - Experimental</option>
                  <option value="simple">🔊 Simple Tones - Fast</option>
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {generationMethod === 'musicgen' && '✨ High quality AI-generated music, personalized to child profile'}
                  {generationMethod === 'gpt-midi' && '🧪 GPT-4 generates MIDI composition, then synthesizes audio'}
                  {generationMethod === 'simple' && '⚡ Quick sine wave generation for testing'}
                </p>
              </div>

              {/* Background Generation Toggle - Only for MusicGen */}
              {generationMethod === 'musicgen' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-green-900 dark:text-green-100 mb-1 flex items-center gap-2">
                        <Loader2 className="h-4 w-4" />
                        Background Generation
                      </label>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {asyncMode
                          ? '🚀 Generate in background - close modal and continue using the app'
                          : '⏳ Wait for generation to complete before closing'}
                      </p>
                    </div>
                    <button
                      onClick={() => setAsyncMode(!asyncMode)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        asyncMode ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={asyncMode}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                          asyncMode ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Active Generation Tasks */}
              {tasks.filter(t => t.status === 'pending' || t.status === 'running').length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating in Background...
                  </h4>
                  {tasks.filter(t => t.status === 'pending' || t.status === 'running').map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <p className="text-amber-800 dark:text-amber-200 capitalize">
                          {task.params.style} - {task.params.duration}s
                        </p>
                        <div className="mt-1 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400">{task.progress}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Child Personalization Toggle */}
              {childId && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Personalization Mode
                      </label>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {usePersonalization
                          ? '🎯 Music will be tailored to child\'s sensory profile and preferences'
                          : '🌐 Generic therapeutic music without child-specific personalization'}
                      </p>
                    </div>
                    <button
                      onClick={() => setUsePersonalization(!usePersonalization)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        usePersonalization ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={usePersonalization}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                          usePersonalization ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${!usePersonalization ? 'text-blue-900 dark:text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                      Generic
                    </span>
                    <div className="flex-1 h-px bg-blue-300 dark:bg-blue-700" />
                    <span className={`font-semibold ${usePersonalization ? 'text-blue-900 dark:text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                      Personalized
                    </span>
                  </div>
                </div>
              )}

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Music Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['calming_regulation', 'focus_attention', 'social_interactive', 'movement_motor', 'sensory_seeking', 'sensory_soothing', 'sleep_rest', 'transition'] as const).map((s) => (
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

                  {/* Editable Filename */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-green-800 dark:text-green-200 mb-1.5 flex items-center gap-1.5">
                      <Edit2 className="h-3 w-3" />
                      Filename
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30 transition-all outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        placeholder="Enter filename"
                      />
                      <span className="flex items-center text-green-800 dark:text-green-200 font-mono text-sm">.wav</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-green-800 dark:text-green-200 mb-4">
                    <div>
                      <span className="opacity-70">Duration:</span>
                      <p className="font-semibold">{generatedMusic.duration}s</p>
                    </div>
                    <div>
                      <span className="opacity-70">Style:</span>
                      <p className="font-semibold capitalize">{generatedMusic.style}</p>
                    </div>
                    {generatedMusic.notes_count && (
                      <div>
                        <span className="opacity-70">Notes:</span>
                        <p className="font-semibold">{generatedMusic.notes_count}</p>
                      </div>
                    )}
                    {generatedMusic.model && (
                      <div>
                        <span className="opacity-70">Model:</span>
                        <p className="font-semibold">{generatedMusic.model}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePlayPreview}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Play Preview
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-green-600 text-green-900 dark:text-green-100 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
                      title="Delete and regenerate"
                    >
                      <Trash2 className="h-4 w-4" />
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
                  ) : asyncMode && generationMethod === 'musicgen' ? (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Start Generation & Close
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
                {generationMethod === 'musicgen' && 'First generation downloads model (~300MB), then takes 30-60s. Subsequent generations are faster.'}
                {generationMethod === 'gpt-midi' && 'Generation may take 10-30 seconds depending on duration and complexity.'}
                {generationMethod === 'simple' && 'Generation is instant (< 1 second).'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

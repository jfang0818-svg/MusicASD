'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Sliders, Save } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getAmbientEnvironments,
  startAmbientMusic,
  updateAmbientParameters,
  stopAmbientMusic,
  saveAmbientPreset
} from '@/app/lib/api';
import type { AmbientEnvironment } from '@/app/types';

interface AmbientMusicPlayerProps {
  childId: string;
  sessionId?: string;
  onStop?: (summary: any) => void;
}

type PlayerState = 'selection' | 'playing' | 'stopped';

export default function AmbientMusicPlayer({ childId, sessionId, onStop }: AmbientMusicPlayerProps) {
  const [playerState, setPlayerState] = useState<PlayerState>('selection');
  const [ambientId, setAmbientId] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('ocean');
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Parameters
  const [density, setDensity] = useState<number>(0.5);
  const [brightness, setBrightness] = useState<number>(0.6);
  const [movement, setMovement] = useState<number>(0.7);
  const [baseFrequency, setBaseFrequency] = useState<number>(150);

  const { data: environmentsData } = useQuery({
    queryKey: ['ambientEnvironments'],
    queryFn: getAmbientEnvironments
  });

  const environments = environmentsData?.environments || {};

  const startMutation = useMutation({
    mutationFn: startAmbientMusic,
    onSuccess: (data) => {
      setAmbientId(data.ambient_id);
      setPlayerState('playing');
      setStartTime(new Date());

      // Set initial parameters from environment
      const params = data.parameters;
      setDensity(params.density);
      setBrightness(params.brightness);
      setMovement(params.movement);
      setBaseFrequency(params.base_frequency);

      toast.success('Ambient music started', { icon: '🎵' });
    }
  });

  const updateParamsMutation = useMutation({
    mutationFn: updateAmbientParameters,
    onSuccess: () => {
      console.log('Parameters updated');
    }
  });

  const stopMutation = useMutation({
    mutationFn: stopAmbientMusic,
    onSuccess: (data) => {
      setPlayerState('stopped');
      if (onStop) {
        onStop(data);
      }
      toast.success('Session complete', { icon: '✅' });
    }
  });

  const savePresetMutation = useMutation({
    mutationFn: saveAmbientPreset,
    onSuccess: () => {
      toast.success('Preset saved!', { icon: '💾' });
    }
  });

  const handleStart = () => {
    startMutation.mutate({
      child_id: childId,
      session_id: sessionId,
      environment: selectedEnvironment,
      duration_minutes: 10
    });
  };

  const handleStop = () => {
    const duration = startTime ? (Date.now() - startTime.getTime()) / 1000 / 60 : 0;

    stopMutation.mutate({
      ambient_id: ambientId,
      child_id: childId,
      regulation_effect: 'calming',
      effectiveness: 4,
      notes: 'Ambient music session completed'
    });
  };

  const handleParameterChange = (param: string, value: number) => {
    const params: any = { [param]: value };

    switch (param) {
      case 'density':
        setDensity(value);
        break;
      case 'brightness':
        setBrightness(value);
        break;
      case 'movement':
        setMovement(value);
        break;
      case 'base_frequency':
        setBaseFrequency(value);
        break;
    }

    if (playerState === 'playing' && ambientId) {
      updateParamsMutation.mutate({
        ambient_id: ambientId,
        child_id: childId,
        parameters: params
      });
    }
  };

  const handleSavePreset = () => {
    savePresetMutation.mutate({
      child_id: childId,
      preset_name: `My ${selectedEnvironment} preset`,
      environment_base: selectedEnvironment,
      custom_parameters: {
        density,
        brightness,
        movement,
        base_frequency: baseFrequency
      }
    });
  };

  const environmentIcons: { [key: string]: string } = {
    rainforest: '🌴',
    ocean: '🌊',
    space: '🌌',
    garden: '🌺',
    fireplace: '🔥',
    cave: '⛰️'
  };

  if (playerState === 'selection') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Ambient Soundscapes</h2>
          <p className="text-gray-600">Choose a calming environment for regulation and relaxation</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(environments).map(([key, env]: [string, any]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedEnvironment(key)}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedEnvironment === key
                  ? 'border-purple-500 bg-white shadow-lg'
                  : 'border-transparent bg-white/50 hover:bg-white'
              }`}
            >
              <div className="text-5xl mb-3">{environmentIcons[key] || '🎵'}</div>
              <div className="font-semibold text-gray-800 mb-1">{env.name}</div>
              <div className="text-sm text-gray-600">{env.description}</div>
            </motion.button>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {startMutation.isPending ? 'Starting...' : 'Start Soundscape'}
        </button>
      </div>
    );
  }

  if (playerState === 'playing') {
    const envData = environments[selectedEnvironment];

    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="text-7xl mb-4"
          >
            {environmentIcons[selectedEnvironment] || '🎵'}
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{envData?.name}</h2>
          <p className="text-gray-600">{envData?.description}</p>
        </div>

        {/* Visualizer */}
        <div className="bg-white/50 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center gap-2 h-32">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [1, Math.random() * 2 + 0.5, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: Math.random() * 2 + 1,
                  ease: 'easeInOut'
                }}
                className="w-2 bg-gradient-to-t from-purple-400 to-blue-400 rounded-full"
                style={{ height: '100%' }}
              />
            ))}
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="bg-white rounded-lg p-6 mb-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Adjust Soundscape</h3>
          </div>

          {/* Density */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Density</label>
              <span className="text-sm text-gray-600">{Math.round(density * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={density}
              onChange={(e) => handleParameterChange('density', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">How many sound layers are active</p>
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Brightness</label>
              <span className="text-sm text-gray-600">{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={brightness}
              onChange={(e) => handleParameterChange('brightness', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">Higher frequencies and tones</p>
          </div>

          {/* Movement */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Movement</label>
              <span className="text-sm text-gray-600">{Math.round(movement * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={movement}
              onChange={(e) => handleParameterChange('movement', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">How much sounds change over time</p>
          </div>

          {/* Base Frequency */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Base Tone</label>
              <span className="text-sm text-gray-600">{baseFrequency} Hz</span>
            </div>
            <input
              type="range"
              min="50"
              max="400"
              step="10"
              value={baseFrequency}
              onChange={(e) => handleParameterChange('base_frequency', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">Lower = deeper, higher = brighter</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={handleSavePreset}
            disabled={savePresetMutation.isPending}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Preset
          </button>
          <button
            onClick={handleStop}
            disabled={stopMutation.isPending}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto text-center">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete</h2>
      <p className="text-gray-600">The ambient soundscape session has ended.</p>
    </div>
  );
}

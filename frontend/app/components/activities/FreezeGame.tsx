'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tantml:react-query';
import { startFreezeGame, recordFreezeRound, endFreezeGame } from '@/app/lib/api';
import { Play, Square, Check, X, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { MusicStyle } from '@/app/types';

interface FreezeGameProps {
  sessionId: string;
  childId: string;
  onComplete?: (summary: any) => void;
  onPlayMusic: (style: MusicStyle) => void;
  onStopMusic: () => void;
}

type GameState = 'setup' | 'playing' | 'frozen' | 'round_result' | 'summary';

export default function FreezeGame({
  sessionId,
  childId,
  onComplete,
  onPlayMusic,
  onStopMusic
}: FreezeGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameId, setGameId] = useState<string | null>(null);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('movement_motor');
  const [rounds, setRounds] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [musicDuration, setMusicDuration] = useState(0);
  const gameStartTime = useRef<number>(0);

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: () => startFreezeGame({
      session_id: sessionId,
      child_id: childId,
      music_style: musicStyle
    }),
    onSuccess: (data) => {
      setGameId(data.game_id);
      gameStartTime.current = Date.now();
      toast.success('Freeze Game Started! 🎵');
    },
    onError: () => {
      toast.error('Failed to start game');
    }
  });

  // Record round mutation
  const recordRoundMutation = useMutation({
    mutationFn: (data: {
      child_froze: boolean;
      music_duration: number;
      reaction_time?: number;
    }) => recordFreezeRound({
      game_id: gameId!,
      session_id: sessionId,
      ...data
    }),
  });

  // End game mutation
  const endGameMutation = useMutation({
    mutationFn: () => {
      const totalDuration = (Date.now() - gameStartTime.current) / 1000;
      return endFreezeGame({
        game_id: gameId!,
        session_id: sessionId,
        child_id: childId,
        total_rounds: rounds.length,
        successful_freezes: successCount,
        total_duration: totalDuration,
        overall_engagement: successCount / rounds.length > 0.7 ? 'high' :
                           successCount / rounds.length > 0.4 ? 'moderate' : 'low'
      });
    },
    onSuccess: (data) => {
      toast.success('Game completed!');
      onComplete?.(data.summary);
    }
  });

  const handleStart = () => {
    startGameMutation.mutate();
    startRound();
  };

  const startRound = () => {
    setGameState('playing');
    setRoundStartTime(Date.now());
    setMusicDuration(0);
    onPlayMusic(musicStyle);

    // Random duration between 8-20 seconds
    const duration = 8000 + Math.random() * 12000;

    setTimeout(() => {
      setMusicDuration(duration / 1000);
      onStopMusic();
      setGameState('frozen');
    }, duration);
  };

  const handleFreezeResponse = (didFreeze: boolean) => {
    if (!roundStartTime) return;

    const reactionTime = didFreeze ? (Date.now() - roundStartTime - musicDuration * 1000) / 1000 : null;

    const newRound = {
      music_duration: musicDuration,
      child_froze: didFreeze,
      reaction_time: reactionTime
    };

    setRounds([...rounds, newRound]);
    setCurrentRound(currentRound + 1);
    if (didFreeze) {
      setSuccessCount(successCount + 1);
    }

    recordRoundMutation.mutate(newRound);

    setGameState('round_result');

    // Auto-advance after showing result
    setTimeout(() => {
      setGameState('playing');
      if (rounds.length + 1 < 10) {  // Max 10 rounds
        startRound();
      } else {
        setGameState('summary');
      }
    }, 1500);
  };

  const handleEndGame = () => {
    setGameState('summary');
    endGameMutation.mutate();
  };

  const handleRestart = () => {
    setGameState('setup');
    setGameId(null);
    setRounds([]);
    setCurrentRound(0);
    setSuccessCount(0);
    setRoundStartTime(null);
    setMusicDuration(0);
  };

  const successRate = rounds.length > 0 ? (successCount / rounds.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 shadow-lg">

        {/* Setup State */}
        {gameState === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl mb-4">🎵 ❄️</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Musical Freeze Dance!</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Dance while the music plays, freeze when it stops!
            </p>

            {/* Music Style Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Music Style:</label>
              <div className="flex gap-3 justify-center">
                {(['calm', 'happy', 'energetic'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMusicStyle(style)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${musicStyle === style
                        ? 'bg-primary text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {style === 'calm' && '😌 Calm'}
                    {style === 'happy' && '😊 Happy'}
                    {style === 'energetic' && '⚡ Energetic'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={startGameMutation.isPending}
              className="px-8 py-4 bg-primary text-white rounded-full text-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
          </motion.div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-8xl animate-bounce">🎵</div>
            <h3 className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              DANCE!
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Move to the music...
            </p>
            <div className="text-sm text-gray-500">Round {currentRound + 1}</div>
          </motion.div>
        )}

        {/* Frozen State */}
        {gameState === 'frozen' && (
          <motion.div
            key="frozen"
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="text-8xl">❄️</div>
            <h3 className="text-5xl font-bold text-blue-600 dark:text-blue-400">
              FREEZE!
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Did the child freeze?
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleFreezeResponse(true)}
                className="px-8 py-4 bg-green-500 text-white rounded-xl text-xl font-bold hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Check className="w-6 h-6" />
                Yes - Froze!
              </button>
              <button
                onClick={() => handleFreezeResponse(false)}
                className="px-8 py-4 bg-gray-400 text-white rounded-xl text-xl font-bold hover:bg-gray-500 transition-colors flex items-center gap-2"
              >
                <X className="w-6 h-6" />
                No - Kept Moving
              </button>
            </div>

            <button
              onClick={handleEndGame}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mx-auto"
            >
              <Square className="w-4 h-4" />
              End Game Now
            </button>
          </motion.div>
        )}

        {/* Round Result State */}
        <AnimatePresence>
          {gameState === 'round_result' && rounds.length > 0 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              {rounds[rounds.length - 1].child_froze ? (
                <>
                  <div className="text-8xl mb-4">⭐</div>
                  <h3 className="text-4xl font-bold text-green-600 dark:text-green-400">Great Job!</h3>
                </>
              ) : (
                <>
                  <div className="text-8xl mb-4">😊</div>
                  <h3 className="text-4xl font-bold text-gray-600 dark:text-gray-400">Keep Trying!</h3>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary State */}
        {gameState === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Game Complete!</h3>
              <p className="text-gray-600 dark:text-gray-300">Here's how you did:</p>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Rounds:</span>
                <span className="text-2xl font-bold">{rounds.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Successful Freezes:</span>
                <span className="text-2xl font-bold text-green-600">{successCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                <span className="text-2xl font-bold text-purple-600">{successRate.toFixed(0)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => onComplete?.(null)}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}

        {/* Score Display */}
        {gameState !== 'setup' && gameState !== 'summary' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Round: {currentRound + 1}</span>
            <span>Score: {successCount}/{rounds.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

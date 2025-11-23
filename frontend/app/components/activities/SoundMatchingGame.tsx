'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Check, X, Trophy, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  startSoundMatchingGame,
  generateSoundRound,
  recordSoundMatchingRound,
  endSoundMatchingGame
} from '@/app/lib/api';
import type { Sound, SoundRound } from '@/app/types';

interface SoundMatchingGameProps {
  sessionId: string;
  childId: string;
  onComplete?: (summary: any) => void;
}

type GameState = 'setup' | 'playing' | 'feedback' | 'summary';

export default function SoundMatchingGame({ sessionId, childId, onComplete }: SoundMatchingGameProps) {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameId, setGameId] = useState<string>('');
  const [category, setCategory] = useState<string>('instruments');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  const [currentRound, setCurrentRound] = useState<SoundRound | null>(null);
  const [selectedSound, setSelectedSound] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);

  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [correctMatches, setCorrectMatches] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [gameStartTime, setGameStartTime] = useState<number>(0);

  const categories = [
    { id: 'instruments', name: 'Musical Instruments', icon: '🎵' },
    { id: 'animals', name: 'Animal Sounds', icon: '🐾' },
    { id: 'nature', name: 'Nature Sounds', icon: '🌿' },
    { id: 'everyday', name: 'Everyday Sounds', icon: '🏠' }
  ];

  const startGameMutation = useMutation({
    mutationFn: startSoundMatchingGame,
    onSuccess: (data) => {
      setGameId(data.game_id);
      setGameStartTime(Date.now());
      loadNextRound();
      toast.success('Game started!', { icon: '🎮' });
    },
    onError: () => {
      toast.error('Failed to start game');
    }
  });

  const generateRoundMutation = useMutation({
    mutationFn: generateSoundRound,
    onSuccess: (data) => {
      setCurrentRound(data);
      setGameState('playing');
      setRoundStartTime(Date.now());
      // Simulate playing sound
      console.log(`Playing sound: ${data.target.name}`);
      toast.success(`Listen to the sound!`, { icon: '🔊' });
    }
  });

  const recordRoundMutation = useMutation({
    mutationFn: recordSoundMatchingRound,
    onSuccess: () => {
      console.log('Round recorded');
    }
  });

  const endGameMutation = useMutation({
    mutationFn: endSoundMatchingGame,
    onSuccess: (data) => {
      setGameState('summary');
      if (onComplete) {
        onComplete(data.summary);
      }
      toast.success('Game complete!', { icon: '🏆' });
    }
  });

  const loadNextRound = () => {
    generateRoundMutation.mutate({
      category,
      difficulty
    });
  };

  const handleStartGame = () => {
    startGameMutation.mutate({
      session_id: sessionId,
      child_id: childId,
      category,
      difficulty
    });
  };

  const handleSoundSelect = (sound: Sound) => {
    if (!currentRound) return;

    const responseTime = (Date.now() - roundStartTime) / 1000;
    const correct = sound.id === currentRound.target.id;

    setSelectedSound(sound.id);
    setIsCorrect(correct);
    setGameState('feedback');

    // Record round
    recordRoundMutation.mutate({
      game_id: gameId,
      session_id: sessionId,
      target_sound: currentRound.target.id,
      selected_sound: sound.id,
      choices_shown: currentRound.choices.map(c => c.id),
      response_time: responseTime,
      was_correct: correct
    });

    // Update stats
    setTotalRounds(prev => prev + 1);
    if (correct) {
      setCorrectMatches(prev => prev + 1);
    }
    setResponseTimes(prev => [...prev, responseTime]);

    // Show feedback then next round or end
    setTimeout(() => {
      setSelectedSound('');
      setIsCorrect(null);

      if (totalRounds + 1 >= 10) {
        // End game after 10 rounds
        handleEndGame();
      } else {
        loadNextRound();
      }
    }, 2000);
  };

  const handleEndGame = () => {
    const totalDuration = (Date.now() - gameStartTime) / 1000 / 60; // minutes
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    endGameMutation.mutate({
      game_id: gameId,
      session_id: sessionId,
      child_id: childId,
      total_rounds: totalRounds + 1,
      correct_matches: correctMatches + (isCorrect ? 1 : 0),
      total_duration: totalDuration,
      avg_response_time: avgResponseTime,
      overall_engagement: 'high'
    });
  };

  if (gameState === 'setup') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Sound Matching Game</h2>
          <p className="text-gray-600">Listen carefully and match the sound to the picture!</p>
        </div>

        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose a Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    category === cat.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="font-medium text-gray-800">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Difficulty
            </label>
            <div className="flex gap-3">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 p-3 rounded-lg border-2 capitalize transition-all ${
                    difficulty === diff
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {diff}
                  <div className="text-xs text-gray-500 mt-1">
                    {diff === 'easy' ? '3 choices' : diff === 'medium' ? '4 choices' : '6 choices'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={startGameMutation.isPending}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {startGameMutation.isPending ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'summary') {
    const accuracy = totalRounds > 0 ? Math.round((correctMatches / totalRounds) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-8xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Great Job!</h2>
          <p className="text-gray-600 mb-8">You completed the Sound Matching Game</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{totalRounds}</div>
              <div className="text-sm text-gray-600">Total Rounds</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{correctMatches}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{accuracy}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>

          <div className="text-lg text-gray-700">
            {accuracy >= 80 && "Excellent work! You're a sound matching expert! 🌟"}
            {accuracy >= 60 && accuracy < 80 && "Great job! Keep practicing! 👍"}
            {accuracy < 60 && "Good try! Let's practice more! 💪"}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Round {totalRounds + 1} / 10</span>
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {correctMatches} correct
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((totalRounds + 1) / 10) * 100}%` }}
            className="bg-purple-600 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Sound Player */}
      <div className="text-center mb-8">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-full mb-4"
        >
          <Volume2 className="w-12 h-12 text-purple-600" />
        </motion.div>
        <p className="text-xl font-semibold text-gray-800">
          Listen to the sound and pick the matching picture
        </p>
      </div>

      {/* Choices */}
      {currentRound && (
        <div className={`grid gap-4 ${
          difficulty === 'easy' ? 'grid-cols-3' :
          difficulty === 'medium' ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          <AnimatePresence>
            {currentRound.choices.map((sound, index) => (
              <motion.button
                key={sound.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSoundSelect(sound)}
                disabled={gameState === 'feedback'}
                className={`relative p-6 rounded-lg border-2 transition-all ${
                  gameState === 'feedback' && sound.id === selectedSound
                    ? isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : gameState === 'feedback' && sound.id === currentRound.target.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                } disabled:cursor-not-allowed`}
              >
                <div className="text-5xl mb-2">
                  {/* Placeholder emoji - in production, use actual images */}
                  {sound.id.includes('piano') && '🎹'}
                  {sound.id.includes('guitar') && '🎸'}
                  {sound.id.includes('drums') && '🥁'}
                  {sound.id.includes('dog') && '🐕'}
                  {sound.id.includes('cat') && '🐱'}
                  {sound.id.includes('bird') && '🐦'}
                  {sound.id.includes('rain') && '🌧️'}
                  {sound.id.includes('ocean') && '🌊'}
                  {!sound.id.match(/(piano|guitar|drums|dog|cat|bird|rain|ocean)/) && '🔊'}
                </div>
                <div className="font-semibold text-gray-800">{sound.name}</div>

                {gameState === 'feedback' && sound.id === selectedSound && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    {isCorrect ? (
                      <Check className="w-8 h-8 text-green-600" />
                    ) : (
                      <X className="w-8 h-8 text-red-600" />
                    )}
                  </motion.div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {gameState === 'feedback' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-4 rounded-lg text-center font-semibold ${
            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isCorrect ? '🎉 Correct! Great job!' : '💪 Good try! Let\'s keep going!'}
        </motion.div>
      )}
    </div>
  );
}

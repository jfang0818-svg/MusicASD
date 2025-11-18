'use client';

import { motion } from 'framer-motion';
import { Smile, Meh, Frown, Activity, Volume2, Music, TrendingUp, Video as VideoIcon, Mic } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface AnalysisData {
  video_analysis?: {
    emotion: string;
    movement_level: string;
    engagement_score: number;
    face_detected: boolean;
  };
  audio_analysis?: {
    vocal_pattern: string;
    sound_level_db: number;
    vocal_pitch_hz: number;
    speech_detected: boolean;
  };
  timestamp?: string;
}

interface RealtimeAnalysisDisplayProps {
  analysis: AnalysisData | null;
  isConnected: boolean;
  videoStream?: MediaStream | null;
}

export default function RealtimeAnalysisDisplay({
  analysis,
  isConnected,
  videoStream
}: RealtimeAnalysisDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set video stream when available
  useEffect(() => {
    const video = videoRef.current;
    if (video && videoStream) {
      // Only set srcObject if it's different
      if (video.srcObject !== videoStream) {
        video.srcObject = videoStream;
        // Use a small delay to ensure the video element is ready
        setTimeout(() => {
          video.play().catch(err => {
            // Ignore AbortError as it's expected when switching streams
            if (err.name !== 'AbortError') {
              console.error('Error playing video:', err);
            }
          });
        }, 100);
      }
    }
  }, [videoStream]);

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return <Smile className="h-6 w-6 text-green-600" />;
      case 'distressed':
        return <Frown className="h-6 w-6 text-red-600" />;
      case 'calm':
      case 'neutral':
        return <Meh className="h-6 w-6 text-blue-600" />;
      default:
        return <Meh className="h-6 w-6 text-gray-400" />;
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'distressed':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'calm':
      case 'neutral':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  };

  const getMovementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400';
    }
  };

  const getVocalPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'laughing':
        return 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-100';
      case 'crying':
        return 'bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-100';
      case 'speaking':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100';
      case 'silent':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 dark:text-green-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const videoAnalysis = analysis?.video_analysis;
  const audioAnalysis = analysis?.audio_analysis;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Real-time Analysis
        </h3>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {!analysis && isConnected && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Activity className="h-12 w-12 mx-auto mb-3 animate-pulse" />
          <p>Waiting for analysis data...</p>
          <p className="text-xs mt-2">Analysis updates every 5 seconds</p>
        </div>
      )}

      {/* Camera Preview - Always shown when stream is available */}
      {videoStream && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-32 rounded-lg border-2 border-purple-300 dark:border-purple-700 object-cover bg-gray-900"
          />
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Live
          </div>
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <p className="text-white text-sm">Connecting to analysis service...</p>
            </div>
          )}
        </div>
      )}

      {!isConnected && !videoStream && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <VideoIcon className="h-12 w-12 mx-auto mb-3" />
          <p>Not connected to analysis service</p>
          <p className="text-xs mt-2">Enable camera/audio access to start</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">

          {/* Video Analysis */}
          {videoAnalysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <VideoIcon className="h-4 w-4" />
                Video Analysis
              </div>

              {/* Emotion */}
              <div className={`p-4 rounded-xl border-2 ${getEmotionColor(videoAnalysis.emotion)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getEmotionIcon(videoAnalysis.emotion)}
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Emotion</p>
                      <p className="font-semibold text-lg capitalize">{videoAnalysis.emotion}</p>
                    </div>
                  </div>
                  {!videoAnalysis.face_detected && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                      No face detected
                    </span>
                  )}
                </div>
              </div>

              {/* Movement & Engagement */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border-2 ${getMovementColor(videoAnalysis.movement_level)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5" />
                    <p className="text-xs">Movement</p>
                  </div>
                  <p className="font-semibold text-lg capitalize">{videoAnalysis.movement_level}</p>
                </div>

                <div className="p-4 rounded-xl border-2 bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Engagement</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`font-bold text-2xl ${getEngagementColor(videoAnalysis.engagement_score)}`}>
                      {(videoAnalysis.engagement_score * 100).toFixed(0)}%
                    </p>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          videoAnalysis.engagement_score >= 0.7
                            ? 'bg-green-500'
                            : videoAnalysis.engagement_score >= 0.4
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${videoAnalysis.engagement_score * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Analysis */}
          {audioAnalysis && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Mic className="h-4 w-4" />
                Audio Analysis
              </div>

              {/* Vocal Pattern */}
              <div className={`p-4 rounded-xl ${getVocalPatternColor(audioAnalysis.vocal_pattern)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-6 w-6" />
                    <div>
                      <p className="text-xs opacity-70">Vocal Pattern</p>
                      <p className="font-semibold text-lg capitalize">{audioAnalysis.vocal_pattern}</p>
                    </div>
                  </div>
                  {audioAnalysis.speech_detected && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-1 rounded">
                      Speech detected
                    </span>
                  )}
                </div>
              </div>

              {/* Sound Level & Pitch */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Sound Level</p>
                  </div>
                  <p className="font-semibold text-lg">
                    {audioAnalysis.sound_level_db.toFixed(1)} dB
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Vocal Pitch</p>
                  </div>
                  <p className="font-semibold text-lg">
                    {audioAnalysis.vocal_pitch_hz > 0
                      ? `${audioAnalysis.vocal_pitch_hz.toFixed(0)} Hz`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          {analysis.timestamp && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
              Last updated: {new Date(analysis.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

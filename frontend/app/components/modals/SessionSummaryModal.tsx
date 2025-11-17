'use client';

import { motion } from 'framer-motion';
import { X, Sparkles, Clock, Music, TrendingUp, CheckCircle, FileText } from 'lucide-react';
import type { ModalProps } from '@/app/types';

interface SessionSummaryData {
  sessionId: string;
  childName: string;
  durationSeconds: number;
  totalLogs: number;
  engagementLevels: {
    LOW: number;
    MED: number;
    HIGH: number;
  };
  musicStyles: {
    calm: number;
    happy: number;
    energetic: number;
  };
  aiInsights?: string;
  keyMoments: Array<{
    timestamp: string;
    event: string;
    note?: string;
  }>;
}

interface SessionSummaryModalProps extends ModalProps {
  summaryData: SessionSummaryData | null;
  onViewFullReport?: () => void;
}

export function SessionSummaryModal({
  show,
  onClose,
  summaryData,
  onViewFullReport
}: SessionSummaryModalProps) {
  if (!show || !summaryData) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getMostUsedEngagement = (): string => {
    const levels = summaryData.engagementLevels;
    const max = Math.max(levels.LOW, levels.MED, levels.HIGH);
    if (levels.LOW === max) return 'Low';
    if (levels.MED === max) return 'Medium';
    return 'High';
  };

  const getMostUsedMusicStyle = (): string => {
    const styles = summaryData.musicStyles;
    const max = Math.max(styles.calm, styles.happy, styles.energetic);
    if (styles.calm === max) return 'Calm';
    if (styles.happy === max) return 'Happy';
    return 'Energetic';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Session Complete!</h2>
                <p className="text-green-100">Great work with {summaryData.childName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 rounded-2xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800">Duration</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {formatDuration(summaryData.durationSeconds)}
              </p>
            </div>

            <div className="bg-pink-50 rounded-2xl p-4 border-2 border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-semibold text-pink-800">Events</span>
              </div>
              <p className="text-2xl font-bold text-pink-900">{summaryData.totalLogs}</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Engagement</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{getMostUsedEngagement()}</p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4 border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-800">Music</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{getMostUsedMusicStyle()}</p>
            </div>
          </div>

          {/* Engagement Distribution */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Engagement Distribution</h3>
            <div className="space-y-3">
              {Object.entries(summaryData.engagementLevels).map(([level, count]) => {
                const total = Object.values(summaryData.engagementLevels).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors = {
                  LOW: 'bg-red-500',
                  MED: 'bg-yellow-500',
                  HIGH: 'bg-green-500'
                };

                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{level}</span>
                      <span className="text-sm text-gray-600">{count} times ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[level as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Music Usage */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-600" />
              Music Styles Used
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(summaryData.musicStyles).map(([style, count]) => (
                <div key={style} className="text-center">
                  <div className="w-16 h-16 mx-auto bg-white rounded-2xl border-2 border-blue-300 flex items-center justify-center mb-2">
                    <span className="text-3xl">
                      {style === 'calm' ? '😌' : style === 'happy' ? '😊' : '🎉'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 capitalize">{style}</p>
                  <p className="text-lg font-bold text-blue-900">{count}x</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {summaryData.aiInsights && (
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold">AI Insights</h3>
              </div>
              <p className="text-white/90 leading-relaxed">{summaryData.aiInsights}</p>
            </div>
          )}

          {/* Key Moments */}
          {summaryData.keyMoments.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Key Moments</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {summaryData.keyMoments.slice(0, 5).map((moment, index) => (
                  <div key={index} className="flex gap-3 pb-3 border-b border-gray-200 last:border-0">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{moment.event}</p>
                      {moment.note && (
                        <p className="text-sm text-gray-600 mt-1">{moment.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(moment.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            {onViewFullReport && (
              <button
                onClick={onViewFullReport}
                className="flex-1 bg-white border-2 border-purple-500 text-purple-700 font-semibold py-3 rounded-xl hover:bg-purple-50 transition-all"
              >
                View Full Report
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

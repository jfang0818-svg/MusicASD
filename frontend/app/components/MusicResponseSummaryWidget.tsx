'use client';

import { useQuery } from '@tanstack/react-query';
import { getAggregateMusicMetrics } from '../lib/api';
import { Activity, TrendingUp, Music, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MusicResponseSummaryWidgetProps {
  childId: string;
  days?: number;
}

export default function MusicResponseSummaryWidget({
  childId,
  days = 30
}: MusicResponseSummaryWidgetProps) {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['music-response-metrics', childId, days],
    queryFn: () => getAggregateMusicMetrics(childId, days),
    enabled: !!childId,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-gray-500">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Unable to load music response metrics</span>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.total_assessments === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Music Response Metrics
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No music response assessments yet. Complete assessments after music playback to see insights here.
        </p>
      </div>
    );
  }

  const formatPercentage = (value: number) => Math.round(value * 100);
  const formatScore = (value: number) => Math.round(value * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl shadow-lg p-6 border border-blue-200 dark:border-blue-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Music Response Metrics
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last {days} days • {metrics.total_assessments} assessments
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {Math.round(metrics.overall_quality_score)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Quality Score</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Self-Initiated"
          value={formatPercentage(metrics.initiation_rate)}
          icon="🎯"
          color="green"
        />
        <MetricCard
          label="Communication"
          value={formatPercentage(metrics.communication_rate)}
          icon="💬"
          color="blue"
        />
        <MetricCard
          label="Motor Movement"
          value={formatPercentage(metrics.motor_movement_rate)}
          icon="🎭"
          color="purple"
        />
        <MetricCard
          label="Aversion Rate"
          value={formatPercentage(metrics.aversion_rate)}
          icon="⚠️"
          color="red"
          isNegative
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Task Persistence</div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {formatScore(metrics.avg_task_persistence)}
            </div>
            <div className="text-sm text-gray-500 mb-1">/100</div>
          </div>
          <ProgressBar value={metrics.avg_task_persistence} color="blue" />
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Emotional Response</div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {formatScore(metrics.avg_emotion)}
            </div>
            <div className="text-sm text-gray-500 mb-1">/100</div>
          </div>
          <ProgressBar value={metrics.avg_emotion} color="green" />
        </div>
      </div>

      {/* Best Performing Music Style */}
      {metrics.metrics_by_style && Object.keys(metrics.metrics_by_style).length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Performance by Style
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.metrics_by_style)
              .sort(([, a]: [string, any], [, b]: [string, any]) => b.quality_score - a.quality_score)
              .map(([style, data]: [string, any]) => (
                <div key={style} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium text-gray-700 dark:text-gray-300">
                      {style}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({data.count} plays)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {Math.round(data.quality_score)}
                    </span>
                    {data.quality_score >= 70 && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Tracks */}
      {metrics.top_tracks && metrics.top_tracks.length > 0 && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🌟 Top Performing Track
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-semibold">{metrics.top_tracks[0].music_file}</span>
            <span className="text-xs ml-2">
              Score: {Math.round(metrics.top_tracks[0].quality_score)} •
              {metrics.top_tracks[0].play_count} plays
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon,
  color,
  isNegative = false
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  isNegative?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  };

  return (
    <div className={`rounded-lg p-3 border ${colorClasses[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${isNegative && value > 10 ? 'text-red-600' : ''}`}>
        {value}%
      </div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ value, color }: { value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
      <div
        className={`${colorClasses[color]} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

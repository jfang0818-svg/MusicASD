'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Calendar,
  Sparkles,
  AlertCircle,
  Music,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { getChildProfile, getChildProgressSummary, getGoalProgressTimeline, getSessionInsights } from '@/app/lib/api';

export default function ChildProgressPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);

  // Fetch child profile
  const { data: child } = useQuery({
    queryKey: ['child-profile', childId],
    queryFn: () => getChildProfile(childId),
  });

  // Fetch progress summary
  const { data: progressSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['progress-summary', childId],
    queryFn: () => getChildProgressSummary(childId, 30),
  });

  // Fetch goal timeline
  const { data: goalTimeline } = useQuery({
    queryKey: ['goal-timeline', childId],
    queryFn: () => getGoalProgressTimeline(childId, undefined, 30),
  });

  // Fetch session insights
  const { data: insights } = useQuery({
    queryKey: ['session-insights', childId],
    queryFn: () => getSessionInsights(childId, 30),
  });

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Loading progress data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {child?.demographics.name}'s Progress
              </h1>
              <p className="text-gray-600">Last 30 days • Comprehensive analysis</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
          >
            📄 Export Report
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Goals Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-purple-600" />
              <span className="text-3xl font-bold text-purple-600">
                {progressSummary?.goals.avg_progress_percent || 0}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Goal Progress</h3>
            <p className="text-sm text-gray-600">
              {progressSummary?.goals.achieved || 0}/{progressSummary?.goals.total || 0} goals achieved
            </p>
            <div className="mt-3 text-xs text-gray-500">
              {progressSummary?.goals.active || 0} active goals
            </div>
          </motion.div>

          {/* Sessions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">
                {progressSummary?.sessions.total || 0}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Sessions</h3>
            <p className="text-sm text-gray-600">
              {progressSummary?.sessions.total_minutes.toFixed(0) || 0} total minutes
            </p>
            <div className="mt-3 text-xs text-gray-500">
              Avg {progressSummary?.sessions.avg_duration_minutes.toFixed(1) || 0} min/session
            </div>
          </motion.div>

          {/* Breakthroughs Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Sparkles className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {progressSummary?.notes.breakthroughs || 0}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Breakthroughs</h3>
            <p className="text-sm text-gray-600">Positive milestones</p>
            <div className="mt-3 text-xs text-gray-500">
              {progressSummary?.notes.challenges || 0} challenges noted
            </div>
          </motion.div>

          {/* Insights Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <span className="text-3xl font-bold text-orange-600">
                {insights?.insights.length || 0}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">AI Insights</h3>
            <p className="text-sm text-gray-600">Recommendations</p>
            <div className="mt-3 text-xs text-gray-500">
              Based on {progressSummary?.notes.total || 0} notes
            </div>
          </motion.div>
        </div>

        {/* Goal Progress Charts */}
        {goalTimeline && goalTimeline.goals.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Goal Progress Over Time</h2>
            </div>

            <div className="space-y-8">
              {goalTimeline.goals.map((goal: any) => {
                const progressPercent = goal.target - goal.baseline !== 0
                  ? ((goal.current_value - goal.baseline) / (goal.target - goal.baseline)) * 100
                  : 0;

                return (
                  <div key={goal.goal_id} className="border-b border-gray-200 pb-6 last:border-0">
                    {/* Goal Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{goal.goal_title}</h3>
                        <p className="text-sm text-gray-600">
                          {goal.baseline} → {goal.current_value} / {goal.target} {goal.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-purple-600">
                          {Math.min(progressPercent, 100).toFixed(0)}%
                        </span>
                        <p className="text-xs text-gray-500">{goal.data_points.length} measurements</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>

                    {/* Simple Timeline Visualization */}
                    {goal.data_points.length > 0 && (
                      <div className="flex items-end justify-between h-32 gap-2">
                        {goal.data_points.map((point: any, index: number) => {
                          const heightPercent = ((point.value - goal.baseline) / (goal.target - goal.baseline)) * 100;
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t-md hover:opacity-80 transition-opacity cursor-pointer"
                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                title={`${new Date(point.date).toLocaleDateString()}: ${point.value} ${goal.unit}`}
                              />
                              {index === 0 || index === goal.data_points.length - 1 ? (
                                <span className="text-xs text-gray-500">
                                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Music Effectiveness */}
        {progressSummary?.music_effectiveness && Object.keys(progressSummary.music_effectiveness).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Music className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Music Effectiveness</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(progressSummary.music_effectiveness).map(([style, data]: [string, any]) => (
                <div key={style} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 capitalize mb-2">{style} Music</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Usage:</span>
                      <span className="font-semibold">{data.usage_count} times</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Effectiveness:</span>
                      <span className="font-semibold text-blue-600">{data.effectiveness_score}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${data.effectiveness_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights & Recommendations */}
        {insights && insights.insights.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">AI Insights & Recommendations</h2>
            </div>

            <div className="space-y-4">
              {insights.insights.map((insight: any, index: number) => {
                const colors = {
                  positive: 'bg-green-50 border-green-200 text-green-700',
                  concern: 'bg-orange-50 border-orange-200 text-orange-700',
                  info: 'bg-blue-50 border-blue-200 text-blue-700'
                };

                const icons = {
                  positive: <Sparkles className="h-5 w-5" />,
                  concern: <AlertCircle className="h-5 w-5" />,
                  info: <TrendingUp className="h-5 w-5" />
                };

                return (
                  <div key={index} className={`p-4 rounded-lg border-2 ${colors[insight.type as keyof typeof colors]}`}>
                    <div className="flex items-start gap-3">
                      {icons[insight.type as keyof typeof icons]}
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Breakthroughs */}
        {progressSummary?.recent_breakthroughs && progressSummary.recent_breakthroughs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Recent Breakthrough Moments</h2>
            </div>

            <div className="space-y-3">
              {progressSummary.recent_breakthroughs.map((breakthrough: any, index: number) => (
                <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-gray-900 mb-2">{breakthrough.content}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(breakthrough.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

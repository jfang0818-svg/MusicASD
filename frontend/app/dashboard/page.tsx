'use client';

import Link from 'next/link';
import {
  PlayCircle,
  Music,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/api';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          href="/dashboard/session"
          icon={<PlayCircle className="h-8 w-8" />}
          title="Start New Session"
          description="Begin a therapy session"
          color="bg-green-500"
        />
        <QuickActionCard
          href="/dashboard/library"
          icon={<Music className="h-8 w-8" />}
          title="Music Library"
          description="Browse available tracks"
          color="bg-blue-500"
        />
        <QuickActionCard
          href="/dashboard/logs"
          icon={<Activity className="h-8 w-8" />}
          title="View Analytics"
          description="Check session reports"
          color="bg-purple-500"
        />
        <QuickActionCard
          href="/dashboard/settings"
          icon={<Users className="h-8 w-8" />}
          title="User Settings"
          description="Manage preferences"
          color="bg-orange-500"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions || 0}
          change="+12%"
          icon={<Calendar className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Avg. Engagement"
          value={`${stats?.avgEngagement || 0}%`}
          change="+5%"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Total Duration"
          value={`${stats?.totalDuration || 0} hrs`}
          change="+8%"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          change="+2"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Recent Sessions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
          <Link href="/dashboard/logs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <RecentSessionsList />
      </div>

      {/* Music Usage Chart */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Music Category Usage</h2>
          <MusicUsageChart />
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Engagement Trends</h2>
          <EngagementTrendsChart />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href} className="card p-6 hover:shadow-lg transition-shadow group">
      <div className={`${color} text-white p-3 rounded-lg inline-flex mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  loading
}: {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-green-600 dark:text-green-400">{change}</div>
        </>
      )}
    </div>
  );
}

function RecentSessionsList() {
  const sessions = [
    { id: 1, user: 'User 1', date: '2024-01-20', duration: '45 min', engagement: 85 },
    { id: 2, user: 'User 2', date: '2024-01-19', duration: '30 min', engagement: 72 },
    { id: 3, user: 'User 3', date: '2024-01-19', duration: '60 min', engagement: 90 },
  ];

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <p className="font-medium">{session.user}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{session.date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{session.duration}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {session.engagement}% engagement
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MusicUsageChart() {
  // Placeholder for chart - will be replaced with actual recharts implementation
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <p className="text-gray-500 dark:text-gray-400">Chart will be rendered here</p>
    </div>
  );
}

function EngagementTrendsChart() {
  // Placeholder for chart - will be replaced with actual recharts implementation
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <p className="text-gray-500 dark:text-gray-400">Chart will be rendered here</p>
    </div>
  );
}
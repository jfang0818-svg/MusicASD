'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Music,
  LayoutDashboard,
  Library,
  FileText,
  Settings,
  PlayCircle,
  Menu,
  X,
  Home,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/app/lib/utils';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Session', href: '/dashboard/session', icon: PlayCircle },
  { name: 'Music Library', href: '/dashboard/library', icon: Library },
  { name: 'Session Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center gap-2 group">
            <Music className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold">SonicSoothe</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Home link */}
        <div className="px-3 pt-4 pb-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="px-6 py-2">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
            Dashboard
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section with Exit Dashboard */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Exit Dashboard</span>
          </Link>

          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">U</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h1>

            {/* Quick home link in header for desktop */}
            <Link
              href="/"
              className="hidden lg:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
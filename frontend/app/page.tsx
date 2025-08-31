import Link from 'next/link';
import { Music, Brain, Users, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">MusicASD</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Interactive Music Therapy Platform
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Enhance engagement and emotional well-being through personalized music experiences
            with real-time monitoring and adaptive responses.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
              Start Session
            </Link>
            <Link href="/dashboard/library" className="btn-secondary text-lg px-8 py-3">
              Browse Library
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Brain className="h-10 w-10" />}
            title="AI-Powered Analysis"
            description="Real-time emotion detection and engagement monitoring using advanced AI"
          />
          <FeatureCard
            icon={<Music className="h-10 w-10" />}
            title="Adaptive Music"
            description="Dynamic music generation that responds to user engagement levels"
          />
          <FeatureCard
            icon={<Users className="h-10 w-10" />}
            title="Personalized Sessions"
            description="Customizable therapy sessions tailored to individual needs"
          />
          <FeatureCard
            icon={<BarChart3 className="h-10 w-10" />}
            title="Progress Tracking"
            description="Comprehensive analytics and session logs for monitoring progress"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <StatCard number="18+" label="Music Tracks" />
            <StatCard number="3" label="Mood Categories" />
            <StatCard number="Real-time" label="Engagement Tracking" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-primary mb-2">{number}</div>
      <div className="text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
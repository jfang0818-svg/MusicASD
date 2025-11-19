'use client';

import Link from 'next/link';
import { Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 -left-20 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60"
          animate={{
            x: [0, 100, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60"
          animate={{
            x: [0, -100, 0],
            y: [0, -80, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-white/20 bg-white/10 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">🎵</span>
              </div>
              <span className="text-xl font-bold text-white">SonicSoothe</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Link
                href="/login"
                className="text-white text-sm font-semibold hover:text-white/80 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-white text-indigo-600 font-bold text-sm px-5 py-2 rounded-lg hover:bg-white/90 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started Free 🚀
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            className="inline-block mb-4"
          >
            <div className="text-5xl">🎶</div>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Music Therapy,
            <br />
            <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Reimagined ✨
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-md">
            AI-powered music therapy for ASD children. Real-time engagement tracking,
            personalized recommendations, and data-driven insights 📊💙
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/register"
              className="bg-white text-indigo-600 font-bold text-base px-8 py-3 rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="bg-white/20 backdrop-blur-md text-white font-bold text-base px-8 py-3 rounded-xl border-2 border-white/50 hover:bg-white/30 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Sign In
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-3 text-white drop-shadow-lg"
        >
          Why You'll Love It 💜
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-base text-white/80 text-center mb-8 max-w-2xl mx-auto"
        >
          Everything you need for effective music therapy, powered by AI
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon="🧠"
            title="AI-Powered Analysis"
            description="Real-time emotion detection and engagement monitoring using GPT-5.1"
            delay={0}
          />
          <FeatureCard
            icon="🎵"
            title="Adaptive Music"
            description="Dynamic music that responds to engagement levels in real-time"
            delay={0.1}
          />
          <FeatureCard
            icon="👥"
            title="Personalized Sessions"
            description="Customized therapy sessions tailored to each child's unique needs"
            delay={0.2}
          />
          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Comprehensive analytics and insights to monitor improvement"
            delay={0.3}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative bg-white/10 backdrop-blur-md py-12 border-y border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 text-center"
          >
            <StatCard emoji="🎶" number="Unlimited" label="Music Tracks" delay={0} />
            <StatCard emoji="😌" number="3" label="Mood Categories" delay={0.1} />
            <StatCard emoji="⚡" number="Real-time" label="Engagement Tracking" delay={0.2} />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 text-center border-2 border-white/30 shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Music Therapy? 🚀
          </h2>
          <p className="text-base text-white/90 mb-6 max-w-2xl mx-auto">
            Join therapists using AI-powered insights to provide better care
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-indigo-600 font-bold text-base px-10 py-3 rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
          >
            Get Started Free - No Credit Card Required 💳
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative text-white/80 py-8 text-center border-t border-white/20">
        <p className="text-sm">
          Made with 💙 for ASD therapy • Powered by GPT-5.1 & Azure
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="bg-white/20 backdrop-blur-md rounded-2xl p-5 border-2 border-white/30 hover:bg-white/30 transition-all shadow-xl hover:shadow-2xl"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-white/80">{description}</p>
    </motion.div>
  );
}

function StatCard({
  emoji,
  number,
  label,
  delay
}: {
  emoji: string;
  number: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-3xl font-bold text-white mb-1">{number}</div>
      <div className="text-white/80 text-base">{label}</div>
    </motion.div>
  );
}
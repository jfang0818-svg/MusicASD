'use client';

import { motion } from 'framer-motion';
import { X, Filter, Activity as ActivityIcon, Clock } from 'lucide-react';

// ==================== ACTIVITY PREVIEW MODAL ====================
export function ActivityPreviewModal({ activity, onClose }: any) {
  if (!activity) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">{activity.icon}</span>
              {activity.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{activity.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Category</p>
                <p className="font-semibold text-gray-800">{activity.category}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Difficulty</p>
                <p className="font-semibold text-gray-800">{activity.difficulty}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="font-semibold text-gray-800">{activity.duration}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What to Expect</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Interactive exercise requiring active participation</li>
                <li>• Real-time feedback and guidance</li>
                <li>• Progress tracking and completion metrics</li>
                <li>• Adaptive difficulty based on performance</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Therapeutic Goals</h3>
              <ul className="space-y-2 text-sm text-purple-800">
                {activity.id === 'sound-matching' && (
                  <>
                    <li>• Improve auditory discrimination skills</li>
                    <li>• Enhance memory and attention</li>
                    <li>• Build pattern recognition abilities</li>
                  </>
                )}
                {activity.id === 'storytelling' && (
                  <>
                    <li>• Develop narrative understanding</li>
                    <li>• Encourage emotional expression</li>
                    <li>• Improve social communication</li>
                  </>
                )}
                {activity.id === 'movement' && (
                  <>
                    <li>• Enhance motor coordination</li>
                    <li>• Build body awareness</li>
                    <li>• Promote physical regulation</li>
                  </>
                )}
                {activity.id === 'emotion' && (
                  <>
                    <li>• Recognize and label emotions</li>
                    <li>• Practice emotional regulation</li>
                    <li>• Use music for mood management</li>
                  </>
                )}
                {activity.id === 'recommendations' && (
                  <>
                    <li>• Personalized therapeutic music selection</li>
                    <li>• Goal-oriented music matching</li>
                    <li>• AI-driven insights and suggestions</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-colors"
            >
              Start Activity
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== RESOURCE PREVIEW MODAL ====================
export function ResourcePreviewModal({ resource, onClose }: any) {
  if (!resource) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">
                {resource.category === 'Stories' ? '📚' : resource.category === 'Sound Packs' ? '🎵' : '🌊'}
              </span>
              {resource.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Category</p>
              <p className="font-semibold text-gray-800">{resource.category}</p>
            </div>

            {resource.category === 'Stories' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <p className="text-sm text-pink-600 mb-1">Scenes</p>
                    <p className="font-semibold text-pink-900">{resource.scenes} scenes</p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <p className="text-sm text-pink-600 mb-1">Duration</p>
                    <p className="font-semibold text-pink-900">{resource.duration}</p>
                  </div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h3 className="font-semibold text-pink-900 mb-2">Story Overview</h3>
                  <p className="text-sm text-pink-800">
                    This therapeutic story uses music and narrative to guide children through {resource.name.toLowerCase()}.
                    Each scene includes interactive elements and music cues designed to engage and support emotional understanding.
                  </p>
                </div>
              </>
            )}

            {resource.category === 'Sound Packs' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Total Sounds</p>
                    <p className="font-semibold text-purple-900">{resource.sounds} sounds</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Difficulty</p>
                    <p className="font-semibold text-purple-900">{resource.difficulty}</p>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Sound Pack Details</h3>
                  <p className="text-sm text-purple-800">
                    This sound pack contains {resource.sounds} carefully selected sounds from the {resource.name.toLowerCase()} category.
                    Perfect for auditory discrimination activities and sensory exploration.
                  </p>
                </div>
              </>
            )}

            {resource.category === 'Soundscapes' && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Preset Type</p>
                  <p className="font-semibold text-blue-900">{resource.preset}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Soundscape Details</h3>
                  <p className="text-sm text-blue-800">
                    This ambient soundscape creates a {resource.preset.toLowerCase()} environment using layered nature sounds.
                    Ideal for relaxation, sensory regulation, and creating a calming atmosphere.
                  </p>
                </div>
              </>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Recommended Use</h3>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Use during quiet time or transition periods</li>
                <li>• Can be combined with other therapeutic activities</li>
                <li>• Adjust volume based on sensory needs</li>
                <li>• Track usage and effectiveness in session logs</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className={`flex-1 py-3 text-white rounded-lg font-semibold transition-colors ${
                resource.category === 'Stories'
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
                  : resource.category === 'Sound Packs'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              Use Resource
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

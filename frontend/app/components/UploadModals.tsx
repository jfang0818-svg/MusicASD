'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ==================== ACTIVITY UPLOAD MODAL ====================
export function ActivityUploadModal({ show, onClose }: any) {
  const [activityType, setActivityType] = useState<string>('');
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityFile, setActivityFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const activityTypes = [
    { id: 'sound-matching', label: 'Sound Matching Game', icon: '🎵' },
    { id: 'storytelling', label: 'Musical Story', icon: '📚' },
    { id: 'movement', label: 'Movement Activity', icon: '🏃' },
    { id: 'custom', label: 'Custom Activity', icon: '✨' }
  ];

  const handleUpload = async () => {
    if (!activityType || !activityName || !activityFile) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // TODO: Implement actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Activity uploaded successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to upload activity');
    } finally {
      setUploading(false);
    }
  };

  if (!show) return null;

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
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Upload Activity
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Activity Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Activity Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activityTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActivityType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      activityType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{type.icon}</span>
                      <span className="font-semibold">{type.label}</span>
                      {activityType === type.id && <span className="ml-auto text-purple-500">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Activity Name
              </label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Enter activity name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Describe the activity and its therapeutic goals"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Activity File (JSON configuration)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setActivityFile(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {activityFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{activityFile.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!activityType || !activityName || !activityFile || uploading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Activity'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== RESOURCE UPLOAD MODAL ====================
export function ResourceUploadModal({ show, onClose }: any) {
  const [resourceType, setResourceType] = useState<string>('');
  const [resourceName, setResourceName] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const resourceTypes = [
    { id: 'story', label: 'Therapeutic Story', icon: '📚' },
    { id: 'sound_pack', label: 'Sound Pack', icon: '🎵' },
    { id: 'soundscape', label: 'Ambient Soundscape', icon: '🌊' },
    { id: 'custom', label: 'Custom Resource', icon: '✨' }
  ];

  const handleUpload = async () => {
    if (!resourceType || !resourceName || !resourceFile) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // TODO: Implement actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Resource uploaded successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  if (!show) return null;

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
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Upload Resource
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Resource Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Resource Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {resourceTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setResourceType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      resourceType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{type.icon}</span>
                      <span className="font-semibold">{type.label}</span>
                      {resourceType === type.id && <span className="ml-auto text-purple-500">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Name
              </label>
              <input
                type="text"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="Enter resource name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={resourceDescription}
                onChange={(e) => setResourceDescription(e.target.value)}
                placeholder="Describe the resource and its intended use"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource File
              </label>
              <input
                type="file"
                accept=".json,.mp3,.wav,.zip"
                onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {resourceFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{resourceFile.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!resourceType || !resourceName || !resourceFile || uploading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

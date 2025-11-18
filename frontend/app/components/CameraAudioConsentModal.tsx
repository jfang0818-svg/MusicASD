'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Mic, Shield, Eye, Database, Clock, AlertTriangle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export default function CameraAudioConsentModal({
  isOpen,
  onClose,
  onAccept,
  onDecline
}: ConsentModalProps) {
  const [videoConsent, setVideoConsent] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [understandPrivacy, setUnderstandPrivacy] = useState(false);

  const allConsentsGiven = videoConsent && audioConsent && understandPrivacy;

  const handleAccept = () => {
    if (allConsentsGiven) {
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Camera & Audio Access</h2>
              </div>
              <p className="text-white/90 text-sm">
                Per-Session Privacy Consent Required
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* What We Collect */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  What We Analyze
                </h3>
                <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Video Analysis (Every 5 seconds)</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Facial emotions, movement level, engagement score
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mic className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Audio Analysis (Every 5 seconds)</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Vocal patterns, sound level, pitch (for music matching)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Guarantees */}
              <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Privacy Guarantees
                </h3>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span><strong>No video/audio storage</strong> - All processing happens in real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span><strong>Metadata only</strong> - We only save analysis results (emotions, engagement scores)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span><strong>Session-only</strong> - Data is linked to therapy sessions, not recordings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span><strong>Secure transmission</strong> - Encrypted WebSocket connection</span>
                  </li>
                </ul>
              </div>

              {/* How It Helps */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  How This Helps
                </h3>
                <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>Real-time music adaptation based on child's emotional state</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>Track engagement levels throughout the session</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>Personalize music recommendations for future sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400">•</span>
                    <span>Match music key to child's vocal pitch</span>
                  </li>
                </ul>
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={videoConsent}
                    onChange={(e) => setVideoConsent(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    I consent to <strong>video analysis</strong> for this session only
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={audioConsent}
                    onChange={(e) => setAudioConsent(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    I consent to <strong>audio analysis</strong> for this session only
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={understandPrivacy}
                    onChange={(e) => setUnderstandPrivacy(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    I understand that <strong>no video/audio will be stored</strong>, only analysis metadata
                  </span>
                </label>
              </div>

              {/* Warning if not all consents given */}
              {!allConsentsGiven && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      All three consents are required to enable real-time analysis features.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onDecline}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-colors"
                >
                  Decline
                </button>

                <button
                  onClick={handleAccept}
                  disabled={!allConsentsGiven}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="h-5 w-5" />
                  Accept & Continue
                </button>
              </div>

              {/* Decline Info */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                You can still use the app without camera/audio analysis. Only music recommendations will be affected.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

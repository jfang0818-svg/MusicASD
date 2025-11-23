'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, Calendar, Target, Music, Clock, ChevronRight } from 'lucide-react';
import { PlannedSession } from '@/app/types';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface SessionStartModalProps {
  show: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  plannedSessions: PlannedSession[];
  onStartAdHoc: () => void;
  onStartPlanned: (sessionId: string) => void;
}

export function SessionStartModal({
  show,
  onClose,
  childId,
  childName,
  plannedSessions,
  onStartAdHoc,
  onStartPlanned,
}: SessionStartModalProps) {
  const [selectedMode, setSelectedMode] = useState<'adhoc' | string>('adhoc');

  // Filter upcoming sessions only
  const upcomingSessions = plannedSessions.filter(
    (session) => session.status === 'upcoming' && session.childId === childId
  );

  const handleStart = () => {
    if (selectedMode === 'adhoc') {
      onStartAdHoc();
    } else {
      onStartPlanned(selectedMode);
    }
    onClose();
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getTimeLabel = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const isOverdue = (dateString: string) => {
    return isPast(new Date(dateString));
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Start Session</h2>
              <p className="text-sm text-gray-600 mt-1">
                {childName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Ad-hoc Session Option */}
          <button
            onClick={() => setSelectedMode('adhoc')}
            className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
              selectedMode === 'adhoc'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'adhoc' ? 'border-green-500' : 'border-gray-300'
              }`}>
                {selectedMode === 'adhoc' && (
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800">Ad-hoc Session</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Start a new session now without a pre-planned structure
                </p>
              </div>
            </div>
          </button>

          {/* Divider */}
          {upcomingSessions.length > 0 && (
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500 font-semibold">OR CHOOSE A PLANNED SESSION</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Planned Sessions */}
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedMode(session.id)}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                    selectedMode === session.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedMode === session.id ? 'border-purple-500' : 'border-gray-300'
                    }`}>
                      {selectedMode === session.id && (
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{session.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className={`text-sm font-medium ${
                              isOverdue(session.scheduledDateTime) ? 'text-orange-600' : 'text-gray-700'
                            }`}>
                              {getDateLabel(session.scheduledDateTime)} at {getTimeLabel(session.scheduledDateTime)}
                            </span>
                            {isOverdue(session.scheduledDateTime) && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                          <Clock className="w-4 h-4" />
                          {session.duration} min
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {/* Goals */}
                        {session.goals.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Goals:</p>
                              <div className="flex flex-wrap gap-1">
                                {session.goals.slice(0, 3).map((goal, idx) => (
                                  <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                    {goal}
                                  </span>
                                ))}
                                {session.goals.length > 3 && (
                                  <span className="text-xs text-gray-500">+{session.goals.length - 3}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Music Styles */}
                        {session.musicStyles.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Music className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Music:</p>
                              <div className="flex flex-wrap gap-1">
                                {session.musicStyles.slice(0, 2).map((style, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {style.replace('_', ' ')}
                                  </span>
                                ))}
                                {session.musicStyles.length > 2 && (
                                  <span className="text-xs text-gray-500">+{session.musicStyles.length - 2}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {session.notes && (
                        <p className="text-xs text-gray-600 mt-3 italic line-clamp-2">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-gray-50 rounded-xl">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No Planned Sessions</p>
              <p className="text-sm text-gray-500">
                You can create a planned session from the dashboard
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <PlayCircle className="w-5 h-5" />
              {selectedMode === 'adhoc' ? 'Start Ad-hoc Session' : 'Start Planned Session'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

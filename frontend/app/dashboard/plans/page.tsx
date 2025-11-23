'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Clock, Target, Music, Edit, Trash2, Copy, PlayCircle, Plus, Filter, Sparkles } from 'lucide-react';
import { getChildProfiles, getPlannedSessions, deletePlannedSession, createPlannedSession } from '@/app/lib/api';
import { PlannedSession } from '@/app/types';
import { PlanSessionModal } from '@/app/components/modals/PlanSessionModal';
import { AIPlanningWizard } from '@/app/components/AIPlanningWizard';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

export default function SessionPlansPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [editingSession, setEditingSession] = useState<PlannedSession | undefined>();
  const [modalChildId, setModalChildId] = useState<string>('');
  const [modalChildName, setModalChildName] = useState<string>('');

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const { data: allPlannedSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['planned-sessions'],
    queryFn: () => getPlannedSessions(),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlannedSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      toast.success('Session plan deleted');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: createPlannedSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      toast.success('Session plan duplicated');
    },
  });

  // Filter sessions
  const filteredSessions = allPlannedSessions.filter((session: PlannedSession) => {
    const childMatch = selectedChildId === 'all' || session.childId === selectedChildId;
    const statusMatch = selectedStatus === 'all' || session.status === selectedStatus;
    return childMatch && statusMatch;
  });

  // Sort by date
  const sortedSessions = [...filteredSessions].sort((a, b) =>
    new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime()
  );

  const getChildName = (childId: string) => {
    const child = children.find((c: any) => c.id === childId);
    return child?.demographics?.name || 'Unknown';
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getTimeLabel = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const isOverdue = (dateString: string, status: string) => {
    return status === 'upcoming' && isPast(new Date(dateString));
  };

  const handleEdit = (session: PlannedSession) => {
    setEditingSession(session);
    setModalChildId(session.childId);
    setModalChildName(getChildName(session.childId));
    setShowPlanModal(true);
  };

  const handleDelete = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session plan?')) {
      await deleteMutation.mutateAsync(sessionId);
    }
  };

  const handleDuplicate = async (session: PlannedSession) => {
    const newSession = {
      ...session,
      title: `${session.title} (Copy)`,
      status: 'upcoming',
    };
    delete (newSession as any).id;
    delete (newSession as any).createdAt;
    delete (newSession as any).updatedAt;
    await duplicateMutation.mutateAsync(newSession as any);
  };

  const handleStartNow = (session: PlannedSession) => {
    router.push(`/dashboard/session?childId=${session.childId}&plannedSessionId=${session.id}`);
  };

  const handleNewPlan = () => {
    if (children.length === 0) {
      toast.error('Please add a participant first');
      return;
    }
    setEditingSession(undefined);
    setModalChildId(children[0].id);
    setModalChildName(children[0].demographics.name);
    setShowPlanModal(true);
  };

  const handleSavePlan = async (sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    // This will be handled by PlanSessionModal's onSave which calls the API
  };

  const handlePlanWithAI = () => {
    if (children.length === 0) {
      toast.error('Please add a participant first');
      return;
    }
    // For multi-child scenarios, use the first child or the filtered child
    const targetChild = selectedChildId !== 'all'
      ? children.find((c: any) => c.id === selectedChildId)
      : children[0];

    if (targetChild) {
      setModalChildId(targetChild.id);
      setModalChildName(targetChild.demographics.name);
      setShowAIWizard(true);
    }
  };

  const handleAIWizardComplete = async (sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createPlannedSession(sessionData as any);
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      toast.success('AI-generated session plan created!');
    } catch (error) {
      toast.error('Failed to create session plan');
    }
  };

  const getStatusBadge = (status: string, dateTime: string) => {
    if (isOverdue(dateTime, status)) {
      return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Overdue</span>;
    }

    const badges: { [key: string]: JSX.Element } = {
      upcoming: <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Upcoming</span>,
      completed: <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">Completed</span>,
      missed: <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Missed</span>,
      template: <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Template</span>,
    };
    return badges[status] || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Session Plans</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and schedule therapy sessions</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlanWithAI}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Plan with AI
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNewPlan}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Plan
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Participant Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participant
              </label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Participants</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.demographics.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
                <option value="template">Templates</option>
              </select>
            </div>
          </div>
        </div>

        {/* Session Plans List */}
        {sessionsLoading || childrenLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading session plans...</p>
          </div>
        ) : sortedSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center"
          >
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Session Plans Found</h3>
            <p className="text-gray-600 mb-6">
              {selectedChildId !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first session plan to get started'}
            </p>
            {selectedChildId === 'all' && selectedStatus === 'all' && (
              <button
                onClick={handleNewPlan}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Create First Plan
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sortedSessions.map((session: PlannedSession, index: number) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-800">{session.title}</h3>
                          {getStatusBadge(session.status, session.scheduledDateTime)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium">👤 {getChildName(session.childId)}</span>
                          <span>📅 {getDateLabel(session.scheduledDateTime)} at {getTimeLabel(session.scheduledDateTime)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-15">
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
                      <p className="text-sm text-gray-600 mt-3 ml-15 italic line-clamp-2">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(session)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(session)}
                      className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {session.status === 'upcoming' && (
                      <button
                        onClick={() => handleStartNow(session)}
                        className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                        title="Start Now"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Modal */}
      <PlanSessionModal
        show={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setEditingSession(undefined);
        }}
        childId={modalChildId}
        childName={modalChildName}
        onSave={handleSavePlan}
        editSession={editingSession}
      />

      {/* AI Planning Wizard */}
      <AIPlanningWizard
        show={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        childId={modalChildId}
        childName={modalChildName}
        onComplete={handleAIWizardComplete}
      />
    </div>
  );
}

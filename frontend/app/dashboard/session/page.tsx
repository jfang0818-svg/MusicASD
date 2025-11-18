'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles, getMusicElements, startSessionForChild, stopSessionUpdated, getChildGoals, recordGoalProgress } from '../../lib/api';
import { CameraSection } from '@/components/camera/CameraSection';
import { EngagementControls } from '@/app/components/engagement/EngagementControls';
import { SuggestionPanel } from '@/app/components/suggestions/SuggestionPanel';
import { MusicControls } from '@/app/components/music/MusicControls';
import { SessionLogs } from '@/app/components/session/SessionLogs';
import { MusicLibraryModal } from '@/app/components/modals/MusicLibraryModal';
import { GeneratedTonesModal } from '@/app/components/modals/GeneratedTonesModal';
import { GenerateMusicModal } from '@/app/components/modals/GeneratedMusicModal';
import { SessionSummaryModal } from '@/app/components/modals/SessionSummaryModal';
import { useSessionStore } from '@/app/store/useSessionStore';
import { useMusicStore } from '@/app/store/useMusicStore';
import { motion } from 'framer-motion';
import { User, Sparkles, AlertCircle, Music, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import CameraAudioConsentModal from '@/app/components/CameraAudioConsentModal';
import RealtimeAnalysisDisplay from '@/app/components/RealtimeAnalysisDisplay';
import AIMusicGenerationModal from '@/app/components/AIMusicGenerationModal';
import { useAnalysisWebSocket } from '@/app/hooks/useAnalysisWebSocket';
import { useAdaptiveMusic } from '@/app/hooks/useAdaptiveMusic';
import AdaptiveMusicNotification from '@/app/components/session/AdaptiveMusicNotification';
import { useSessionStructure, SessionPhase } from '@/app/hooks/useSessionStructure';
import VisualSchedule from '@/app/components/session/VisualSchedule';
import TransitionWarning from '@/app/components/session/TransitionWarning';
import QuickGoalTracker from '@/app/components/session/QuickGoalTracker';
import { useParentCoaching } from '@/app/hooks/useParentCoaching';
import ParentCoachingPanel from '@/app/components/session/ParentCoachingPanel';
import QuickNoteCapture from '@/app/components/session/QuickNoteCapture';

function SessionContent() {
  const searchParams = useSearchParams();
  const urlChildId = searchParams.get('childId');

  // Session state
  const {
    sessionActive,
    sessionId,
    engagement,
    autoSuggest,
    currentSuggestion,
    logs,
    updateEngagement,
    setAutoSuggest,
    generateSuggestion,
    acceptSuggestion,
    skipSuggestion,
    logResponse
  } = useSessionStore();

  // Music state
  const {
    musicPlaying,
    currentMusic,
    currentStyle,
    volume,
    musicLibrary,
    generatedTones,
    loading: musicLoading,
    playMusic,
    playMusicAdaptive,
    stopMusic,
    setVolume,
    loadMusicLibrary,
    loadGeneratedTones,
    uploadMusicFile
  } = useMusicStore();

  // Local UI state
  const [selectedChildId, _setSelectedChildId] = useState<string>(urlChildId || '');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [selectedStyle, _setSelectedStyle] = useState<'calm' | 'happy' | 'energetic'>('calm');
  const [loading, setLoading] = useState(false);
  const [showStartConfirmModal, setShowStartConfirmModal] = useState(false);

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any>(null);

  // Feature 2 & 3 state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [showAIMusicModal, setShowAIMusicModal] = useState(false);

  // Feature 1: Adaptive Music state
  const [autoAdaptEnabled, setAutoAdaptEnabled] = useState(true);

  // Feature 2: Session Structure state
  const [sessionStructureEnabled, setSessionStructureEnabled] = useState(true);

  // Feature 4: Parent Coaching state
  const [coachingEnabled, setCoachingEnabled] = useState(true);

  // Fetch children profiles
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  // Fetch music elements for selected child (optional - shows GPT recommendations)
  const { data: musicElements } = useQuery({
    queryKey: ['music-elements', selectedChildId],
    queryFn: async () => {
      try {
        return await getMusicElements(selectedChildId);
      } catch (error: any) {
        // Silently fail for 404 - it's OK if no music analysis exists yet
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!selectedChildId,
    retry: false,
    throwOnError: false,
  });

  // Fetch goals for selected child (Feature 3)
  const { data: childGoals, refetch: refetchGoals } = useQuery({
    queryKey: ['child-goals', selectedChildId],
    queryFn: async () => {
      try {
        return await getChildGoals(selectedChildId, 'in_progress');
      } catch (error: any) {
        // Silently fail for 404 - it's OK if no goals exist yet
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!selectedChildId,
    retry: false,
    throwOnError: false,
  });

  // Feature 2: WebSocket hook for real-time analysis
  const {
    isConnected,
    latestAnalysis,
    connect: _connect,
    disconnect,
    startCamera,
    startAudio,
    startCapture,
    stopCapture,
    stopCamera,
    stopAudio,
    videoStream
  } = useAnalysisWebSocket({
    sessionId: sessionId || '',
    enabled: analysisEnabled,
    onAnalysisUpdate: (data) => {
      console.log('Analysis update:', data);
    }
  });

  // Feature 1: Adaptive Music hook
  const {
    recommendation,
    acceptRecommendation,
    dismissRecommendation
  } = useAdaptiveMusic(
    latestAnalysis,
    currentStyle,
    { enabled: analysisEnabled && autoAdaptEnabled }
  );

  // Feature 2: Session Structure hook
  const sessionStructure = useSessionStructure({
    enabled: sessionActive && sessionStructureEnabled,
    onPhaseChange: (phase: SessionPhase) => {
      console.log('Phase changed to:', phase);
      // Auto-play music for hello/goodbye phases
      const phaseDefinition = sessionStructure.allPhases.find(p => p.id === phase);
      if (phaseDefinition?.autoPlayMusic && phaseDefinition.musicStyle) {
        playMusic(phaseDefinition.musicStyle);
      }
    },
    onPhaseComplete: (phase: SessionPhase) => {
      console.log('Phase completed:', phase);
    },
    onSessionComplete: () => {
      toast.success('Structured session complete! 🎉');
    },
  });

  // Feature 4: Parent Coaching hook
  const {
    prompts: coachingPrompts,
    dismissPrompt,
    completePrompt
  } = useParentCoaching({
    enabled: sessionActive && coachingEnabled,
    analysis: latestAnalysis,
    currentPhase: sessionStructure.currentPhase?.id || null,
    musicStyle: currentStyle,
    engagement,
    goalCategories: (childGoals || []).map((g: any) => g.category)
  });

  // Load initial data
  useEffect(() => {
    loadMusicLibrary();
    loadGeneratedTones();
  }, [loadMusicLibrary, loadGeneratedTones]);

  // Auto-suggest when engagement changes
  useEffect(() => {
    if (autoSuggest && sessionActive && engagement) {
      generateSuggestion(engagement);
    }
  }, [engagement, autoSuggest, sessionActive, generateSuggestion]);

  // Feature 1: Auto-apply adaptive music recommendations
  useEffect(() => {
    if (recommendation && recommendation.shouldChange && autoAdaptEnabled) {
      // Auto-accept after 5 seconds if auto-adapt is enabled
      const timer = setTimeout(() => {
        if (recommendation.recommendedStyle) {
          playMusicAdaptive(recommendation.recommendedStyle, recommendation.reason);
          acceptRecommendation();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [recommendation, autoAdaptEnabled, playMusicAdaptive, acceptRecommendation]);

  // Set child from URL param and show confirmation modal
  useEffect(() => {
    if (urlChildId && !sessionActive) {
      setShowStartConfirmModal(true);
    }
  }, [urlChildId, sessionActive]);

  // Feature 2: Start session structure when session becomes active
  useEffect(() => {
    if (sessionActive && sessionStructureEnabled && !sessionStructure.currentPhase) {
      sessionStructure.start();
    }
  }, [sessionActive, sessionStructureEnabled, sessionStructure]);

  // Session store actions
  const { setSessionActive, setSessionId, resetSession } = useSessionStore();

  // Handle session start
  const handleStartSession = async () => {
    if (!selectedChildId) {
      toast.error('Please select a child first');
      return;
    }

    setLoading(true);
    try {
      const response = await startSessionForChild(selectedChildId);

      // Update session store with response data
      setSessionActive(true);
      setSessionId(response.session_id);
      setShowStartConfirmModal(false);

      toast.success(`Session started for ${response.child_name}! 🎵`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Handle session stop
  const handleStopSession = async () => {
    setLoading(true);
    try {
      const response = await stopSessionUpdated();

      // Calculate session summary from logs
      const engagementLevels = { LOW: 0, MED: 0, HIGH: 0 };
      const musicStyles = { calm: 0, happy: 0, energetic: 0 };
      const keyMoments: any[] = [];

      logs.forEach((log: any) => {
        // Count engagement levels
        if (log.engagement) {
          engagementLevels[log.engagement as keyof typeof engagementLevels]++;
        }

        // Count music styles
        if (log.music_style) {
          musicStyles[log.music_style as keyof typeof musicStyles]++;
        }

        // Collect key moments (important events)
        if (log.event && !log.event.includes('Engagement') && !log.event.includes('Music')) {
          keyMoments.push({
            timestamp: log.timestamp,
            event: log.event,
            note: log.note || log.suggestion || ''
          });
        }
      });

      // Generate AI insights based on session data
      const mostUsedEngagement = Object.entries(engagementLevels)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'MED';
      const mostUsedMusic = Object.entries(musicStyles)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'calm';

      const aiInsights = generateSessionInsights(
        mostUsedEngagement,
        mostUsedMusic,
        selectedChild?.demographics.name || 'the child'
      );

      // Prepare summary data
      const summary = {
        sessionId: sessionId || 'Unknown',
        childName: selectedChild?.demographics.name || 'Unknown',
        durationSeconds: response.duration_seconds || 0,
        totalLogs: logs.length,
        engagementLevels,
        musicStyles,
        aiInsights,
        keyMoments
      };

      setSessionSummary(summary);
      setShowSummaryModal(true);

      // Reset session store
      resetSession();
      setCameraEnabled(false);

      toast.success('Session ended');
    } catch (error) {
      toast.error('Failed to stop session');
      // Even if API fails, reset the session
      resetSession();
      setCameraEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI insights based on session data
  const generateSessionInsights = (engagement: string, musicStyle: string, childName: string): string => {
    const insights = {
      'LOW-calm': `${childName} showed predominantly low engagement during this session. The calm music helped create a soothing environment. Consider gradually introducing more interactive elements in future sessions.`,
      'LOW-happy': `${childName} maintained low engagement even with happy music. This might indicate the need for a quieter, more gradual approach. Try starting with calmer tones next time.`,
      'LOW-energetic': `${childName} showed low engagement despite energetic music. The stimulation level might be too high. Consider reducing intensity and trying calm or happy music instead.`,
      'MED-calm': `Great session! ${childName} maintained balanced engagement with calm music. This appears to be a comfortable zone. Continue this approach while occasionally introducing variation.`,
      'MED-happy': `Excellent progress! ${childName} responded well to happy music with medium engagement. This is an ideal therapeutic state. Keep using this combination.`,
      'MED-energetic': `${childName} showed balanced engagement with energetic music. The stimulation level seems appropriate. Monitor for signs of overstimulation in longer sessions.`,
      'HIGH-calm': `Interesting! ${childName} showed high engagement even with calm music. This suggests good receptiveness. You might try introducing slightly more varied musical elements.`,
      'HIGH-happy': `Wonderful session! ${childName} was highly engaged with happy music. This combination is working excellently. Continue building on this positive response.`,
      'HIGH-energetic': `${childName} showed very high engagement with energetic music. While positive, monitor for potential overstimulation. Balance with calmer periods if the session runs long.`
    };

    const key = `${engagement}-${musicStyle}`;
    return insights[key as keyof typeof insights] || `${childName} had a good session. Continue monitoring responses and adjust music styles based on engagement patterns.`;
  };

  // Handle music play
  const handlePlayMusic = async (style: 'calm' | 'happy' | 'energetic', specificFile?: string) => {
    if (!sessionActive) {
      toast.error('Please start a session first');
      return;
    }
    await playMusic(style, specificFile);
  };

  // Feature 2: Handle consent and analysis
  const handleConsentAccept = async () => {
    try {
      await startCamera();
      await startAudio();

      // Set enabled first so the useEffect in the hook can connect
      setAnalysisEnabled(true);
      setShowConsentModal(false);

      // Start capture after a brief delay to ensure WebSocket is connected
      setTimeout(() => {
        startCapture();
      }, 1000);

      toast.success('Real-time analysis enabled!');
    } catch (error) {
      toast.error('Failed to access camera/microphone');
      setAnalysisEnabled(false);
    }
  };

  const handleStopAnalysis = () => {
    stopCapture();
    stopCamera();
    stopAudio();
    disconnect();
    setAnalysisEnabled(false);
    toast('Analysis stopped', { icon: 'ℹ️' });
  };

  // Feature 1: Handle adaptive music recommendations
  const handleAcceptAdaptiveMusic = () => {
    if (recommendation && recommendation.recommendedStyle) {
      playMusicAdaptive(recommendation.recommendedStyle, recommendation.reason);
      acceptRecommendation();
    }
  };

  const handleDismissAdaptiveMusic = () => {
    dismissRecommendation();
  };

  // Feature 3: Handle music generation
  const handleMusicGenerated = (_audioUrl: string, metadata: any) => {
    toast.success(`Generated "${metadata.filename}"!`);
    loadMusicLibrary();
    loadGeneratedTones();
  };

  // Feature 3: Handle goal progress update
  const handleGoalUpdate = async (goalId: string, value: number) => {
    if (!sessionId) {
      console.warn('No active session - cannot save goal progress');
      return;
    }

    try {
      await recordGoalProgress({
        goal_id: goalId,
        session_id: sessionId,
        measured_value: value,
        music_style_used: currentStyle || undefined,
        engagement_level: engagement || undefined,
      });

      // Refetch goals to update UI with latest values
      refetchGoals();

      toast.success('Goal progress saved! 📊', { duration: 2000 });
    } catch (error: any) {
      console.error('Failed to save goal progress:', error);
      toast.error('Failed to save goal progress');
    }
  };

  const selectedChild = children?.find((c: any) => c.id === selectedChildId);

  // Show loading state while fetching children
  if (childrenLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Loading session...</p>
        </div>
      </div>
    );
  }

  // Show error if child not found
  if (selectedChildId && !selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Child Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            The requested child profile could not be found. Please try again or select a different child.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Start Session Confirmation Modal */}
        {showStartConfirmModal && selectedChild && !sessionActive && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-lg w-full"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Start Therapy Session</h2>
                  <p className="text-gray-600">Ready to begin?</p>
                </div>
              </div>

              {/* Child Info */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {selectedChild.demographics.name}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Age: {selectedChild.demographics.age} years old</p>
                      {selectedChild.demographics.asd_level && (
                        <p>ASD Level: {selectedChild.demographics.asd_level}</p>
                      )}
                      {selectedChild.music_preferences?.preferred_tempo && (
                        <p>Preferred Tempo: {selectedChild.music_preferences.preferred_tempo}</p>
                      )}
                    </div>

                    {/* Music Recommendations */}
                    {musicElements && musicElements.elements?.style_tags && (
                      <div className="mt-4 pt-4 border-t border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-800">
                            GPT-5.1 Recommendations
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {musicElements.elements.style_tags.slice(0, 3).map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-purple-200 text-purple-700 rounded-full text-xs font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sensory Warnings */}
                    {selectedChild.sensory_sensitivities?.loud_noises_trigger && (
                      <div className="mt-4 pt-4 border-t border-purple-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-orange-700">
                            <span className="font-semibold">Note:</span> Sensitive to loud noises
                            {selectedChild.sensory_sensitivities.sudden_sounds_trigger && ' and sudden sounds'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStartConfirmModal(false);
                    window.history.back();
                  }}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleStartSession}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Music className="w-5 h-5" />
                      Confirm & Start Session
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Active Session Header */}
        {sessionActive && selectedChild && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-6 shadow-lg text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Active Session</h2>
                  <p className="text-green-100">
                    {selectedChild.demographics.name} • {sessionId}
                  </p>
                </div>
              </div>
              <button
                onClick={handleStopSession}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Stopping...' : '⏹ Stop Session'}
              </button>
            </div>

            {/* Advanced Features Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => setShowConsentModal(true)}
                disabled={analysisEnabled}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white rounded-xl transition-all text-sm"
              >
                <Video className="h-4 w-4" />
                {analysisEnabled ? 'Analysis Active' : 'Enable Real-time Analysis'}
              </button>

              {analysisEnabled && (
                <>
                  <button
                    onClick={handleStopAnalysis}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600/80 text-white rounded-xl transition-all text-sm"
                  >
                    Stop Analysis
                  </button>

                  {/* Feature 1: Auto-Adapt Toggle */}
                  <label className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAdaptEnabled}
                      onChange={(e) => setAutoAdaptEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>🤖 Auto-Adapt Music</span>
                  </label>
                </>
              )}

              {/* Feature 2: Session Structure Toggle */}
              <label className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionStructureEnabled}
                  onChange={(e) => setSessionStructureEnabled(e.target.checked)}
                  className="rounded"
                />
                <span>📅 Structured Session</span>
              </label>

              {/* Feature 4: Parent Coaching Toggle */}
              <label className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={coachingEnabled}
                  onChange={(e) => setCoachingEnabled(e.target.checked)}
                  className="rounded"
                />
                <span>💡 Parent Coaching</span>
              </label>

              <button
                onClick={() => setShowAIMusicModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/80 to-orange-500/80 hover:from-purple-600/80 hover:to-orange-600/80 text-white rounded-xl transition-all text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Generate AI Music
              </button>
            </div>
          </motion.div>
        )}

        {/* Feature 1: Adaptive Music Notification */}
        {sessionActive && analysisEnabled && recommendation && (
          <AdaptiveMusicNotification
            recommendation={recommendation}
            onAccept={handleAcceptAdaptiveMusic}
            onDismiss={handleDismissAdaptiveMusic}
            autoAcceptEnabled={autoAdaptEnabled}
          />
        )}

        {/* Feature 2: Transition Warning */}
        {sessionActive && sessionStructureEnabled && sessionStructure.showingTransitionWarning && (
          <TransitionWarning
            show={sessionStructure.showingTransitionWarning}
            currentPhase={sessionStructure.currentPhase}
            nextPhase={sessionStructure.allPhases[sessionStructure.currentPhaseIndex + 1]}
            remainingSeconds={sessionStructure.remainingSeconds}
            onDismiss={sessionStructure.dismissTransitionWarning}
          />
        )}

      {/* Main Content Grid - Split Screen Layout */}
      {sessionActive && (
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-240px)]">
          {/* Left Column - Session Structure & AI Assistant & Engagement */}
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            {/* Feature 2: Visual Schedule */}
            {sessionStructureEnabled && !sessionStructure.isComplete && (
              <VisualSchedule
                allPhases={sessionStructure.allPhases}
                currentPhase={sessionStructure.currentPhase}
                currentPhaseIndex={sessionStructure.currentPhaseIndex}
                isComplete={sessionStructure.isComplete}
                elapsedSeconds={sessionStructure.elapsedSeconds}
                remainingSeconds={sessionStructure.remainingSeconds}
                progressPercent={sessionStructure.progressPercent}
                isPaused={sessionStructure.isPaused}
                onNextPhase={sessionStructure.nextPhase}
                onSkipToPhase={sessionStructure.skipToPhase}
                onPause={sessionStructure.pause}
                onResume={sessionStructure.resume}
              />
            )}
            {/* AI Therapy Assistant Card */}
            <div className="card p-6 flex-shrink-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">AI Therapy Assistant</h2>
                <CameraSection
                  cameraEnabled={cameraEnabled}
                  setCameraEnabled={setCameraEnabled}
                  sessionActive={sessionActive}
                />
              </div>

              <EngagementControls
                engagement={engagement}
                updateEngagement={updateEngagement}
                sessionActive={sessionActive}
                autoSuggest={autoSuggest}
                setAutoSuggest={setAutoSuggest}
              />

              <SuggestionPanel
                sessionActive={sessionActive}
                currentSuggestion={currentSuggestion}
                generateSuggestion={() => generateSuggestion(engagement)}
                acceptSuggestion={acceptSuggestion}
                skipSuggestion={skipSuggestion}
                logResponse={logResponse}
              />
            </div>

            {/* Feature 4: Parent Coaching Panel */}
            {coachingEnabled && (
              <ParentCoachingPanel
                prompts={coachingPrompts}
                onDismiss={dismissPrompt}
                onComplete={completePrompt}
                enabled={coachingEnabled}
              />
            )}

            {/* Feature 5: Quick Note Capture */}
            <QuickNoteCapture
              sessionId={sessionId || ''}
              childId={selectedChildId}
              onNoteSaved={() => {
                // Could refetch session notes here if displaying them
                console.log('Note saved');
              }}
              currentContext={{
                musicStyle: currentStyle || undefined,
                engagementLevel: engagement || undefined,
                sessionPhase: sessionStructure.currentPhase?.id || undefined,
                timeElapsed: sessionStructure.elapsedSeconds
              }}
            />

            {/* Feature 3: Quick Goal Tracker */}
            <QuickGoalTracker
              sessionId={sessionId || ''}
              goals={childGoals || []}
              onGoalUpdate={handleGoalUpdate}
            />

            {/* Session Logs */}
            <div className="card p-6 flex-1 min-h-0">
              <SessionLogs logs={logs} />
            </div>
          </div>

          {/* Right Column - Music Controls */}
          <div className="card p-6 h-full overflow-y-auto">
            <MusicControls
              sessionActive={sessionActive}
              volume={volume}
              setVolume={setVolume}
              selectedStyle={selectedStyle}
              playMusic={handlePlayMusic}
              stopMusic={stopMusic}
              musicPlaying={musicPlaying}
              currentMusic={currentMusic}
              loading={musicLoading}
              musicLibrary={musicLibrary}
              generatedTones={generatedTones}
              loadMusicLibrary={loadMusicLibrary}
              loadGeneratedTones={loadGeneratedTones}
              setShowMusicModal={setShowMusicModal}
              setShowGeneratedModal={setShowGeneratedModal}
              setShowGenerateModal={setShowGenerateModal}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <MusicLibraryModal
        show={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        musicLibrary={musicLibrary}
        loadMusicLibrary={loadMusicLibrary}
        playMusic={handlePlayMusic}
        uploadMusicFile={uploadMusicFile}
        sessionActive={sessionActive}
      />

      <GeneratedTonesModal
        show={showGeneratedModal}
        onClose={() => setShowGeneratedModal(false)}
        generatedTones={generatedTones}
        playMusic={handlePlayMusic}
        sessionActive={sessionActive}
      />

      <GenerateMusicModal
        show={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        loadMusicLibrary={loadMusicLibrary}
        loadGeneratedTones={loadGeneratedTones}
      />

      <SessionSummaryModal
        show={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summaryData={sessionSummary}
      />

      {/* Feature 2 & 3 Modals */}
      <CameraAudioConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onAccept={handleConsentAccept}
        onDecline={() => setShowConsentModal(false)}
      />

      <AIMusicGenerationModal
        isOpen={showAIMusicModal}
        onClose={() => setShowAIMusicModal(false)}
        childId={selectedChildId}
        onMusicGenerated={handleMusicGenerated}
      />

      {/* Real-time Analysis Display */}
      {analysisEnabled && sessionActive && (
        <div className="fixed bottom-6 right-6 w-96 z-40">
          <RealtimeAnalysisDisplay
            analysis={latestAnalysis}
            isConnected={isConnected}
            videoStream={videoStream}
          />
        </div>
      )}
    </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700">Loading session...</p>
          </div>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
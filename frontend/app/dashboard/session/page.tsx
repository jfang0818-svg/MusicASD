'use client';

import { useState, useEffect } from 'react';
import { CameraSection } from '@/components/camera/CameraSection';
import { EngagementControls } from '@/app/components/engagement/EngagementControls';
import { SuggestionPanel } from '@/app/components/suggestions/SuggestionPanel';
import { MusicControls } from '@/app/components/music/MusicControls';
import { SessionLogs } from '@/app/components/session/SessionLogs';
import { MusicLibraryModal } from '@/app/components/modals/MusicLibraryModal';
import { GeneratedTonesModal } from '@/app/components/modals/GeneratedTonesModal';
import { GenerateMusicModal } from '@/app/components/modals/GeneratedMusicModal';
import { useSessionStore } from '@/app/store/useSessionStore';
import { useMusicStore } from '@/app/store/useMusicStore';
import toast from 'react-hot-toast';

export default function SessionPage() {
  // Session state
  const {
    sessionActive,
    sessionId,
    engagement,
    autoSuggest,
    currentSuggestion,
    logs,
    startSession,
    stopSession,
    updateEngagement,
    setAutoSuggest,
    generateSuggestion,
    acceptSuggestion,
    skipSuggestion,
    logResponse,
    addLog
  } = useSessionStore();

  // Music state
  const {
    musicPlaying,
    currentMusic,
    volume,
    musicLibrary,
    generatedTones,
    loading: musicLoading,
    playMusic,
    stopMusic,
    setVolume,
    loadMusicLibrary,
    loadGeneratedTones,
    uploadMusicFile
  } = useMusicStore();

  // Local UI state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'calm' | 'happy' | 'energetic'>('calm');
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

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

  // Handle session start
  const handleStartSession = async () => {
    setLoading(true);
    try {
      await startSession('user-1'); // TODO: Get actual user ID
      toast.success('Session started successfully');
    } catch (error) {
      toast.error('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // Handle session stop
  const handleStopSession = async () => {
    setLoading(true);
    try {
      await stopSession();
      setCameraEnabled(false);
      toast.success('Session ended');
    } catch (error) {
      toast.error('Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  // Handle music play
  const handlePlayMusic = async (style: 'calm' | 'happy' | 'energetic', specificFile?: string) => {
    if (!sessionActive) {
      toast.error('Please start a session first');
      return;
    }
    await playMusic(style, specificFile);
  };

  return (
    <div className="space-y-6">
      {/* Session Controls */}
      <div className="flex justify-center">
        {!sessionActive ? (
          <button
            onClick={handleStartSession}
            disabled={loading}
            className="btn-primary text-lg px-8 py-3"
          >
            {loading ? 'Starting...' : '▶️ Start Session'}
          </button>
        ) : (
          <button
            onClick={handleStopSession}
            disabled={loading}
            className="btn-secondary text-lg px-8 py-3"
          >
            {loading ? 'Stopping...' : '⏹️ Stop Session'}
          </button>
        )}
      </div>

      {sessionId && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Session ID: {sessionId}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - AI Assistant */}
        <div className="space-y-6">
          {/* AI Therapy Assistant Card */}
          <div className="card p-6">
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

          {/* Session Logs */}
          <div className="card p-6">
            <SessionLogs logs={logs} />
          </div>
        </div>

        {/* Right Column - Music Controls */}
        <div className="card p-6">
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
    </div>
  );
}
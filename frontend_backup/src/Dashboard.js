import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import CameraSection from './components/CameraSection';
import EngagementControls from './components/EngagementControls';
import SuggestionPanel from './components/SuggestionPanel';
import MusicControls from './components/MusicControls';
import SessionLogs from './components/SessionLogs';
import MusicLibraryModal from './components/MusicLibraryModal';
import GeneratedTonesModal from './components/GeneratedTonesModal';
import GenerateMusicModal from './components/GenerateMusicModal';

const API_URL = 'http://localhost:8000';

function Dashboard() {
  // Core state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [engagement, setEngagement] = useState('MED');
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentMusic, setCurrentMusic] = useState(null);
  const [volume, setVolume] = useState(0.7);
  const [autoSuggest, setAutoSuggest] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // UI state
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [logs, setLogs] = useState([]);
  const [musicLibrary, setMusicLibrary] = useState({ calm: [], happy: [], energetic: [] });
  const [generatedTones, setGeneratedTones] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState('calm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Fetch session status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/session/status`);
        if (response.ok) {
          const data = await response.json();
          setSessionActive(data.active);
          setEngagement(data.engagement);
          setMusicPlaying(data.music_playing);
          setCurrentMusic(data.current_music);
          if (data.session_id) setSessionId(data.session_id);
        }
      } catch (error) {
        console.error('Status fetch error:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load music library and generated tones on mount
  useEffect(() => {
    loadMusicLibrary();
    loadGeneratedTones();
  }, []);

  // Auto-suggest when engagement changes (only if enabled)
  useEffect(() => {
    if (autoSuggest && sessionActive && engagement) {
      generateSuggestion();
    }
  }, [engagement, autoSuggest, sessionActive]);

  // Data loading functions
  const loadMusicLibrary = async () => {
    try {
      const response = await fetch(`${API_URL}/music/library`);
      if (response.ok) {
        const data = await response.json();
        setMusicLibrary(data.library || { calm: [], happy: [], energetic: [] });
        console.log('Music library loaded:', data.total_files, 'files');
      }
    } catch (error) {
      console.error('Error loading music library:', error);
      setError('Failed to load music library');
    }
  };

  const loadGeneratedTones = async () => {
    try {
      const response = await fetch(`${API_URL}/music/generated`);
      if (response.ok) {
        const data = await response.json();
        setGeneratedTones(data.tones || []);
        console.log('Generated tones loaded:', data.count);
      }
    } catch (error) {
      console.error('Error loading generated tones:', error);
    }
  };

  // Session management
  const startSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/session/start`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setSessionActive(true);
        setSessionId(data.session_id);
        setLogs([]);
        setError(null);
        console.log('Session started:', data.session_id);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/session/stop`, { method: 'POST' });
      setSessionActive(false);
      setCurrentSuggestion(null);
      setCameraEnabled(false);
      console.log('Session stopped');
    } catch (error) {
      console.error('Error stopping session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Engagement management
  const updateEngagement = async (level) => {
    try {
      const response = await fetch(`${API_URL}/engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });

      if (response.ok) {
        const data = await response.json();
        setEngagement(level);
        console.log('Engagement updated:', data);
      } else {
        const error = await response.text();
        console.error('Engagement update failed:', error);
        setError(`Failed to update engagement: ${error}`);
      }
    } catch (error) {
      console.error('Error updating engagement:', error);
      setError('Failed to update engagement level');
    }
  };

  // Music control functions
  const playMusic = async (style, specificFile = null) => {
    try {
      setLoading(true);
      const payload = { style, volume };
      if (specificFile) payload.file = specificFile;

      const response = await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setMusicPlaying(true);
        setCurrentMusic(data.file || data.type);
        console.log('Playing music:', data);
      } else {
        const error = await response.text();
        setError(`Failed to play music: ${error}`);
      }
    } catch (error) {
      console.error('Error playing music:', error);
      setError('Failed to play music');
    } finally {
      setLoading(false);
    }
  };

  const stopMusic = async () => {
    try {
      await fetch(`${API_URL}/music/stop`, { method: 'POST' });
      setMusicPlaying(false);
      setCurrentMusic(null);
      console.log('Music stopped');
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  };

  // File upload
  const uploadMusicFile = async (file, style) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/music/upload/${style}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await loadMusicLibrary();
        alert(`Successfully uploaded ${file.name} to ${style} category`);
      } else {
        const error = await response.text();
        setError(`Upload failed: ${error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  // AI Suggestions
  const generateSuggestion = () => {
    const suggestions = {
      LOW: {
        style: 'calm',
        phrase: "Let's listen to some gentle music together. It's okay to just relax.",
        activity: "Soft swaying or gentle hand movements"
      },
      MED: {
        style: 'happy',
        phrase: "This happy tune makes me want to smile! Can you clap along?",
        activity: "Clapping or simple dance moves"
      },
      HIGH: {
        style: 'energetic',
        phrase: "Wow, you have so much energy! Let's move to this exciting beat!",
        activity: "Jumping, spinning, or energetic dancing"
      }
    };

    setCurrentSuggestion(suggestions[engagement] || suggestions.MED);
  };

  const acceptSuggestion = async () => {
    if (currentSuggestion) {
      await playMusic(currentSuggestion.style);
      await logEvent('accept', currentSuggestion);
    }
  };

  const skipSuggestion = async () => {
    await logEvent('skip', currentSuggestion);
    generateSuggestion();
  };

  // Logging
  const logEvent = async (action, suggestion) => {
    try {
      await fetch(`${API_URL}/session/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: action,
          engagement,
          music_style: suggestion?.style,
          suggestion: suggestion?.phrase,
          caregiver_action: action,
          note: `Session ${sessionId}`
        })
      });

      const newLog = {
        time: new Date().toLocaleTimeString(),
        action,
        engagement,
        style: suggestion?.style
      };
      setLogs(prev => [...prev, newLog]);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const logResponse = async (response) => {
    await logEvent('response', {
      ...currentSuggestion,
      child_response: response
    });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🎵 Project ASD</h1>
        <div className="session-info">
          {sessionId && <span className="session-id">Session: {sessionId}</span>}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="control-panel">
          <div className="session-controls">
            {!sessionActive ? (
              <button
                onClick={startSession}
                disabled={loading}
                className="btn btn-start"
              >
                {loading ? 'Starting...' : '▶️ Start Session'}
              </button>
            ) : (
              <button
                onClick={stopSession}
                disabled={loading}
                className="btn btn-stop"
              >
                {loading ? 'Stopping...' : '⏹️ Stop Session'}
              </button>
            )}
          </div>

          {/* AI Therapy Assistant Section */}
          <div className="ai-assistant-section">
            <div className="section-header">
              <h2>AI Therapy Assistant</h2>
              <CameraSection
                cameraEnabled={cameraEnabled}
                setCameraEnabled={setCameraEnabled}
                sessionActive={sessionActive}
                API_URL={API_URL}
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
              generateSuggestion={generateSuggestion}
              acceptSuggestion={acceptSuggestion}
              skipSuggestion={skipSuggestion}
              logResponse={logResponse}
            />
          </div>

          <MusicControls
            sessionActive={sessionActive}
            volume={volume}
            setVolume={setVolume}
            selectedStyle={selectedStyle}
            playMusic={playMusic}
            stopMusic={stopMusic}
            musicPlaying={musicPlaying}
            currentMusic={currentMusic}
            loading={loading}
            musicLibrary={musicLibrary}
            generatedTones={generatedTones}
            loadMusicLibrary={loadMusicLibrary}
            loadGeneratedTones={loadGeneratedTones}
            setShowMusicModal={setShowMusicModal}
            setShowGeneratedModal={setShowGeneratedModal}
            setShowGenerateModal={setShowGenerateModal}
          />

          <SessionLogs logs={logs} />
        </div>
      </div>

      {/* Modals */}
      <MusicLibraryModal
        show={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        musicLibrary={musicLibrary}
        loadMusicLibrary={loadMusicLibrary}
        playMusic={playMusic}
        uploadMusicFile={uploadMusicFile}
        sessionActive={sessionActive}
      />

      <GeneratedTonesModal
        show={showGeneratedModal}
        onClose={() => setShowGeneratedModal(false)}
        generatedTones={generatedTones}
        playMusic={playMusic}
        sessionActive={sessionActive}
      />

      <GenerateMusicModal
        show={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        API_URL={API_URL}
        loadMusicLibrary={loadMusicLibrary}
        loadGeneratedTones={loadGeneratedTones}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
      />
    </div>
  );
}

export default Dashboard;
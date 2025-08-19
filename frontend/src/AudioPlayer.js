import React, { useState } from 'react';
import './AudioPlayer.css';
import api from './api';

function AudioPlayer({ audioMode, onModeChange, currentMusic, onGenerateMusic, isPlaying: parentIsPlaying }) {
  const [volume, setVolume] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStop = async () => {
    try {
      await api.stopMusic();
    } catch (error) {
      console.error('Failed to stop music:', error);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    // Simple volume API call
    try {
      // Backend would handle actual volume control
      console.log('Volume set to:', newVolume);
    } catch (error) {
      console.error('Failed to adjust volume:', error);
    }
  };

  const handleGenerateMusic = async () => {
    setIsGenerating(true);
    // Call parent's generate function
    if (onGenerateMusic) {
      await onGenerateMusic();
    }
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="audio-player-compact">
      <h3>🎵 Music Controls</h3>

      {/* Audio Mode Toggle */}
      <div className="audio-mode-toggle">
        <button
          className={`mode-btn-compact ${audioMode === 'files' ? 'active' : ''}`}
          onClick={() => onModeChange('files')}
        >
          📁 Audio Files
        </button>
        <button
          className={`mode-btn-compact ${audioMode === 'generated' ? 'active' : ''}`}
          onClick={() => onModeChange('generated')}
        >
          🎹 Generated Tones
        </button>
      </div>

      {/* Generate Music Button - Only show in generated mode */}
      {audioMode === 'generated' && (
        <div className="generate-section">
          <button
            className="btn btn-generate"
            onClick={handleGenerateMusic}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generating...' : '✨ Generate New Music'}
          </button>
          <p className="mode-info">
            Creates unique therapeutic tones in real-time
          </p>
        </div>
      )}

      {/* Pre-loaded Files Info - Only show in files mode */}
      {audioMode === 'files' && (
        <div className="files-info">
          <p className="mode-info">
            Using pre-loaded therapeutic music library
          </p>
        </div>
      )}

      {/* Playback Status */}
      {parentIsPlaying && currentMusic && (
        <div className="playback-status">
          <div className="now-playing">
            <span className="playing-icon">▶️</span>
            <span>Playing {currentMusic} music ({audioMode})</span>
          </div>
          <button className="btn btn-stop" onClick={handleStop}>
            ⏹️ Stop
          </button>
        </div>
      )}

      {/* Volume Control */}
      <div className="volume-control-simple">
        <span className="volume-icon">🔊</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="volume-slider"
        />
        <span className="volume-value">{volume}%</span>
      </div>
    </div>
  );
}

export default AudioPlayer;
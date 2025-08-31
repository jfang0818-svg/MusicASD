// ========== MusicControls.js ==========
import React from 'react';

function MusicControls({
  sessionActive,
  volume,
  setVolume,
  selectedStyle,
  playMusic,
  stopMusic,
  musicPlaying,
  currentMusic,
  loading,
  musicLibrary,
  generatedTones,
  loadMusicLibrary,
  loadGeneratedTones,
  setShowMusicModal,
  setShowGeneratedModal,
  setShowGenerateModal
}) {
  const totalFiles = Object.values(musicLibrary).reduce((sum, files) => sum + files.length, 0);

  return (
    <div className="music-control-panel">
      <h2>Music Controls</h2>

      <div className="volume-control">
        <label>🔊 Volume: {Math.round(volume * 100)}%</label>
        <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{'--value': `${volume * 100}%`}}
            />
      </div>

      <div className="quick-play">
        <h3>Quick Play</h3>
        <div className="quick-play-buttons">
          {['calm', 'happy', 'energetic'].map((style) => (
            <button
              key={style}
              onClick={() => playMusic(style)}
              disabled={!sessionActive || loading}
              className={`btn btn-style ${style}`}
            >
              {style === 'calm' ? '😌' : style === 'happy' ? '😊' : '🎉'}
              <br />
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="playback-controls">
        {musicPlaying ? (
          <button onClick={stopMusic} className="btn btn-stop-music">
            ⏹️ Stop Music
          </button>
        ) : (
          <button
            onClick={() => playMusic(selectedStyle)}
            disabled={!sessionActive || loading}
            className="btn btn-play-music"
          >
            {loading ? '⏳' : '▶️'} Play {selectedStyle}
          </button>
        )}
        {currentMusic && (
          <p className="now-playing">🎵 Now playing: {currentMusic}</p>
        )}
      </div>

      <div className="music-library-buttons">
        <button
          onClick={() => {
            loadMusicLibrary();
            setShowMusicModal(true);
          }}
          className="btn btn-library"
          style={{ fontSize: '16px', padding: '12px' }}
        >
          📁 Audio Files ({totalFiles})
        </button>

        <button
          onClick={() => {
            loadGeneratedTones();
            setShowGeneratedModal(true);
          }}
          className="btn btn-generated"
          style={{ fontSize: '16px', padding: '12px' }}
        >
          🎵 Generated Tones ({generatedTones.length})
        </button>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn btn-generate"
          style={{ fontSize: '16px', padding: '12px' }}
        >
          ✨ Generate New Music
        </button>
      </div>
    </div>
  );
}

export default MusicControls;
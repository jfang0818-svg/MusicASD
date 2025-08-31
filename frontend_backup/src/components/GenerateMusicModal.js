// ========== Updated GenerateMusicModal.js ==========
import React, { useState } from 'react';
import NotificationModal from './NotificationModal';

function GenerateMusicModal({
  show,
  onClose,
  API_URL,
  loadMusicLibrary,
  loadGeneratedTones,
  loading,
  setLoading,
  setError
}) {
  const [generateOptions, setGenerateOptions] = useState({
    style: 'calm',
    duration: 10,
    filename: 'custom_tone',
    tempo: 120,
    key: 'C'
  });

  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  if (!show) return null;

  const generateMusic = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/music/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateOptions)
      });

      if (response.ok) {
        const data = await response.json();

        // Show success notification
        setNotification({
          show: true,
          type: 'success',
          title: 'Generation Complete!',
          message: `Successfully generated: ${data.filename}`
        });

        // Close modal and reload data after a short delay
        setTimeout(() => {
          onClose();
          loadMusicLibrary();
          loadGeneratedTones();
        }, 1500);
      } else {
        const error = await response.text();
        setNotification({
          show: true,
          type: 'error',
          title: 'Generation Failed',
          message: error || 'Failed to generate music'
        });
      }
    } catch (error) {
      console.error('Error generating music:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while generating music'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content generate-modal">
          <div className="modal-header">
            <h2>Generate New Music</h2>
            <button onClick={onClose} className="modal-close">✕</button>
          </div>

          <div className="generate-form">
            {/* Style Selection */}
            <div className="form-group">
              <label>Music Style</label>
              <select
                value={generateOptions.style}
                onChange={(e) => setGenerateOptions({...generateOptions, style: e.target.value})}
              >
                <option value="calm">😌 Calm</option>
                <option value="happy">😊 Happy</option>
                <option value="energetic">🎉 Energetic</option>
              </select>
            </div>

            {/* Duration Slider */}
            <div className="form-group">
              <label>Duration: {generateOptions.duration} seconds</label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={generateOptions.duration}
                onChange={(e) => setGenerateOptions({...generateOptions, duration: parseFloat(e.target.value)})}
              />
              <div className="range-labels">
                <span>5s</span>
                <span>15s</span>
                <span>30s</span>
              </div>
            </div>

            {/* Filename Input */}
            <div className="form-group">
              <label>File Name</label>
              <input
                type="text"
                value={generateOptions.filename}
                onChange={(e) => setGenerateOptions({...generateOptions, filename: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})}
                placeholder="Enter filename"
              />
              <small>Letters, numbers, underscore, and dash only</small>
            </div>

            {/* Tempo Slider */}
            <div className="form-group">
              <label>Tempo: {generateOptions.tempo} BPM</label>
              <input
                type="range"
                min="60"
                max="180"
                step="10"
                value={generateOptions.tempo}
                onChange={(e) => setGenerateOptions({...generateOptions, tempo: parseInt(e.target.value)})}
              />
              <div className="range-labels">
                <span>Slow</span>
                <span>Medium</span>
                <span>Fast</span>
              </div>
            </div>

            {/* Musical Key */}
            <div className="form-group">
              <label>Musical Key</label>
              <select
                value={generateOptions.key}
                onChange={(e) => setGenerateOptions({...generateOptions, key: e.target.value})}
              >
                <option value="C">C Major</option>
                <option value="D">D Major</option>
                <option value="E">E Major</option>
                <option value="F">F Major</option>
                <option value="G">G Major</option>
                <option value="A">A Major</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              onClick={generateMusic}
              disabled={loading || !generateOptions.filename}
              className="btn btn-primary"
            >
              {loading ? '⏳ Generating...' : '✨ Generate'}
            </button>
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({...notification, show: false})}
      />
    </>
  );
}

export default GenerateMusicModal;
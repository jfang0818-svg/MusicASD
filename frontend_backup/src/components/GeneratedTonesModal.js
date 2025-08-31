// ========== GeneratedTonesModal.js - Card-Based with Delete ==========
import React, { useState } from 'react';

function GeneratedTonesModal({ show, onClose, generatedTones, playMusic, sessionActive }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (!show) return null;

  const handleDelete = async (toneName) => {
    try {
      const response = await fetch(`http://localhost:8000/music/generated/delete/${toneName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Reload tones after deletion
        window.location.reload();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting tone:', error);
    }
  };

  const handleCardClick = (tone) => {
    if (sessionActive) {
      playMusic(tone.style, tone.name);
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Generated Tones</h2>
            <button onClick={onClose} className="modal-close">✕</button>
          </div>

          {generatedTones.length > 0 ? (
            <div className="generated-grid">
              {generatedTones.map((tone, i) => (
                <div
                  key={i}
                  className="tone-card"
                  onClick={() => handleCardClick(tone)}
                  title={sessionActive ? "Click to play" : "Start session to play"}
                >
                  <button
                    className="tone-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(tone.name);
                    }}
                    title="Delete tone"
                  >
                    ×
                  </button>
                  <div className="tone-card-content">
                    <div className="tone-name">{tone.name}</div>
                    <div className="tone-details">
                      Style: {tone.style} | Duration: {tone.duration}s
                      {tone.tempo && ` | ${tone.tempo} BPM`}
                    </div>
                    <div className="tone-created">
                      Created: {new Date(tone.created).toLocaleDateString()} {new Date(tone.created).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="music-card card-empty" style={{ padding: '2rem' }}>
              <span>No generated tones yet</span>
            </div>
          )}

          <button onClick={onClose} className="btn btn-close">Close</button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="confirm-dialog">
          <h3>Delete Tone</h3>
          <p>Are you sure you want to delete "{deleteConfirm}"?</p>
          <div className="confirm-actions">
            <button
              className="btn-cancel"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="btn-confirm-delete"
              onClick={() => handleDelete(deleteConfirm)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default GeneratedTonesModal;

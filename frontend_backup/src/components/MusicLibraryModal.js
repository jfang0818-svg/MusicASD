// ========== MusicLibraryModal.js - Card-Based with Delete ==========
import React, { useState } from 'react';

function MusicLibraryModal({
  show,
  onClose,
  musicLibrary,
  loadMusicLibrary,
  playMusic,
  uploadMusicFile,
  sessionActive
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (!show) return null;

  const handleUpload = (e, style) => {
    const file = e.target.files[0];
    if (file) {
      uploadMusicFile(file, style);
      e.target.value = '';
    }
  };

  const handleDelete = async (style, fileName) => {
    try {
      const response = await fetch(`http://localhost:8000/music/delete/${style}/${fileName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadMusicLibrary();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleCardClick = (style, fileName) => {
    if (sessionActive) {
      playMusic(style, fileName);
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Music Library</h2>
            <div className="modal-header-actions">
              <button onClick={loadMusicLibrary} className="btn-refresh">🔄</button>
              <button onClick={onClose} className="modal-close">✕</button>
            </div>
          </div>

          {Object.entries(musicLibrary).map(([style, files]) => (
            <div key={style} className="library-section">
              <h3>
                {style === 'calm' ? '😌' : style === 'happy' ? '😊' : '🎉'}
                {' '}{style.charAt(0).toUpperCase() + style.slice(1)} ({files.length} files)
              </h3>

              <div className="music-cards-grid">
                {files.length > 0 ? (
                  files.map((file, i) => (
                    <div
                      key={i}
                      className="music-card"
                      onClick={() => handleCardClick(style, file.name)}
                      title={sessionActive ? "Click to play" : "Start session to play"}
                    >
                      <button
                        className="card-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ style, fileName: file.name });
                        }}
                        title="Delete file"
                      >
                        ×
                      </button>
                      <div className="card-content">
                        <div className="card-title">{file.name}</div>
                        {file.duration > 0 && (
                          <div className="card-duration">Duration: {file.duration}s</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="music-card card-empty">
                    <span>No files uploaded</span>
                  </div>
                )}
              </div>

              <div className="upload-section">
                <label htmlFor={`upload-${style}`}>Upload new {style} music:</label>
                <input
                  id={`upload-${style}`}
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={(e) => handleUpload(e, style)}
                  className="file-input"
                />
              </div>
            </div>
          ))}

          <button onClick={onClose} className="btn btn-close">Close</button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="confirm-dialog">
          <h3>Delete File</h3>
          <p>Are you sure you want to delete "{deleteConfirm.fileName}"?</p>
          <div className="confirm-actions">
            <button
              className="btn-cancel"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="btn-confirm-delete"
              onClick={() => handleDelete(deleteConfirm.style, deleteConfirm.fileName)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MusicLibraryModal;

// ========== EngagementControls.js ==========
import React from 'react';

function EngagementControls({ engagement, updateEngagement, sessionActive, autoSuggest, setAutoSuggest }) {
  return (
    <>
      <div className="engagement-section">
        <h3>Current Engagement Level</h3>
        <div className="engagement-buttons">
          {['LOW', 'MED', 'HIGH'].map((level) => (
            <button
              key={level}
              onClick={() => updateEngagement(level)}
              disabled={!sessionActive}
              className={`btn-engagement ${engagement === level ? 'active' : ''} ${level.toLowerCase()}`}
            >
              {level === 'LOW' ? '😴 LOW' : level === 'MED' ? '😊 MED' : '🎉 HIGH'}
            </button>
          ))}
        </div>
      </div>

      <div className="auto-suggest-section">
        <label>
          <input
            type="checkbox"
            checked={autoSuggest}
            onChange={(e) => setAutoSuggest(e.target.checked)}
            disabled={!sessionActive}
          />
          <span>Auto-suggest when engagement changes (Default: Off)</span>
        </label>
      </div>
    </>
  );
}

export default EngagementControls;
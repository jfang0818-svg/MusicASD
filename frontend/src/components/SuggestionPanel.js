// ========== SuggestionPanel.js ==========
import React from 'react';

function SuggestionPanel({
  sessionActive,
  currentSuggestion,
  generateSuggestion,
  acceptSuggestion,
  skipSuggestion,
  logResponse
}) {
  if (!sessionActive) return null;

  return (
    <>
      <div className="suggestion-section">
        <h3>Current Suggestion</h3>
        {currentSuggestion ? (
          <div className="suggestion-content">
            <p className="suggestion-phrase">"{currentSuggestion.phrase}"</p>
            <p className="suggestion-details">
              Style: {currentSuggestion.style} | Activity: {currentSuggestion.activity}
            </p>
            <div className="suggestion-actions">
              <button onClick={acceptSuggestion} className="btn btn-accept">
                ✅ Accept & Play
              </button>
              <button onClick={skipSuggestion} className="btn btn-skip">
                ⭐️ Skip
              </button>
              <button onClick={generateSuggestion} className="btn btn-new">
                🔄 New Suggestion
              </button>
            </div>
          </div>
        ) : (
          <button onClick={generateSuggestion} className="btn btn-primary">
            Generate First Suggestion
          </button>
        )}
      </div>

      {currentSuggestion && (
        <div className="response-section">
          <h3>Log Child Response</h3>
          <div className="response-buttons">
            <button onClick={() => logResponse('worked')} className="btn btn-worked">
              😊 Worked Well
            </button>
            <button onClick={() => logResponse('neutral')} className="btn btn-neutral">
              😐 Neutral
            </button>
            <button onClick={() => logResponse('didnt_work')} className="btn btn-didnt-work">
              😔 Didn't Work
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SuggestionPanel;
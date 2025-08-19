
// ========== SessionLogs.js ==========
import React from 'react';

function SessionLogs({ logs }) {
  if (logs.length === 0) return null;

  return (
    <div className="session-logs">
      <h3>Recent Activity</h3>
      <div className="logs-container">
        {logs.slice(-5).reverse().map((log, i) => (
          <div key={i} className="log-entry">
            {log.time}: {log.action} • {log.engagement} {log.style && `• ${log.style}`}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionLogs;

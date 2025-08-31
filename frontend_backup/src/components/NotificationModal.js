// ========== NotificationModal.js - New Component ==========
import React, { useEffect } from 'react';

function NotificationModal({ show, type, title, message, onClose, autoClose = true }) {
  useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onClose, autoClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getClassName = () => {
    return `notification-modal notification-${type || 'info'}`;
  };

  return (
    <div className="notification-overlay">
      <div className={getClassName()}>
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-content">
          {title && <h3 className="notification-title">{title}</h3>}
          <p className="notification-message">{message}</p>
        </div>
        <button
          className="notification-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
        {autoClose && (
          <div className="notification-progress">
            <div className="notification-progress-bar"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationModal;
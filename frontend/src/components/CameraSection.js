// ========== CameraSection.js ==========
import React, { useRef, useEffect } from 'react';

function CameraSection({ cameraEnabled, setCameraEnabled, sessionActive, API_URL }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (cameraEnabled && videoRef.current) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [cameraEnabled]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error) {
      console.error('Camera error:', error);
      setCameraEnabled(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = async () => {
    const newState = !cameraEnabled;
    try {
      const response = await fetch(`${API_URL}/camera/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });

      if (response.ok) {
        setCameraEnabled(newState);
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  return (
    <>
      <button
        onClick={toggleCamera}
        disabled={!sessionActive}
        className={`btn btn-camera ${cameraEnabled ? 'active' : ''}`}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {cameraEnabled ? '📹 Turn Off Camera' : '📷 Turn On Camera'}
      </button>

      {cameraEnabled && (
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-feed"
            style={{ transform: 'scaleX(-1)' }}
          />
          <p className="camera-notice">Camera feed for pose detection (not recorded)</p>
        </div>
      )}
    </>
  );
}

export default CameraSection;
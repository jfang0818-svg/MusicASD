'use client';

import { useRef, useEffect } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface CameraSectionProps {
  cameraEnabled: boolean;
  setCameraEnabled: (enabled: boolean) => void;
  sessionActive: boolean;
}

export function CameraSection({
  cameraEnabled,
  setCameraEnabled,
  sessionActive
}: CameraSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      toast.error('Failed to access camera');
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
    if (!sessionActive) {
      toast.error('Please start a session first');
      return;
    }

    const newState = !cameraEnabled;

    try {
      const response = await fetch('/api/backend/camera/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });

      if (response.ok) {
        setCameraEnabled(newState);
        toast.success(newState ? 'Camera enabled' : 'Camera disabled');
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('Failed to toggle camera');
    }
  };

  return (
    <>
      <button
        onClick={toggleCamera}
        disabled={!sessionActive}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${cameraEnabled
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {cameraEnabled ? (
          <>
            <CameraOff className="h-4 w-4" />
            Turn Off Camera
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Turn On Camera
          </>
        )}
      </button>

      {cameraEnabled && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-64 h-48 rounded-lg object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Camera feed for pose detection (not recorded)
            </p>
          </div>
        </div>
      )}
    </>
  );
}
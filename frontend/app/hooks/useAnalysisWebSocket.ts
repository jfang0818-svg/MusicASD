import { useEffect, useRef, useState, useCallback } from 'react';

interface AnalysisData {
  video_analysis?: {
    emotion: string;
    movement_level: string;
    engagement_score: number;
    face_detected: boolean;
  };
  audio_analysis?: {
    vocal_pattern: string;
    sound_level_db: number;
    vocal_pitch_hz: number;
    speech_detected: boolean;
  };
  timestamp?: string;
}

interface UseAnalysisWebSocketProps {
  sessionId: string;
  enabled: boolean;
  onAnalysisUpdate?: (data: AnalysisData) => void;
}

export function useAnalysisWebSocket({
  sessionId,
  enabled,
  onAnalysisUpdate
}: UseAnalysisWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !sessionId) return;

    const wsUrl = `ws://localhost:8000/ws/analysis/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to analysis service');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AnalysisData;
        setLatestAnalysis(data);
        if (onAnalysisUpdate) {
          onAnalysisUpdate(data);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [sessionId, enabled, onAnalysisUpdate]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      videoStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera');
      throw err;
    }
  }, []);

  // Start audio stream
  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 22050
        }
      });
      audioStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to start audio:', err);
      setError('Failed to access microphone');
      throw err;
    }
  }, []);

  // Capture and send video frame
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!videoStreamRef.current) return;

    try {
      const video = document.createElement('video');
      video.srcObject = videoStreamRef.current;
      video.play();

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1]; // Remove data:image/png;base64, prefix

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'video_frame',
                    data: base64Data,
                    timestamp: new Date().toISOString()
                  }));
                }
              };
              reader.readAsDataURL(blob);
            }
          }, 'image/jpeg', 0.8);
        }
      };
    } catch (err) {
      console.error('Failed to capture frame:', err);
    }
  }, []);

  // Capture and send audio chunk
  const captureAndSendAudio = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!audioStreamRef.current) return;

    try {
      // Create AudioContext for processing
      const audioContext = new AudioContext({ sampleRate: 22050 });
      const source = audioContext.createMediaStreamSource(audioStreamRef.current);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to base64
        const buffer = new ArrayBuffer(audioData.length * 4);
        const view = new Float32Array(buffer);
        view.set(audioData);

        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer))
        );

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: base64,
            timestamp: new Date().toISOString()
          }));
        }

        // Cleanup after sending
        processor.disconnect();
        source.disconnect();
        audioContext.close();
      };
    } catch (err) {
      console.error('Failed to capture audio:', err);
    }
  }, []);

  // Start capture loop (every 5 seconds)
  const startCapture = useCallback(() => {
    // Capture immediately
    captureAndSendFrame();
    captureAndSendAudio();

    // Then every 5 seconds
    captureIntervalRef.current = setInterval(() => {
      captureAndSendFrame();
      captureAndSendAudio();
    }, 5000);
  }, [captureAndSendFrame, captureAndSendAudio]);

  // Stop capture loop
  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
  }, []);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  // Auto-connect when enabled changes to true
  useEffect(() => {
    if (enabled && sessionId && !isConnected && !wsRef.current) {
      connect();
    }
  }, [enabled, sessionId, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      stopCapture();
      stopCamera();
      stopAudio();
    };
  }, [disconnect, stopCapture, stopCamera, stopAudio]);

  return {
    isConnected,
    latestAnalysis,
    error,
    connect,
    disconnect,
    startCamera,
    startAudio,
    startCapture,
    stopCapture,
    stopCamera,
    stopAudio,
    videoStream: videoStreamRef.current,
    audioStream: audioStreamRef.current
  };
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Circle,
  Square,
  Play,
  Trash2,
  Clock
} from 'lucide-react';

interface SessionVideoRecorderProps {
  sessionId: string;
  childId: string;
  childName: string;
  currentPhase?: string;
  currentMusicStyle?: string;
}

interface VideoRecord {
  video_id: string;
  title: string;
  duration_seconds?: number;
  recorded_at: string;
  blob_url?: string;
  thumbnail_url?: string;
  status: string;
}

export default function SessionVideoRecorder({
  sessionId,
  childId,
  childName,
  currentPhase,
  currentMusicStyle
}: SessionVideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [, setCurrentVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load existing videos
  useEffect(() => {
    loadSessionVideos();
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
    };
  }, []);

  const loadSessionVideos = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/videos/session/${sessionId}/list`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Request camera/screen permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Create video record in backend first
      const createResponse = await fetch('http://localhost:8000/videos/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          child_id: childId,
          title: `${childName} - ${new Date().toLocaleString()}`,
          recorded_by: localStorage.getItem('user_email') || 'therapist',
          session_phase: currentPhase,
          music_style: currentMusicStyle,
          privacy: 'therapist_only'
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create video record');
      }

      const videoRecord = await createResponse.json();
      setCurrentVideoId(videoRecord.video_id);

      // Start media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        await uploadVideo(videoRecord.video_id, blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access camera/microphone. Please grant permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const uploadVideo = async (videoId: string, blob: Blob) => {
    try {
      // In a real implementation, you would upload to Azure Blob Storage
      // For now, create a local object URL
      const videoUrl = URL.createObjectURL(blob);
      const fileSizeMB = blob.size / (1024 * 1024);

      // Update video record with metadata
      await fetch(`http://localhost:8000/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'available',
          duration_seconds: recordingDuration,
          file_size_mb: parseFloat(fileSizeMB.toFixed(2)),
          blob_url: videoUrl
        })
      });

      // Reload videos list
      await loadSessionVideos();
      setCurrentVideoId(null);
      setRecordingDuration(0);

    } catch (error) {
      console.error('Failed to upload video:', error);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video recording?')) return;

    try {
      await fetch(`http://localhost:8000/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      await loadSessionVideos();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Session Recording</h3>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            <Circle className="w-6 h-6 fill-current" />
            Start Recording
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-4 h-4 bg-red-600 rounded-full"
                  />
                  <span className="text-red-800 font-bold">Recording</span>
                </div>
                <div className="flex items-center gap-2 text-red-800 font-mono text-lg">
                  <Clock className="w-5 h-5" />
                  {formatDuration(recordingDuration)}
                </div>
              </div>
            </div>
            <button
              onClick={stopRecording}
              className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-colors"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop Recording
            </button>
          </div>
        )}
      </div>

      {/* Videos List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Session Recordings ({videos.length})
        </h4>
        <AnimatePresence>
          {videos.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No recordings yet
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {videos.map((video) => (
                <motion.div
                  key={video.video_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                        {video.duration_seconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(video.duration_seconds)}
                          </span>
                        )}
                        <span>{new Date(video.recorded_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {video.blob_url && (
                        <button
                          onClick={() => setSelectedVideo(video)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Watch"
                        >
                          <Play className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteVideo(video.video_id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Playback Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {selectedVideo.title}
              </h3>
              {selectedVideo.blob_url && (
                <video
                  src={selectedVideo.blob_url}
                  controls
                  className="w-full rounded-lg bg-black"
                  autoPlay
                />
              )}
              <button
                onClick={() => setSelectedVideo(null)}
                className="mt-4 w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

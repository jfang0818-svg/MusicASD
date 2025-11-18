"""
Video Analysis Service using MediaPipe and OpenCV
Analyzes facial emotions and movement patterns every 5 seconds
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime

class VideoAnalyzer:
    def __init__(self):
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_pose = mp.solutions.pose

        # Initialize detectors
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.5
        )
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Movement tracking
        self.previous_landmarks = None

    def analyze_frame(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze a single video frame

        Returns:
        {
            "emotion": "happy|neutral|distressed|calm",
            "movement_level": "low|medium|high",
            "engagement_score": 0.0-1.0,
            "face_detected": bool,
            "timestamp": ISO-8601
        }
        """
        try:
            # Decode frame
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Detect face
            face_results = self.face_detection.process(frame_rgb)
            face_detected = face_results.detections is not None

            if not face_detected:
                return {
                    "emotion": "unknown",
                    "movement_level": "unknown",
                    "engagement_score": 0.0,
                    "face_detected": False,
                    "timestamp": datetime.now().isoformat()
                }

            # Analyze facial landmarks for emotion
            mesh_results = self.face_mesh.process(frame_rgb)
            emotion = self._analyze_emotion(mesh_results)

            # Analyze movement
            pose_results = self.pose.process(frame_rgb)
            movement_level = self._analyze_movement(pose_results)

            # Calculate engagement (combination of factors)
            engagement_score = self._calculate_engagement(
                emotion, movement_level, face_detected
            )

            return {
                "emotion": emotion,
                "movement_level": movement_level,
                "engagement_score": engagement_score,
                "face_detected": True,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Video analysis error: {e}")
            return {
                "emotion": "error",
                "movement_level": "error",
                "engagement_score": 0.0,
                "face_detected": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _analyze_emotion(self, mesh_results) -> str:
        """
        Analyze facial landmarks to determine emotion
        Uses mouth corners, eyebrows, and eye openness
        """
        if not mesh_results.multi_face_landmarks:
            return "neutral"

        landmarks = mesh_results.multi_face_landmarks[0].landmark

        # Extract key points (simplified emotion detection)
        # Left mouth corner: 61, Right mouth corner: 291
        # Left eyebrow: 70, Right eyebrow: 300
        mouth_left = landmarks[61]
        mouth_right = landmarks[291]

        # Calculate mouth curvature (smile detection)
        mouth_y_avg = (mouth_left.y + mouth_right.y) / 2
        nose_tip = landmarks[1].y

        smile_factor = nose_tip - mouth_y_avg

        # Classify emotion
        if smile_factor > 0.02:  # Mouth curves up
            return "happy"
        elif smile_factor < -0.02:  # Mouth curves down
            return "distressed"
        else:
            return "calm"

    def _analyze_movement(self, pose_results) -> str:
        """
        Analyze body movement level
        Compares current pose to previous frame
        """
        if not pose_results.pose_landmarks:
            return "low"

        current_landmarks = pose_results.pose_landmarks.landmark

        if self.previous_landmarks is None:
            self.previous_landmarks = current_landmarks
            return "low"

        # Calculate total movement
        total_movement = 0
        for i, landmark in enumerate(current_landmarks):
            prev = self.previous_landmarks[i]
            movement = np.sqrt(
                (landmark.x - prev.x)**2 +
                (landmark.y - prev.y)**2 +
                (landmark.z - prev.z)**2
            )
            total_movement += movement

        self.previous_landmarks = current_landmarks

        # Classify movement level
        if total_movement > 0.5:
            return "high"
        elif total_movement > 0.2:
            return "medium"
        else:
            return "low"

    def _calculate_engagement(
        self, emotion: str, movement: str, face_detected: bool
    ) -> float:
        """Calculate engagement score 0.0-1.0"""
        if not face_detected:
            return 0.0

        base_score = 0.5

        # Emotion contribution
        emotion_scores = {
            "happy": 0.3,
            "calm": 0.2,
            "neutral": 0.1,
            "distressed": -0.2
        }
        base_score += emotion_scores.get(emotion, 0)

        # Movement contribution
        movement_scores = {
            "medium": 0.2,  # Ideal engagement
            "low": 0.0,
            "high": -0.1   # May indicate overstimulation
        }
        base_score += movement_scores.get(movement, 0)

        return max(0.0, min(1.0, base_score))

    def close(self):
        """Cleanup resources"""
        if self.face_detection:
            self.face_detection.close()
        if self.face_mesh:
            self.face_mesh.close()
        if self.pose:
            self.pose.close()

# Singleton instance
video_analyzer = VideoAnalyzer()

/**
 * Adaptive Music Hook
 *
 * Automatically adjusts music playback based on real-time analysis of:
 * - Child's emotional state (happy, calm, distressed, neutral)
 * - Engagement level (0.0 - 1.0)
 * - Movement level (low, medium, high)
 * - Vocal patterns (laughing, crying, speaking, silent)
 *
 * Clinical logic:
 * - Distressed + high movement → Switch to calming music
 * - Happy + high engagement → Continue current music
 * - Low engagement for 2+ cycles → Try alerting/preferred music
 * - Calm + medium engagement → Maintain current music
 */

import { useEffect, useRef, useState, useMemo } from 'react';

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

interface AdaptiveMusicConfig {
  enabled: boolean;
  minTimeBetweenChanges: number; // milliseconds
  engagementThreshold: {
    low: number;
    high: number;
  };
}

interface AdaptiveMusicRecommendation {
  shouldChange: boolean;
  recommendedStyle: 'calming_regulation' | 'focus_attention' | 'movement_motor' | null;
  reason: string;
  confidence: number;
}

const DEFAULT_CONFIG: AdaptiveMusicConfig = {
  enabled: true,
  minTimeBetweenChanges: 30000, // 30 seconds minimum between changes
  engagementThreshold: {
    low: 0.3,
    high: 0.7,
  },
};

export function useAdaptiveMusic(
  analysis: AnalysisData | null,
  currentMusicStyle: 'calm' | 'happy' | 'energetic' | null,
  config: Partial<AdaptiveMusicConfig> = {}
) {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const [recommendation, setRecommendation] = useState<AdaptiveMusicRecommendation | null>(null);
  const lastChangeTime = useRef<number>(0);
  const lowEngagementCount = useRef<number>(0);
  const previousEmotion = useRef<string | null>(null);

  useEffect(() => {
    if (!analysis || !fullConfig.enabled) {
      if (recommendation !== null) {
        setRecommendation(null);
      }
      return;
    }

    const videoAnalysis = analysis.video_analysis;
    const audioAnalysis = analysis.audio_analysis;

    if (!videoAnalysis) {
      return;
    }

    // Don't change music too frequently
    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTime.current;
    if (timeSinceLastChange < fullConfig.minTimeBetweenChanges) {
      return;
    }

    // Extract key metrics
    const emotion = videoAnalysis.emotion;
    const engagement = videoAnalysis.engagement_score;
    const movementLevel = videoAnalysis.movement_level;
    const vocalPattern = audioAnalysis?.vocal_pattern;

    // Track low engagement patterns
    if (engagement < fullConfig.engagementThreshold.low) {
      lowEngagementCount.current += 1;
    } else {
      lowEngagementCount.current = 0;
    }

    // Detect emotion changes
    const emotionChanged = previousEmotion.current !== emotion;
    previousEmotion.current = emotion;

    // Apply clinical decision logic
    const rec = determineRecommendation({
      emotion,
      engagement,
      movementLevel,
      vocalPattern,
      currentStyle: currentMusicStyle,
      lowEngagementCount: lowEngagementCount.current,
      emotionChanged,
    });

    if (rec.shouldChange) {
      setRecommendation(rec);
      lastChangeTime.current = now;
    } else if (recommendation !== null) {
      setRecommendation(null);
    }
  }, [analysis, currentMusicStyle, fullConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptRecommendation = () => {
    setRecommendation(null);
  };

  const dismissRecommendation = () => {
    setRecommendation(null);
    lastChangeTime.current = Date.now(); // Reset cooldown
  };

  return {
    recommendation,
    acceptRecommendation,
    dismissRecommendation,
  };
}

/**
 * Clinical decision logic for music adaptation
 */
function determineRecommendation(params: {
  emotion: string;
  engagement: number;
  movementLevel: string;
  vocalPattern?: string;
  currentStyle: 'calm' | 'happy' | 'energetic' | null;
  lowEngagementCount: number;
  emotionChanged: boolean;
}): AdaptiveMusicRecommendation {
  const {
    emotion,
    engagement,
    movementLevel,
    vocalPattern,
    currentStyle,
    lowEngagementCount,
    emotionChanged,
  } = params;

  // CRITICAL: Child is distressed - immediate intervention
  if (emotion === 'distressed' && currentStyle !== 'calm') {
    return {
      shouldChange: true,
      recommendedStyle: 'calm',
      reason: 'Child appears distressed. Switching to calming music to help regulate.',
      confidence: 0.95,
    };
  }

  // HIGH PRIORITY: Crying detected - soothing needed
  if (vocalPattern === 'crying' && currentStyle !== 'calm') {
    return {
      shouldChange: true,
      recommendedStyle: 'calm',
      reason: 'Crying detected. Switching to soothing music.',
      confidence: 0.9,
    };
  }

  // MODERATE: Low engagement for multiple cycles - try alerting music
  if (lowEngagementCount >= 2 && engagement < 0.3) {
    if (currentStyle === 'calm') {
      return {
        shouldChange: true,
        recommendedStyle: 'happy',
        reason: 'Low engagement detected. Trying more engaging music.',
        confidence: 0.7,
      };
    } else if (currentStyle === 'happy') {
      return {
        shouldChange: true,
        recommendedStyle: 'energetic',
        reason: 'Engagement still low. Trying more stimulating music.',
        confidence: 0.65,
      };
    }
  }

  // POSITIVE: High engagement with happy emotion - maintain or upgrade
  if (emotion === 'happy' && engagement > 0.7) {
    if (currentStyle === 'calm') {
      return {
        shouldChange: true,
        recommendedStyle: 'happy',
        reason: 'Child is happy and engaged. Matching energy with uplifting music.',
        confidence: 0.8,
      };
    }
    // If already on happy or energetic, maintain
    return {
      shouldChange: false,
      recommendedStyle: null,
      reason: 'Child is happy and engaged. Current music is working well.',
      confidence: 0.85,
    };
  }

  // TRANSITION: Moving from distressed to calm - gentle progression
  if (emotion === 'calm' && emotionChanged && currentStyle === 'calm') {
    return {
      shouldChange: false,
      recommendedStyle: null,
      reason: 'Child is calming down. Maintaining current music.',
      confidence: 0.8,
    };
  }

  // OVERSTIMULATION: High movement + moderate engagement + energetic music
  if (
    movementLevel === 'high' &&
    engagement < 0.5 &&
    currentStyle === 'energetic'
  ) {
    return {
      shouldChange: true,
      recommendedStyle: 'happy',
      reason: 'High activity with lower engagement. Reducing stimulation slightly.',
      confidence: 0.7,
    };
  }

  // NEUTRAL: Neutral emotion with medium engagement - slightly uplift
  if (
    emotion === 'neutral' &&
    engagement > 0.4 &&
    engagement < 0.7 &&
    currentStyle === 'calm'
  ) {
    return {
      shouldChange: true,
      recommendedStyle: 'happy',
      reason: 'Child is ready for more engaging music.',
      confidence: 0.65,
    };
  }

  // DEFAULT: No change needed
  return {
    shouldChange: false,
    recommendedStyle: null,
    reason: 'Current music is appropriate for child\'s state.',
    confidence: 0.6,
  };
}

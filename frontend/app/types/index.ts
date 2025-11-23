// User types
export interface User {
  id: string;
  email: string;
  name: string;
}

// Music Style Types - ASD-Specific Therapeutic Categories
export type MusicStyle =
  | 'calming_regulation'    // Meltdown prevention, self-regulation, transitions
  | 'focus_attention'       // Task engagement, concentration
  | 'social_interactive'    // Turn-taking, joint attention, social skills
  | 'movement_motor'        // Physical activity, gross motor skills
  | 'sensory_seeking'       // For hypo-sensitive individuals needing stimulation
  | 'sensory_soothing'      // For hyper-sensitive individuals needing gentle input
  | 'sleep_rest'            // Bedtime routines, relaxation
  | 'transition';           // Activity changes, preparing for new activities

// Metric types for session tracking
export interface SessionMetric {
  id: string;
  title: string;
  type: 'binary' | 'categorical';
  binaryValue?: boolean;
  categoricalValue?: string;
  options?: string[];
}

// Session types
export interface Session {
  id: string;
  userId: string;
  participantName?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  avgEngagement: number;
  musicPlayed: string[];
  status: 'active' | 'paused' | 'completed';
  metrics?: SessionMetric[];
  quickNotes?: string;
}

// Music types
export interface MusicFile {
  name: string;
  duration?: number;
  url?: string;
  category?: MusicStyle;  // Primary category
  categories?: MusicStyle[];  // All categories this music belongs to
}

export interface MusicLibrary {
  calming_regulation: MusicFile[];
  focus_attention: MusicFile[];
  social_interactive: MusicFile[];
  movement_motor: MusicFile[];
  sensory_seeking: MusicFile[];
  sensory_soothing: MusicFile[];
  sleep_rest: MusicFile[];
  transition: MusicFile[];
}

export interface MusicTrack {
  id: string;
  name: string;
  category: MusicStyle;  // Primary category
  categories?: MusicStyle[];  // All categories
  duration: number;
  url: string;
  generated?: boolean;
}

export interface GeneratedTone {
  name: string;
  style: MusicStyle;  // Primary style
  categories?: MusicStyle[];  // All categories
  duration: number;
  tempo?: number;
  created: string;
  url?: string;
}

// Engagement types
export interface EngagementData {
  timestamp: number;
  attention: number;
  interaction: number;
  response: number;
  overall: number;
}

// Dashboard types
export interface DashboardStats {
  totalSessions: number;
  avgEngagement: number;
  totalDuration: number;
  activeUsers: number;
}

// Music generation types
export interface GenerateMusicParams {
  mood: MusicStyle;
  style?: MusicStyle;
  duration: number;
  tempo?: number;
  instruments?: string[];
  filename?: string;
  key?: string;
}

// Suggestion types
export interface Suggestion {
  phrase: string;
  style: MusicStyle;
  activity: string;
  reasoning?: string;
}

// Log types
export interface LogEntry {
  id?: string;
  timestamp: string;
  event: string;
  engagement?: string;
  musicStyle?: string;
  suggestion?: string;
  caregiverAction?: string;
  childResponse?: string;
  note?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Modal props types
export interface ModalProps {
  show: boolean;
  onClose: () => void;
}

// Component prop types
export interface WithClassName {
  className?: string;
}

export interface WithChildren {
  children: React.ReactNode;
}

// Sprint 2: Sound Matching Game types
export interface Sound {
  id: string;
  name: string;
  file: string;
  image: string;
}

export interface SoundCategory {
  [key: string]: Sound[];
}

export interface SoundMatchingGame {
  game_id: string;
  session_id: string;
  child_id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  started_at: string;
  ended_at?: string;
  total_rounds: number;
  correct_matches: number;
  accuracy?: number;
  avg_response_time?: number;
  status: 'active' | 'completed';
}

export interface SoundRound {
  target: Sound;
  choices: Sound[];
  difficulty: string;
  category: string;
}

// Sprint 2: Ambient Music types
export interface AmbientEnvironment {
  name: string;
  description: string;
  layers: string[];
  density: number;
  brightness: number;
  movement: number;
  base_frequency: number;
}

export interface AmbientSession {
  ambient_id: string;
  child_id: string;
  session_id?: string;
  environment: string;
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  parameters: {
    density: number;
    brightness: number;
    movement: number;
    base_frequency: number;
    [key: string]: any;
  };
  regulation_effect?: string;
  effectiveness?: number;
  status: 'active' | 'completed';
}

// Sprint 2: Musical Storytelling types
export interface StoryScene {
  id: string;
  title: string;
  narrative: string;
  music_cue: string;
  participation: {
    type: string;
    action: string;
    prompt: string;
  };
  duration_seconds: number;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  therapeutic_goals: string[];
  music_style: string;
  scenes: StoryScene[];
}

export interface StorytellingSession {
  storytelling_id: string;
  session_id: string;
  child_id: string;
  story_id: string;
  story_title: string;
  started_at: string;
  ended_at?: string;
  current_scene: number;
  completed_scenes: Array<{
    scene_id: string;
    completed_at: string;
    participation_level: 'high' | 'moderate' | 'low' | 'none';
    child_response?: string;
    notes?: string;
  }>;
  overall_engagement?: string;
  status: 'active' | 'completed';
}

// Sprint 2: AI Music Recommendations types
export interface MusicRecommendation {
  name: string;
  style: string;
  energy: string;
  tags: string[];
  recommendation_score: number;
  recommendation_reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface MusicInsights {
  child_id: string;
  analysis_period: {
    total_sessions: number;
    total_favorites: number;
    avg_quality_score: number;
  };
  favorite_styles: Array<{ style: string; count: number }>;
  style_performance: Array<{
    style: string;
    avg_quality: number;
    total_sessions: number;
    consistency: 'high' | 'moderate' | 'varied';
  }>;
  engagement_patterns: Array<{ type: string; count: number }>;
  time_of_day_patterns: { [key: string]: number };
  best_performing_songs: Array<{
    song: string;
    avg_quality: number;
    play_count: number;
  }>;
  recommendations: string[];
}

// Sprint 2: Movement Activities types
export interface Movement {
  id: string;
  name: string;
  description: string;
  music_cue: string;
  sound_effect?: string;
  duration_seconds: number;
  instructions: string;
}

export interface MovementActivity {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  therapeutic_goals: string[];
  energy_level: 'low' | 'medium' | 'medium_high' | 'high' | 'variable';
  movements: Movement[];
}

export interface MovementSession {
  movement_id: string;
  session_id: string;
  child_id: string;
  activity_id: string;
  activity_name: string;
  started_at: string;
  ended_at?: string;
  current_movement: number;
  completed_movements: Array<{
    movement_index: number;
    completed_at: string;
    participation: 'full' | 'partial' | 'minimal' | 'refused';
    quality: 'excellent' | 'good' | 'fair' | 'needs_support';
    modifications_needed?: string[];
    notes?: string;
  }>;
  overall_engagement?: string;
  status: 'active' | 'completed';
}

// Sprint 2: Emotion-Matching Music types
export interface EmotionProfile {
  emotion: string;
  label: string;
  intensity: number;
  musical_characteristics: {
    tempo: number;
    key: 'major' | 'minor';
    dynamics: string;
    texture: string;
    predictability: string;
  };
  iso_principle_target: string;
  recommended_duration: number;
}

export interface EmotionMusicSession {
  emotion_session_id: string;
  session_id: string;
  child_id: string;
  started_at: string;
  ended_at?: string;
  initial_emotion: string;
  target_emotion: string;
  current_emotion: string;
  session_goal: 'regulation' | 'maintenance' | 'exploration';
  transition_plan: Array<{
    phase_number: number;
    emotion: string;
    characteristics: any;
    duration_minutes: number;
  }>;
  current_phase: number;
  emotion_checks: Array<{
    timestamp: string;
    emotion: string;
    intensity: number;
    behavioral_changes?: string[];
    notes?: string;
    phase: number;
  }>;
  final_emotion?: string;
  goal_achieved?: boolean;
  effectiveness?: number;
  status: 'active' | 'completed';
}

// Planned Session types
export interface PlannedSession {
  id: string;
  childId: string;
  title: string;
  scheduledDateTime: string;
  status: 'upcoming' | 'completed' | 'missed' | 'template';
  goals: string[]; // Goal IDs or goal titles
  activities: string[]; // Activity IDs or names
  musicStyles: MusicStyle[];
  customPlaylist?: string;
  notes: string;
  duration: number; // minutes
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}
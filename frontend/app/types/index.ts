// User types
export interface User {
  id: string;
  email: string;
  name: string;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  avgEngagement: number;
  musicPlayed: string[];
  status: 'active' | 'paused' | 'completed';
}

// Music types
export interface MusicFile {
  name: string;
  duration?: number;
  url?: string;
}

export interface MusicLibrary {
  calm: MusicFile[];
  happy: MusicFile[];
  energetic: MusicFile[];
}

export interface MusicTrack {
  id: string;
  name: string;
  category: 'calm' | 'happy' | 'energetic';
  duration: number;
  url: string;
  generated?: boolean;
}

export interface GeneratedTone {
  name: string;
  style: 'calm' | 'happy' | 'energetic';
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
  mood: 'calm' | 'happy' | 'energetic';
  style?: 'calm' | 'happy' | 'energetic';
  duration: number;
  tempo?: number;
  instruments?: string[];
  filename?: string;
  key?: string;
}

// Suggestion types
export interface Suggestion {
  phrase: string;
  style: 'calm' | 'happy' | 'energetic';
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
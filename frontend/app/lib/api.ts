import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { MusicStyle } from '@/app/types';

// API Base URLs from environment variables
// Use Next.js proxy for API calls to avoid CORS issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/backend';
const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3000/api/mcp';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

// Create axios instances
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const mcpClient = axios.create({
  baseURL: MCP_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Error handler
const handleApiError = (error: AxiosError) => {
  const message = (error.response?.data as any)?.detail ||
                  (error.response?.data as any)?.message ||
                  'An unexpected error occurred';

  // Only log non-404 errors to console (404s are often expected)
  if (error.response?.status !== 404) {
    console.error('API Error:', error);
  }

  // Handle 401 (unauthorized) - redirect to login
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  } else if (error.response?.status !== 404) {
    // Don't show toast for 404 errors - let calling code handle them
    toast.error(message);
  }

  throw error;
};

// Request interceptors
apiClient.interceptors.response.use(
  response => response,
  handleApiError
);

mcpClient.interceptors.response.use(
  response => response,
  handleApiError
);

// Types
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

export interface MusicTrack {
  id: string;
  name: string;
  category: MusicStyle;  // Primary category
  categories?: MusicStyle[];  // All categories
  duration: number;
  url: string;
  generated?: boolean;
}

export interface EngagementData {
  timestamp: number;
  attention: number;
  interaction: number;
  response: number;
  overall: number;
}

export interface DashboardStats {
  totalSessions: number;
  avgEngagement: number;
  totalDuration: number;
  activeUsers: number;
}

export interface GenerateMusicParams {
  mood: MusicStyle;  // Primary category
  categories?: MusicStyle[];  // Additional categories
  duration: number;
  tempo?: number;
  instruments?: string[];
}

// API Functions

// Session Management
export async function startSession(userId: string): Promise<Session> {
  const { data } = await apiClient.post('/sessions/start', { userId });
  return data;
}

export async function endSession(sessionId: string): Promise<Session> {
  const { data } = await apiClient.post(`/sessions/${sessionId}/end`);
  return data;
}

export async function pauseSession(sessionId: string): Promise<Session> {
  const { data } = await apiClient.post(`/sessions/${sessionId}/pause`);
  return data;
}

export async function resumeSession(sessionId: string): Promise<Session> {
  const { data } = await apiClient.post(`/sessions/${sessionId}/resume`);
  return data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const { data } = await apiClient.get(`/sessions/${sessionId}`);
  return data;
}

export async function getSessions(limit = 20): Promise<Session[]> {
  const { data } = await apiClient.get('/session/sessions', { params: { limit } });
  return data;
}

export async function updateSessionMetrics(sessionId: string, metrics: any[]): Promise<any> {
  const { data } = await apiClient.post(`/session/sessions/${sessionId}/metrics`, metrics);
  return data;
}

export async function updateSessionNotes(sessionId: string, quickNotes: string): Promise<any> {
  const { data } = await apiClient.post(`/session/sessions/${sessionId}/notes`, { quick_notes: quickNotes });
  return data;
}

// Music Library
export async function getMusicLibrary(): Promise<MusicTrack[]> {
  const { data } = await apiClient.get('/music/library');
  return data;
}

export async function getMusicByCategory(category: MusicStyle): Promise<MusicTrack[]> {
  const { data } = await apiClient.get(`/music/category/${category}`);
  return data;
}

export async function generateMusic(params: GenerateMusicParams): Promise<MusicTrack> {
  const { data } = await apiClient.post('/music/generate', params);
  return data;
}

export async function deleteGeneratedMusic(trackId: string): Promise<void> {
  await apiClient.delete(`/music/generated/${trackId}`);
}

// Engagement Tracking
export async function sendEngagementData(level: string): Promise<void> {
  await apiClient.post('/engagement', { level });
}

export async function getEngagementHistory(): Promise<any> {
  const { data } = await apiClient.get('/engagement/history');
  return data;
}

// Dashboard & Analytics
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/analytics/dashboard');
  return data;
}

export async function getSessionAnalytics(sessionId: string) {
  const { data } = await apiClient.get(`/api/v1/analytics/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/session/sessions/${sessionId}`);
}

// MCP Server Communication
export async function getMCPSuggestions(context: {
  engagement: number;
  mood: string;
  duration: number;
}): Promise<string[]> {
  const { data } = await mcpClient.post('/suggestions', context);
  return data;
}

// WebSocket Connection for real-time updates
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(sessionId: string) {
    const wsUrl = `${WS_URL}/session/${sessionId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);

        // Emit specific event types
        if (data.type) {
          this.emit(data.type, data.payload);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected');
      this.scheduleReconnect(sessionId);
    };
  }

  private scheduleReconnect(sessionId: string) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect(sessionId);
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

// Export a singleton WebSocket client instance
export const wsClient = new WebSocketClient();

// ==================== AUTH API ====================

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

export async function loginUser(data: { email: string; password: string }) {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// ==================== PROFILE API ====================

export async function createChildProfile(data: any) {
  const response = await apiClient.post('/profile/child', data);
  return response.data;
}

export async function getChildProfiles() {
  const response = await apiClient.get('/profile/children');
  return response.data;
}

export async function getChildProfile(childId: string) {
  const response = await apiClient.get(`/profile/child/${childId}`);
  return response.data;
}

export async function updateChildProfile(childId: string, data: any) {
  const response = await apiClient.put(`/profile/child/${childId}`, data);
  return response.data;
}

export async function deleteChildProfile(childId: string) {
  const response = await apiClient.delete(`/profile/child/${childId}`);
  return response.data;
}

export async function analyzeChildProfile(childId: string) {
  const response = await apiClient.post(`/profile/child/${childId}/analyze`);
  return response.data;
}

export async function getMusicElements(childId: string) {
  const response = await apiClient.get(`/profile/child/${childId}/music-elements`);
  return response.data;
}

// ==================== DOCUMENT API ====================

export async function uploadProfileDocument(childId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(
    `/profile/child/${childId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function getProfileDocuments(childId: string) {
  const response = await apiClient.get(`/profile/child/${childId}/documents`);
  return response.data;
}

export async function deleteProfileDocument(childId: string, blobPath: string) {
  const encodedPath = encodeURIComponent(blobPath);
  const response = await apiClient.delete(`/profile/child/${childId}/documents/${encodedPath}`);
  return response.data;
}

// ==================== SESSION API (Updated) ====================

export async function startSessionForChild(childId: string) {
  const response = await apiClient.post('/session/start', { child_id: childId });
  return response.data;
}

export async function stopSessionUpdated() {
  const response = await apiClient.post('/session/stop');
  return response.data;
}

export async function getChildSessions(childId: string) {
  const response = await apiClient.get(`/session/child/${childId}/sessions`);
  return response.data;
}

// ==================== ANALYTICS API ====================

export async function getMusicEffectiveness(childId: string) {
  const response = await apiClient.get(`/api/v1/analytics/music-effectiveness/${childId}`);
  return response.data;
}

export async function getEngagementTrends(childId: string, days: number = 30) {
  const response = await apiClient.get(`/api/v1/analytics/engagement-trends/${childId}?days=${days}`);
  return response.data;
}

export async function getDashboardAnalytics() {
  const response = await apiClient.get('/api/v1/analytics/dashboard');
  return response.data;
}

// ==================== MUSIC RECOMMENDATIONS API ====================

export interface MusicRecommendation {
  recommended_style: MusicStyle;
  tempo_bpm: string;
  musical_key: string;
  mood: string;
  instruments: string[];
  duration_minutes: string;
  volume_level: 'soft' | 'moderate' | 'loud';
  transition_type: 'gradual' | 'immediate';
  specific_parameters: {
    complexity: string;
    rhythm_pattern: string;
    melodic_contour: string;
    harmonic_structure: string;
  };
  therapeutic_rationale: string;
  expected_outcome: string;
  caregiver_phrase: string;
  confidence_score: string;
  alternative_if_ineffective?: string;
}

export async function getMusicRecommendation(data: {
  child_id: string;
  current_engagement: 'LOW' | 'MED' | 'HIGH';
  caregiver_goals?: string[];
  time_of_day?: string;
  session_duration?: number;
}) {
  const response = await apiClient.post('/music/recommend', data);
  return response.data;
}

export async function submitMusicFeedback(data: {
  session_id: string;
  child_id: string;
  music_style: string;
  tempo?: number;
  effectiveness: 'very_effective' | 'effective' | 'neutral' | 'not_effective';
  notes?: string;
  outcome_notes?: string;
}) {
  const response = await apiClient.post('/music/feedback', data);
  return response.data;
}

export async function getMusicFeedbackHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/music/feedback/history/${childId}?limit=${limit}`);
  return response.data;
}

// ==================== MUSIC RESPONSE METRICS API ====================

export interface MusicResponseMetrics {
  session_id: string;
  child_id: string;
  music_file: string;
  music_style: MusicStyle;
  duration_played: number;

  // Binary Metrics
  initiation: boolean | null;
  response_to_prompt: boolean | null;
  communication: boolean | null;
  motor_movement: boolean | null;
  aversion: boolean | null;

  // Categorical Metrics
  task_persistence: 'none' | 'partial' | 'majority' | 'full' | null;
  rhythmic_sync: 'none' | 'brief' | 'continuous' | null;
  emotion: 'disengaged' | 'neutral' | 'positive' | null;
  deviance_from_typical: 'significantly_less' | 'somewhat_less' | 'typical' | 'somewhat_greater' | 'significantly_greater' | null;

  // Notes
  observer_notes: string;
}

export async function submitMusicResponseMetrics(data: MusicResponseMetrics) {
  const response = await apiClient.post('/music-response/assess', data);
  return response.data;
}

export async function getSessionMusicResponses(childId: string, sessionId: string) {
  const response = await apiClient.get(`/music-response/child/${childId}/session/${sessionId}`);
  return response.data;
}

export async function getAggregateMusicMetrics(childId: string, days: number = 30) {
  const response = await apiClient.get(`/music-response/child/${childId}/aggregate?days=${days}`);
  return response.data;
}

// ==================== GOALS API ====================

export interface TherapyGoal {
  goal_id: string;
  child_id: string;
  category: 'communication' | 'joint_attention' | 'emotional_regulation' | 'social_skills' | 'motor_skills' | 'sensory_processing';
  title: string;
  description: string;
  measurement_type: 'count' | 'duration' | 'frequency' | 'quality_1_5' | 'percentage' | 'yes_no';
  baseline: number;
  target: number;
  unit: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'revised' | 'discontinued';
  current_value: number;
  sessions_tracked: number;
  created_date: string;
  target_date?: string;
  notes?: string;
  intervention_strategies: string[];
}

export interface GoalProgress {
  progress_id: string;
  goal_id: string;
  session_id: string;
  measured_value: number;
  measurement_type: string;
  timestamp: string;
  notes?: string;
  music_style_used?: string;
  engagement_level?: string;
  relative_to_baseline?: number;
  relative_to_target?: number;
}

export interface GoalSummary {
  goal: TherapyGoal;
  progress_entries: GoalProgress[];
  total_sessions: number;
  average_value: number;
  latest_value: number;
  improvement_percent: number;
  target_progress_percent: number;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  sessions_above_target: number;
  sessions_below_target: number;
  ai_recommendation?: string;
}

export async function getGoalTemplates() {
  const response = await apiClient.get('/goals/templates');
  return response.data;
}

export async function createGoal(data: {
  child_id: string;
  category: string;
  title: string;
  description: string;
  measurement_type: string;
  baseline: number;
  target: number;
  unit: string;
  target_date?: string;
  notes?: string;
  intervention_strategies?: string[];
}) {
  const response = await apiClient.post('/goals/create', data);
  return response.data;
}

export async function getChildGoals(
  childId: string,
  statusFilter?: string,
  categoryFilter?: string
) {
  const params = new URLSearchParams();
  if (statusFilter) params.append('status_filter', statusFilter);
  if (categoryFilter) params.append('category_filter', categoryFilter);

  const response = await apiClient.get(`/goals/child/${childId}?${params.toString()}`);
  return response.data;
}

export async function getGoal(goalId: string) {
  const response = await apiClient.get(`/goals/${goalId}`);
  return response.data;
}

export async function updateGoal(goalId: string, data: {
  title?: string;
  description?: string;
  target?: number;
  target_date?: string;
  status?: string;
  notes?: string;
  intervention_strategies?: string[];
}) {
  const response = await apiClient.put(`/goals/${goalId}`, data);
  return response.data;
}

export async function deleteGoal(goalId: string) {
  const response = await apiClient.delete(`/goals/${goalId}`);
  return response.data;
}

export async function recordGoalProgress(data: {
  goal_id: string;
  session_id: string;
  measured_value: number;
  notes?: string;
  music_style_used?: string;
  engagement_level?: string;
}) {
  const response = await apiClient.post('/goals/progress/record', data);
  return response.data;
}

export async function getGoalSummary(goalId: string) {
  const response = await apiClient.get(`/goals/${goalId}/summary`);
  return response.data;
}

// ==================== SESSION NOTES API ====================

export interface SessionNote {
  note_id: string;
  session_id: string;
  child_id: string;
  note_type: 'observation' | 'breakthrough' | 'challenge' | 'safety' | 'strategy' | 'response';
  content: string;
  timestamp: string;
  session_time_elapsed?: number;
  music_style?: string;
  engagement_level?: string;
  session_phase?: string;
  created_by?: string;
  tags: string[];
}

export async function createSessionNote(data: {
  session_id: string;
  child_id: string;
  note_type: string;
  content: string;
  session_time_elapsed?: number;
  music_style?: string;
  engagement_level?: string;
  session_phase?: string;
  tags?: string[];
}) {
  const response = await apiClient.post('/session-notes/create', data);
  return response.data;
}

export async function getSessionNotes(sessionId: string, noteType?: string) {
  const params = noteType ? `?note_type=${noteType}` : '';
  const response = await apiClient.get(`/session-notes/session/${sessionId}${params}`);
  return response.data;
}

export async function getChildNotes(childId: string, limit = 50, noteType?: string) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (noteType) params.append('note_type', noteType);

  const response = await apiClient.get(`/session-notes/child/${childId}?${params.toString()}`);
  return response.data;
}

export async function updateSessionNote(noteId: string, data: {
  content?: string;
  note_type?: string;
  tags?: string[];
}) {
  const response = await apiClient.put(`/session-notes/${noteId}`, data);
  return response.data;
}

export async function deleteSessionNote(noteId: string) {
  const response = await apiClient.delete(`/session-notes/${noteId}`);
  return response.data;
}

export async function getSessionNotesSummary(sessionId: string) {
  const response = await apiClient.get(`/session-notes/session/${sessionId}/summary`);
  return response.data;
}

// ==================== CHILD ANALYTICS API ====================

export async function getChildProgressSummary(childId: string, days = 30) {
  const response = await apiClient.get(`/child-analytics/${childId}/progress-summary?days=${days}`);
  return response.data;
}

export async function getGoalProgressTimeline(childId: string, goalId?: string, days = 30) {
  const params = new URLSearchParams();
  params.append('days', days.toString());
  if (goalId) params.append('goal_id', goalId);

  const response = await apiClient.get(`/child-analytics/${childId}/goal-progress-timeline?${params.toString()}`);
  return response.data;
}

export async function getSessionInsights(childId: string, days = 30) {
  const response = await apiClient.get(`/child-analytics/${childId}/session-insights?days=${days}`);
  return response.data;
}

// ==================== HOME ROUTINES API ====================

export async function getRoutineTemplates() {
  const response = await apiClient.get('/home-routines/templates');
  return response.data;
}

export async function createHomeRoutine(data: {
  child_id: string;
  name: string;
  routine_type: string;
  time_of_day: string;
  description: string;
  music_style: string;
  duration_minutes: number;
  scheduled_time?: string;
  days_of_week?: string[];
  icon?: string;
  color?: string;
  notes?: string;
}) {
  const response = await apiClient.post('/home-routines/create', data);
  return response.data;
}

export async function getChildRoutines(childId: string, activeOnly = true) {
  const response = await apiClient.get(`/home-routines/child/${childId}?active_only=${activeOnly}`);
  return response.data;
}

export async function updateHomeRoutine(routineId: string, data: {
  name?: string;
  description?: string;
  music_style?: string;
  duration_minutes?: number;
  scheduled_time?: string;
  days_of_week?: string[];
  active?: boolean;
  notes?: string;
}) {
  const response = await apiClient.put(`/home-routines/${routineId}`, data);
  return response.data;
}

export async function deleteHomeRoutine(routineId: string) {
  const response = await apiClient.delete(`/home-routines/${routineId}`);
  return response.data;
}

export async function createPlaylist(data: {
  child_id: string;
  name: string;
  description: string;
  music_style: string;
  session_id?: string;
}) {
  const response = await apiClient.post('/home-routines/playlist/create', data);
  return response.data;
}

export async function getChildPlaylists(childId: string) {
  const response = await apiClient.get(`/home-routines/playlist/child/${childId}`);
  return response.data;
}

export async function getDailySchedule(childId: string) {
  const response = await apiClient.get(`/home-routines/child/${childId}/daily-schedule`);
  return response.data;
}

// ==================== Interactive Activities API ====================

export async function getActivityTemplates() {
  const response = await apiClient.get('/activities/templates');
  return response.data;
}

export async function startActivity(data: {
  session_id: string;
  child_id: string;
  activity_type: string;
  participants: string[];
}) {
  const response = await apiClient.post('/activities/start', data);
  return response.data;
}

export async function getActivitySession(activitySessionId: string) {
  const response = await apiClient.get(`/activities/${activitySessionId}`);
  return response.data;
}

export async function recordTurn(data: {
  activity_session_id: string;
  participant_name: string;
  turn_status: string;
  engagement_level?: string;
  completed_successfully?: boolean;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/turn/record', data);
  return response.data;
}

export async function getActivityTurns(activitySessionId: string) {
  const response = await apiClient.get(`/activities/turns/${activitySessionId}`);
  return response.data;
}

export async function completeActivity(data: {
  activity_session_id: string;
  engagement_rating: number;
  therapist_notes?: string;
}) {
  const response = await apiClient.put('/activities/complete', data);
  return response.data;
}

export async function getSessionActivities(sessionId: string) {
  const response = await apiClient.get(`/activities/session/${sessionId}/all`);
  return response.data;
}

export async function getChildActivityHistory(childId: string, limit = 20) {
  const response = await apiClient.get(`/activities/child/${childId}/history?limit=${limit}`);
  return response.data;
}

// ==================== Session Videos API ====================

export async function createVideo(data: {
  session_id: string;
  child_id: string;
  title: string;
  recorded_by: string;
  session_phase?: string;
  music_style?: string;
  notes?: string;
  privacy?: string;
}) {
  const response = await apiClient.post('/videos/create', data);
  return response.data;
}

export async function getVideo(videoId: string) {
  const response = await apiClient.get(`/videos/${videoId}`);
  return response.data;
}

export async function updateVideo(videoId: string, data: {
  title?: string;
  notes?: string;
  privacy?: string;
  tags?: string[];
  status?: string;
  duration_seconds?: number;
  file_size_mb?: number;
  blob_url?: string;
  thumbnail_url?: string;
}) {
  const response = await apiClient.put(`/videos/${videoId}`, data);
  return response.data;
}

export async function listSessionVideos(sessionId: string) {
  const response = await apiClient.get(`/videos/session/${sessionId}/list`);
  return response.data;
}

export async function listChildVideos(childId: string, limit = 20) {
  const response = await apiClient.get(`/videos/child/${childId}/list?limit=${limit}`);
  return response.data;
}

export async function deleteVideo(videoId: string) {
  const response = await apiClient.delete(`/videos/${videoId}`);
  return response.data;
}

export async function createVideoClip(data: {
  video_id: string;
  title: string;
  start_time_seconds: number;
  end_time_seconds: number;
  description: string;
  clip_type: string;
  privacy?: string;
}) {
  const response = await apiClient.post('/videos/clips/create', data);
  return response.data;
}

export async function listVideoClips(videoId: string) {
  const response = await apiClient.get(`/videos/clips/video/${videoId}`);
  return response.data;
}

export async function shareVideo(data: {
  video_id: string;
  shared_with_email: string;
  shared_with_name: string;
  share_message?: string;
  expires_days?: number;
}) {
  const response = await apiClient.post('/videos/share', data);
  return response.data;
}

// ==================== Gamification API ====================

export async function getAllAchievements() {
  const response = await apiClient.get('/gamification/achievements');
  return response.data;
}

export async function getChildProgress(childId: string) {
  const response = await apiClient.get(`/gamification/child/${childId}/progress`);
  return response.data;
}

export async function updateChildProgress(data: {
  child_id: string;
  sessions_increment?: number;
  activities_increment?: number;
  goals_increment?: number;
  update_streak?: boolean;
}) {
  const response = await apiClient.put(`/gamification/child/${data.child_id}/progress`, data);
  return response.data;
}

export async function unlockAchievement(data: {
  child_id: string;
  achievement_id: string;
  session_id?: string;
  unlocked_by?: string;
}) {
  const response = await apiClient.post('/gamification/unlock', data);
  return response.data;
}

export async function getUnlockedAchievements(childId: string) {
  const response = await apiClient.get(`/gamification/child/${childId}/unlocked`);
  return response.data;
}

export async function getNewAchievements(childId: string) {
  const response = await apiClient.get(`/gamification/child/${childId}/new-achievements`);
  return response.data;
}

export async function markAchievementSeen(unlockId: string, childId: string) {
  const response = await apiClient.put(`/gamification/achievement/${unlockId}/mark-seen?child_id=${childId}`);
  return response.data;
}

// ==================== FAVORITES API ====================

export interface FavoriteSong {
  id: string;
  music_file: string;
  music_style: MusicStyle;
  date_added: string;
  tags: string[];
  play_count: number;
  total_duration_played: number;
  quality_scores: number[];
  avg_quality_score?: number;
  last_played: string | null;
}

export async function addToFavorites(data: {
  child_id: string;
  music_file: string;
  music_style: MusicStyle;
  context_tags?: string[];
  quality_score?: number;
}) {
  const response = await apiClient.post(`/favorites/child/${data.child_id}/add`, {
    music_file: data.music_file,
    music_style: data.music_style,
    context_tags: data.context_tags || [],
    quality_score: data.quality_score
  });
  return response.data;
}

export async function getFavorites(childId: string) {
  const response = await apiClient.get(`/favorites/child/${childId}`);
  return response.data;
}

export async function removeFromFavorites(childId: string, favoriteId: string) {
  const response = await apiClient.delete(`/favorites/child/${childId}/favorite/${favoriteId}`);
  return response.data;
}

export async function trackFavoritePlay(data: {
  child_id: string;
  favorite_id: string;
  duration: number;
  quality_score?: number;
}) {
  const response = await apiClient.post(
    `/favorites/child/${data.child_id}/favorite/${data.favorite_id}/track-play`,
    {
      duration: data.duration,
      quality_score: data.quality_score
    }
  );
  return response.data;
}

export async function updateFavoriteTags(data: {
  child_id: string;
  favorite_id: string;
  tags: string[];
}) {
  const response = await apiClient.put(
    `/favorites/child/${data.child_id}/favorite/${data.favorite_id}/tags`,
    {
      tags: data.tags
    }
  );
  return response.data;
}

// ==================== FREEZE GAME API ====================

export interface FreezeGameRound {
  round_number?: number;
  timestamp: string;
  music_duration: number;
  child_froze: boolean;
  reaction_time?: number;
  notes?: string;
}

export interface FreezeGameSummary {
  game_id: string;
  session_id: string;
  child_id: string;
  activity_type: 'freeze_game';
  ended_at: string;
  total_rounds: number;
  successful_freezes: number;
  success_rate: number;
  total_duration: number;
  overall_engagement: string;
  notes?: string;
  status: 'completed';
}

export async function startFreezeGame(data: {
  session_id: string;
  child_id: string;
  music_style?: string;
}) {
  const response = await apiClient.post('/activities/freeze-game/start', {
    session_id: data.session_id,
    child_id: data.child_id,
    music_style: data.music_style || 'calm'
  });
  return response.data;
}

export async function recordFreezeRound(data: {
  game_id: string;
  session_id: string;
  music_duration: number;
  child_froze: boolean;
  reaction_time?: number;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/freeze-game/round', data);
  return response.data;
}

export async function endFreezeGame(data: {
  game_id: string;
  session_id: string;
  child_id: string;
  total_rounds: number;
  successful_freezes: number;
  total_duration: number;
  overall_engagement?: string;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/freeze-game/end', {
    ...data,
    overall_engagement: data.overall_engagement || 'moderate'
  });
  return response.data;
}

export async function getFreezeGameHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/activities/freeze-game/child/${childId}/history?limit=${limit}`);
  return response.data;
}

// ============================================
// SPRINT 2: Sound Matching Game API Functions
// ============================================

export async function getSoundLibrary() {
  const response = await apiClient.get('/activities/sound-matching/sounds');
  return response.data;
}

export async function startSoundMatchingGame(data: {
  session_id: string;
  child_id: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}) {
  const response = await apiClient.post('/activities/sound-matching/start', {
    session_id: data.session_id,
    child_id: data.child_id,
    category: data.category || 'instruments',
    difficulty: data.difficulty || 'easy'
  });
  return response.data;
}

export async function recordSoundMatchingRound(data: {
  game_id: string;
  session_id: string;
  target_sound: string;
  selected_sound: string;
  choices_shown: string[];
  response_time: number;
  was_correct: boolean;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/sound-matching/round', data);
  return response.data;
}

export async function endSoundMatchingGame(data: {
  game_id: string;
  session_id: string;
  child_id: string;
  total_rounds: number;
  correct_matches: number;
  total_duration: number;
  avg_response_time: number;
  overall_engagement?: string;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/sound-matching/end', {
    ...data,
    overall_engagement: data.overall_engagement || 'moderate'
  });
  return response.data;
}

export async function getSoundMatchingHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/activities/sound-matching/child/${childId}/history?limit=${limit}`);
  return response.data;
}

export async function generateSoundRound(data: {
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  exclude_sounds?: string[];
}) {
  const response = await apiClient.post('/activities/sound-matching/generate-round', {
    category: data.category,
    difficulty: data.difficulty || 'easy',
    exclude_sounds: data.exclude_sounds || []
  });
  return response.data;
}

// ============================================
// SPRINT 2: Ambient Music API Functions
// ============================================

export async function getAmbientEnvironments() {
  const response = await apiClient.get('/ambient-music/environments');
  return response.data;
}

export async function startAmbientMusic(data: {
  child_id: string;
  session_id?: string;
  environment?: string;
  duration_minutes?: number;
  custom_params?: { [key: string]: number };
}) {
  const response = await apiClient.post('/ambient-music/start', {
    child_id: data.child_id,
    session_id: data.session_id,
    environment: data.environment || 'ocean',
    duration_minutes: data.duration_minutes || 5,
    custom_params: data.custom_params
  });
  return response.data;
}

export async function updateAmbientParameters(data: {
  ambient_id: string;
  child_id: string;
  parameters: { [key: string]: number };
}) {
  const response = await apiClient.post('/ambient-music/update-parameters', data);
  return response.data;
}

export async function stopAmbientMusic(data: {
  ambient_id: string;
  child_id: string;
  regulation_effect?: string;
  effectiveness?: number;
  notes?: string;
}) {
  const response = await apiClient.post('/ambient-music/stop', {
    ...data,
    regulation_effect: data.regulation_effect || 'calming',
    effectiveness: data.effectiveness || 3
  });
  return response.data;
}

export async function getAmbientHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/ambient-music/child/${childId}/history?limit=${limit}`);
  return response.data;
}

export async function saveAmbientPreset(data: {
  child_id: string;
  preset_name: string;
  environment_base: string;
  custom_parameters: { [key: string]: number };
}) {
  const response = await apiClient.post('/ambient-music/save-preset', data);
  return response.data;
}

// ============================================
// SPRINT 2: Musical Storytelling API Functions
// ============================================

export async function getStoryLibrary() {
  const response = await apiClient.get('/activities/storytelling/stories');
  return response.data;
}

export async function getStoryDetails(storyId: string) {
  const response = await apiClient.get(`/activities/storytelling/stories/${storyId}`);
  return response.data;
}

export async function startStorytellingSession(data: {
  session_id: string;
  child_id: string;
  story_id: string;
  customization?: { [key: string]: any };
}) {
  const response = await apiClient.post('/activities/storytelling/start', data);
  return response.data;
}

export async function completeStoryScene(data: {
  storytelling_id: string;
  session_id: string;
  child_id: string;
  scene_id: string;
  participation_level?: 'high' | 'moderate' | 'low' | 'none';
  child_response?: string;
  notes?: string;
}) {
  const response = await apiClient.post('/activities/storytelling/scene-complete', {
    ...data,
    participation_level: data.participation_level || 'moderate'
  });
  return response.data;
}

export async function endStorytellingSession(data: {
  storytelling_id: string;
  session_id: string;
  child_id: string;
  overall_engagement?: string;
  favorite_scene?: string;
  therapeutic_notes?: string;
}) {
  const response = await apiClient.post('/activities/storytelling/end', {
    ...data,
    overall_engagement: data.overall_engagement || 'moderate'
  });
  return response.data;
}

export async function getStorytellingHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/activities/storytelling/child/${childId}/history?limit=${limit}`);
  return response.data;
}

export async function saveCustomStory(data: {
  child_id: string;
  story_title: string;
  base_story_id: string;
  customizations: { [key: string]: any };
}) {
  const response = await apiClient.post('/activities/storytelling/save-custom-story', data);
  return response.data;
}

// ============================================
// SPRINT 2: AI Music Recommendations API Functions
// ============================================

export async function getMusicRecommendations(data: {
  child_id: string;
  context: {
    goal?: string;
    time_of_day?: string;
    mood?: string;
    activity_type?: string;
  };
  limit?: number;
  exclude_songs?: string[];
}) {
  const response = await apiClient.post('/recommendations/suggest', {
    child_id: data.child_id,
    context: data.context,
    limit: data.limit || 5,
    exclude_songs: data.exclude_songs || []
  });
  return response.data;
}

export async function getMusicInsights(childId: string) {
  const response = await apiClient.get(`/recommendations/child/${childId}/insights`);
  return response.data;
}

export async function recordRecommendationFeedback(childId: string, data: {
  song_name: string;
  was_played: boolean;
  was_successful?: boolean;
  quality_score?: number;
  notes?: string;
}) {
  const response = await apiClient.post(`/recommendations/child/${childId}/feedback`, data);
  return response.data;
}

export async function getLearningProgress(childId: string) {
  const response = await apiClient.get(`/recommendations/child/${childId}/learning-progress`);
  return response.data;
}

// ============================================
// SPRINT 2: Movement Activities API Functions
// ============================================

export async function getMovementActivities() {
  const response = await apiClient.get('/activities/movement/activities');
  return response.data;
}

export async function getMovementActivityDetails(activityId: string) {
  const response = await apiClient.get(`/activities/movement/activities/${activityId}`);
  return response.data;
}

export async function startMovementActivity(data: {
  session_id: string;
  child_id: string;
  activity_id: string;
  modifications?: string[];
}) {
  const response = await apiClient.post('/activities/movement/start', {
    ...data,
    modifications: data.modifications || []
  });
  return response.data;
}

export async function completeMovement(data: {
  movement_id: string;
  session_id: string;
  child_id: string;
  movement_index: number;
  participation?: 'full' | 'partial' | 'minimal' | 'refused';
  quality?: 'excellent' | 'good' | 'fair' | 'needs_support';
  modifications_needed?: string[];
  notes?: string;
}) {
  const response = await apiClient.post('/activities/movement/movement-complete', {
    ...data,
    participation: data.participation || 'full',
    quality: data.quality || 'good'
  });
  return response.data;
}

export async function endMovementActivity(data: {
  movement_id: string;
  session_id: string;
  child_id: string;
  overall_engagement?: string;
  overall_quality?: string;
  child_mood_after?: string;
  therapeutic_notes?: string;
}) {
  const response = await apiClient.post('/activities/movement/end', {
    ...data,
    overall_engagement: data.overall_engagement || 'moderate',
    overall_quality: data.overall_quality || 'good'
  });
  return response.data;
}

export async function getMovementHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/activities/movement/child/${childId}/history?limit=${limit}`);
  return response.data;
}

// ============================================
// SPRINT 2: Emotion-Matching Music API Functions
// ============================================

export async function getEmotionProfiles() {
  const response = await apiClient.get('/emotion-music/emotions');
  return response.data;
}

export async function detectEmotion(data: {
  child_id: string;
  observed_emotion: string;
  intensity?: number;
  behavioral_indicators?: string[];
  context?: string;
}) {
  const response = await apiClient.post('/emotion-music/detect-emotion', {
    ...data,
    intensity: data.intensity || 3
  });
  return response.data;
}

export async function startEmotionMusicSession(data: {
  session_id: string;
  child_id: string;
  initial_emotion: string;
  target_emotion?: string;
  session_goal?: 'regulation' | 'maintenance' | 'exploration';
}) {
  const response = await apiClient.post('/emotion-music/start-session', {
    ...data,
    target_emotion: data.target_emotion || 'content',
    session_goal: data.session_goal || 'regulation'
  });
  return response.data;
}

export async function recordEmotionCheck(data: {
  emotion_session_id: string;
  session_id: string;
  child_id: string;
  current_emotion: string;
  intensity?: number;
  behavioral_changes?: string[];
  notes?: string;
}) {
  const response = await apiClient.post('/emotion-music/emotion-check', {
    ...data,
    intensity: data.intensity || 3
  });
  return response.data;
}

export async function endEmotionMusicSession(data: {
  emotion_session_id: string;
  session_id: string;
  child_id: string;
  final_emotion: string;
  goal_achieved: boolean;
  effectiveness?: number;
  notes?: string;
}) {
  const response = await apiClient.post('/emotion-music/end-session', {
    ...data,
    effectiveness: data.effectiveness || 3
  });
  return response.data;
}

export async function getEmotionMusicHistory(childId: string, limit: number = 20) {
  const response = await apiClient.get(`/emotion-music/child/${childId}/history?limit=${limit}`);
  return response.data;
}

// ==================== TRACKING API ====================

export interface MusicPlayLog {
  child_id: string;
  session_id?: string;
  music_file: string;
  music_title: string;
  music_style: MusicStyle;
  duration_played: number; // seconds
  completed: boolean;
  skipped: boolean;
  replay: boolean;
  context?: string;
  goal?: string;
  reaction?: string;
}

export interface ActivityUsageLog {
  child_id: string;
  session_id?: string;
  activity_type: string;
  activity_id: string;
  activity_name: string;
  duration_seconds: number;
  completed: boolean;
  participation_level?: string;
  effectiveness_rating?: number;
  context?: string;
  metadata?: any;
}

export interface ResourceAccessLog {
  child_id: string;
  session_id?: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  action: string;
  duration_seconds?: number;
  context?: string;
}

export async function logMusicPlay(data: MusicPlayLog) {
  const response = await apiClient.post('/tracking/music-play', data);
  return response.data;
}

export async function logActivityUsage(data: ActivityUsageLog) {
  const response = await apiClient.post('/tracking/activity-usage', data);
  return response.data;
}

export async function logResourceAccess(data: ResourceAccessLog) {
  const response = await apiClient.post('/tracking/resource-access', data);
  return response.data;
}

export async function getUsageHistory(childId: string, days: number = 30, logType?: string) {
  const params = new URLSearchParams({ days: days.toString() });
  if (logType) params.append('log_type', logType);
  const response = await apiClient.get(`/tracking/child/${childId}/history?${params}`);
  return response.data;
}

export async function getUsageAnalytics(childId: string, days: number = 30) {
  const response = await apiClient.get(`/tracking/child/${childId}/analytics?days=${days}`);
  return response.data;
}

// ==================== PLANNED SESSIONS API ====================

export async function createPlannedSession(data: {
  childId: string;
  title: string;
  scheduledDateTime: string;
  status: string;
  goals: string[];
  activities: string[];
  musicStyles: string[];
  customPlaylist?: string;
  notes: string;
  duration: number;
  isRecurring: boolean;
  recurrencePattern?: string;
}) {
  const response = await apiClient.post('/planned-sessions', data);
  return response.data;
}

export async function getPlannedSessions(childId?: string) {
  const url = childId ? `/planned-sessions?childId=${childId}` : '/planned-sessions';
  const response = await apiClient.get(url);
  return response.data;
}

export async function getPlannedSession(sessionId: string) {
  const response = await apiClient.get(`/planned-sessions/${sessionId}`);
  return response.data;
}

export async function updatePlannedSession(sessionId: string, data: {
  title?: string;
  scheduledDateTime?: string;
  status?: string;
  goals?: string[];
  activities?: string[];
  musicStyles?: string[];
  customPlaylist?: string;
  notes?: string;
  duration?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
}) {
  const response = await apiClient.put(`/planned-sessions/${sessionId}`, data);
  return response.data;
}

export async function deletePlannedSession(sessionId: string) {
  const response = await apiClient.delete(`/planned-sessions/${sessionId}`);
  return response.data;
}

export async function getUpcomingPlannedSessions(childId: string) {
  const response = await apiClient.get(`/planned-sessions/upcoming/${childId}`);
  return response.data;
}

// ==================== SESSION TEMPLATES API ====================

export interface SessionTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  goals: string[];
  activities: string[];
  musicStyles: string[];
  notes?: string;
  duration: number;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export async function createSessionTemplate(data: {
  name: string;
  description?: string;
  goals: string[];
  activities: string[];
  musicStyles: string[];
  notes?: string;
  duration: number;
  icon?: string;
  color?: string;
}) {
  const response = await apiClient.post('/templates', data);
  return response.data;
}

export async function getSessionTemplates() {
  const response = await apiClient.get('/templates');
  return response.data;
}

export async function getSessionTemplate(templateId: string) {
  const response = await apiClient.get(`/templates/${templateId}`);
  return response.data;
}

export async function updateSessionTemplate(templateId: string, data: {
  name?: string;
  description?: string;
  goals?: string[];
  activities?: string[];
  musicStyles?: string[];
  notes?: string;
  duration?: number;
  icon?: string;
  color?: string;
}) {
  const response = await apiClient.put(`/templates/${templateId}`, data);
  return response.data;
}

export async function deleteSessionTemplate(templateId: string) {
  const response = await apiClient.delete(`/templates/${templateId}`);
  return response.data;
}

// ==================== AI SESSION PLANNER API ====================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIPlannerChatResponse {
  message: string;
  suggestions: any | null;
  isComplete: boolean;
}

export async function chatWithAIPlanner(
  childId: string,
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<AIPlannerChatResponse> {
  const response = await apiClient.post('/ai-session-planner/chat', {
    childId,
    conversationHistory,
    userMessage
  });
  return response.data;
}

// ===================== AI Activity Generator =====================

export interface ActivityPhase {
  phase_number: number;
  name: string;
  duration_seconds: number;
  description: string;
  caregiver_instruction: string;
  music_cue?: string;
  visual_support?: string;
  adaptations?: Record<string, string>;
}

export interface TherapeuticGoal {
  goal: string;
  description: string;
  evidence_base?: string;
}

export interface SensoryRequirements {
  auditory_intensity: 'low' | 'moderate' | 'high' | 'variable';
  visual_intensity: 'low' | 'moderate' | 'high' | 'variable';
  tactile_involvement: boolean;
  movement_required: boolean;
  warnings: string[];
}

export interface MaterialItem {
  name: string;
  required: boolean;
  alternatives: string[];
}

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'rhythmic' | 'social' | 'sensory' | 'communication' | 'emotional' | 'cognitive';
  subcategory: string;
  tags: string[];
  primary_goals: TherapeuticGoal[];
  secondary_goals: TherapeuticGoal[];
  phases: ActivityPhase[];
  total_duration_minutes: number;
  difficulty_levels: string[];
  min_age: number;
  max_age: number;
  sensory_requirements: SensoryRequirements;
  music_style: string;
  tempo_bpm: number;
  volume_level: string;
  min_participants: number;
  max_participants: number;
  participant_roles: string[];
  setup_instructions: string;
  caregiver_tips: string[];
  adaptation_suggestions: string[];
  warning_signs: string[];
  materials: MaterialItem[];
  created_at: string;
  source_child_id?: string;
}

export interface GenerateActivityRequest {
  child_id?: string;
  category?: string;
  therapeutic_goals: string[];
  duration_minutes: number;
  difficulty: 'introductory' | 'beginner' | 'intermediate' | 'advanced';
  sensory_considerations?: string;
  available_materials: string[];
  additional_context?: string;
}

export interface GenerateActivityResponse {
  activity: ActivityTemplate;
  reasoning: string;
  alternatives: string[];
}

export interface ActivityChatResponse {
  message: string;
  activity: ActivityTemplate | null;
  follow_up_questions: string[];
  is_complete: boolean;
}

export async function generateActivity(
  request: GenerateActivityRequest
): Promise<GenerateActivityResponse> {
  const response = await apiClient.post('/ai-activity-generator/generate', request);
  return response.data;
}

export async function chatWithActivityWizard(
  childId: string | null,
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<ActivityChatResponse> {
  const response = await apiClient.post('/ai-activity-generator/chat', {
    child_id: childId,
    conversation_history: conversationHistory,
    user_message: userMessage
  });
  return response.data;
}

export async function saveActivityTemplate(
  activity: ActivityTemplate,
  saveAsGlobal: boolean = true
): Promise<{ success: boolean; activity_id: string }> {
  const response = await apiClient.post('/ai-activity-generator/save', {
    activity,
    save_as_global: saveAsGlobal
  });
  return response.data;
}

export async function listActivityTemplates(
  category?: string,
  limit: number = 20
): Promise<{ activities: ActivityTemplate[]; total: number }> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('limit', limit.toString());

  const response = await apiClient.get(`/ai-activity-generator/templates?${params.toString()}`);
  return response.data;
}

export async function getActivityTemplate(
  activityId: string
): Promise<ActivityTemplate> {
  const response = await apiClient.get(`/ai-activity-generator/templates/${activityId}`);
  return response.data;
}

export async function deleteActivityTemplate(
  activityId: string
): Promise<{ success: boolean }> {
  const response = await apiClient.delete(`/ai-activity-generator/templates/${activityId}`);
  return response.data;
}
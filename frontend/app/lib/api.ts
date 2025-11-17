import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

// API Base URLs from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3000/api/mcp';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

// Create axios instances
const apiClient = axios.create({
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

  console.error('API Error:', error);

  // Handle 401 (unauthorized) - redirect to login
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  } else {
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
  category: 'calm' | 'happy' | 'energetic';
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
  mood: 'calm' | 'happy' | 'energetic';
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
  const { data } = await apiClient.get('/sessions', { params: { limit } });
  return data;
}

// Music Library
export async function getMusicLibrary(): Promise<MusicTrack[]> {
  const { data } = await apiClient.get('/music/library');
  return data;
}

export async function getMusicByCategory(category: 'calm' | 'happy' | 'energetic'): Promise<MusicTrack[]> {
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
export async function sendEngagementData(sessionId: string, data: EngagementData): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/engagement`, data);
}

export async function getEngagementHistory(sessionId: string): Promise<EngagementData[]> {
  const { data } = await apiClient.get(`/sessions/${sessionId}/engagement`);
  return data;
}

// Dashboard & Analytics
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/analytics/dashboard');
  return data;
}

export async function getSessionAnalytics(sessionId: string) {
  const { data } = await apiClient.get(`/analytics/session/${sessionId}`);
  return data;
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
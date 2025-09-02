import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

// API Base URLs from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/backend';
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
  toast.error(message);
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
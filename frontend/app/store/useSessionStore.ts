import { create } from 'zustand';
import { startSession, endSession, sendEngagementData } from '@/app/lib/api';
import type { EngagementLevel } from '@/app/components/engagement/EngagementControls';

export interface LogEntry {
  time: string;
  action: string;
  engagement: EngagementLevel;
  style?: string;
}

export interface Suggestion {
  style: 'calm' | 'happy' | 'energetic';
  phrase: string;
  activity: string;
}

interface SessionState {
  // Session data
  sessionActive: boolean;
  sessionId: string | null;
  engagement: EngagementLevel;
  autoSuggest: boolean;
  currentSuggestion: Suggestion | null;
  logs: LogEntry[];

  // Actions
  startSession: (userId: string) => Promise<void>;
  stopSession: () => Promise<void>;
  updateEngagement: (level: EngagementLevel) => Promise<void>;
  setAutoSuggest: (value: boolean) => void;
  generateSuggestion: (engagement: EngagementLevel) => void;
  acceptSuggestion: () => void;
  skipSuggestion: () => void;
  logResponse: (response: 'worked' | 'neutral' | 'didnt_work') => void;
  addLog: (log: LogEntry) => void;
}

const SUGGESTIONS: Record<EngagementLevel, Suggestion> = {
  LOW: {
    style: 'calm',
    phrase: "Let's listen to some gentle music together. It's okay to just relax.",
    activity: "Soft swaying or gentle hand movements"
  },
  MED: {
    style: 'happy',
    phrase: "This happy tune makes me want to smile! Can you clap along?",
    activity: "Clapping or simple dance moves"
  },
  HIGH: {
    style: 'energetic',
    phrase: "Wow, you have so much energy! Let's move to this exciting beat!",
    activity: "Jumping, spinning, or energetic dancing"
  }
};

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessionActive: false,
  sessionId: null,
  engagement: 'MED',
  autoSuggest: false,
  currentSuggestion: null,
  logs: [],

  // Start session
  startSession: async (userId: string) => {
    const session = await startSession(userId);
    set({
      sessionActive: true,
      sessionId: session.id,
      logs: [],
      currentSuggestion: null
    });
  },

  // Stop session
  stopSession: async () => {
    const { sessionId } = get();
    if (sessionId) {
      await endSession(sessionId);
    }
    set({
      sessionActive: false,
      sessionId: null,
      currentSuggestion: null
    });
  },

  // Update engagement
  updateEngagement: async (level: EngagementLevel) => {
    const { sessionId } = get();
    if (sessionId) {
      await sendEngagementData(sessionId, {
        timestamp: Date.now(),
        attention: level === 'HIGH' ? 0.9 : level === 'MED' ? 0.6 : 0.3,
        interaction: level === 'HIGH' ? 0.85 : level === 'MED' ? 0.5 : 0.2,
        response: level === 'HIGH' ? 0.95 : level === 'MED' ? 0.7 : 0.4,
        overall: level === 'HIGH' ? 0.9 : level === 'MED' ? 0.6 : 0.3
      });
    }

    set({ engagement: level });

    // Add log entry
    get().addLog({
      time: new Date().toLocaleTimeString(),
      action: 'Engagement Changed',
      engagement: level
    });
  },

  // Set auto-suggest
  setAutoSuggest: (value: boolean) => set({ autoSuggest: value }),

  // Generate suggestion
  generateSuggestion: (engagement: EngagementLevel) => {
    const suggestion = SUGGESTIONS[engagement];
    set({ currentSuggestion: suggestion });

    get().addLog({
      time: new Date().toLocaleTimeString(),
      action: 'Suggestion Generated',
      engagement,
      style: suggestion.style
    });
  },

  // Accept suggestion
  acceptSuggestion: () => {
    const { currentSuggestion, engagement } = get();
    if (currentSuggestion) {
      get().addLog({
        time: new Date().toLocaleTimeString(),
        action: 'Suggestion Accepted',
        engagement,
        style: currentSuggestion.style
      });
    }
  },

  // Skip suggestion
  skipSuggestion: () => {
    const { engagement } = get();
    get().addLog({
      time: new Date().toLocaleTimeString(),
      action: 'Suggestion Skipped',
      engagement
    });
    get().generateSuggestion(engagement);
  },

  // Log response
  logResponse: (response: 'worked' | 'neutral' | 'didnt_work') => {
    const { engagement } = get();
    get().addLog({
      time: new Date().toLocaleTimeString(),
      action: `Response: ${response}`,
      engagement
    });
  },

  // Add log entry
  addLog: (log: LogEntry) => {
    set(state => ({
      logs: [...state.logs, log].slice(-20) // Keep only last 20 logs
    }));
  }
}));
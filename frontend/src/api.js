import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = {
  // Session Management
  startSession: async () => {
    const response = await axios.post(`${API_URL}/session/start`);
    return response.data;
  },

  stopSession: async () => {
    const response = await axios.post(`${API_URL}/session/stop`);
    return response.data;
  },

  getSessionStatus: async () => {
    const response = await axios.get(`${API_URL}/session/status`);
    return response.data;
  },

  // Engagement
  updateEngagement: async (level) => {
    const response = await axios.post(`${API_URL}/engagement`, { level });
    return response.data;
  },

  // GPT Integration
  getGPTSuggestion: async () => {
    const response = await axios.post(`${API_URL}/gpt/suggest`, { trigger: 'manual' });
    return response.data;
  },

  // Caregiver Actions
  caregiverAction: async (action, note = null, modifiedStyle = null) => {
    const response = await axios.post(`${API_URL}/caregiver/action`, {
      action,
      note,
      modified_style: modifiedStyle
    });
    return response.data;
  },

  // Music Controls
  stopMusic: async () => {
    const response = await axios.post(`${API_URL}/music/control`, null, {
      params: { action: 'stop' }
    });
    return response.data;
  },

  volumeUp: async () => {
    const response = await axios.post(`${API_URL}/music/control`, null, {
      params: { action: 'volume_up' }
    });
    return response.data;
  },

  volumeDown: async () => {
    const response = await axios.post(`${API_URL}/music/control`, null, {
      params: { action: 'volume_down' }
    });
    return response.data;
  },

  // Audio Mode
  setAudioMode: async (mode) => {
    const response = await axios.post(`${API_URL}/audio/mode`, { mode });
    return response.data;
  },

  // Data Export
  exportData: async () => {
    const response = await axios.get(`${API_URL}/data/export`);
    return response.data;
  }
};

export default api;
import { create } from 'zustand';
import {
  generateMusic,
  apiClient
} from '@/app/lib/api';
import toast from 'react-hot-toast';
import type { MusicLibrary, GeneratedTone, MusicStyle } from '@/app/types';

interface MusicState {
  // Music state
  musicPlaying: boolean;
  currentMusic: string | null;
  currentStyle: MusicStyle | null;
  volume: number;
  musicLibrary: MusicLibrary;
  generatedTones: GeneratedTone[];
  loading: boolean;

  // Actions
  playMusic: (style: MusicStyle, file?: string) => Promise<void>;
  playMusicAdaptive: (style: MusicStyle, reason?: string) => Promise<void>;
  stopMusic: () => Promise<void>;
  pauseMusic: () => Promise<void>;
  resumeMusic: () => Promise<void>;
  setVolume: (volume: number) => void;
  loadMusicLibrary: () => Promise<void>;
  loadGeneratedTones: () => Promise<void>;
  uploadMusicFile: (file: File, style: MusicStyle) => Promise<void>;
  deleteGeneratedTone: (toneName: string) => Promise<void>;
  generateNewMusic: (options: {
    style: MusicStyle;
    duration: number;
    filename: string;
    tempo?: number;
    key?: string;
  }) => Promise<void>;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  // Initial state
  musicPlaying: false,
  currentMusic: null,
  currentStyle: null,
  volume: 0.7,
  musicLibrary: {
    calming_regulation: [],
    focus_attention: [],
    social_interactive: [],
    movement_motor: [],
    sensory_seeking: [],
    sensory_soothing: [],
    sleep_rest: [],
    transition: []
  },
  generatedTones: [],
  loading: false,

  // Play music
  playMusic: async (style: MusicStyle, file?: string) => {
    set({ loading: true });
    try {
      await apiClient.post('/music/play', {
        style,
        volume: get().volume,
        file
      });

      set({
        musicPlaying: true,
        currentMusic: file || style,
        currentStyle: style
      });
      toast.success(`Playing ${style} music`);
    } catch (error) {
      console.error('Error playing music:', error);
      toast.error('Failed to play music');
    } finally {
      set({ loading: false });
    }
  },

  // Play music adaptively (with AI reasoning)
  playMusicAdaptive: async (style: MusicStyle, reason?: string) => {
    set({ loading: true });
    try {
      await apiClient.post('/music/play', {
        style,
        volume: get().volume
      });

      set({
        musicPlaying: true,
        currentMusic: style,
        currentStyle: style
      });

      const message = reason
        ? `🎵 ${reason}`
        : `AI switched to ${style} music`;

      toast(message, {
        icon: '🤖',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error playing adaptive music:', error);
      toast.error('Failed to adapt music');
    } finally {
      set({ loading: false });
    }
  },

  // Stop music
  stopMusic: async () => {
    try {
      await apiClient.post('/music/stop');
      set({ musicPlaying: false, currentMusic: null, currentStyle: null });
    } catch (error) {
      console.error('Error stopping music:', error);
      toast.error('Failed to stop music');
    }
  },

  // Pause music
  pauseMusic: async () => {
    try {
      await apiClient.post('/music/pause');
      // Note: Keep musicPlaying as true but paused state is managed by backend
      toast.success('Music paused');
    } catch (error) {
      console.error('Error pausing music:', error);
      toast.error('Failed to pause music');
    }
  },

  // Resume music
  resumeMusic: async () => {
    try {
      await apiClient.post('/music/resume');
      toast.success('Music resumed');
    } catch (error) {
      console.error('Error resuming music:', error);
      toast.error('Failed to resume music');
    }
  },

  // Set volume
  setVolume: (volume: number) => set({ volume }),

  // Load music library
  loadMusicLibrary: async () => {
    try {
      const response = await apiClient.get('/music/library');
      set({ musicLibrary: response.data.library || {
        calming_regulation: [],
        focus_attention: [],
        social_interactive: [],
        movement_motor: [],
        sensory_seeking: [],
        sensory_soothing: [],
        sleep_rest: [],
        transition: []
      } });
    } catch (error) {
      console.error('Error loading music library:', error);
      toast.error('Failed to load music library');
    }
  },

  // Load generated tones
  loadGeneratedTones: async () => {
    try {
      const response = await apiClient.get('/music/generated');
      set({ generatedTones: response.data.tones || [] });
    } catch (error) {
      console.error('Error loading generated tones:', error);
    }
  },

  // Upload music file
  uploadMusicFile: async (file: File, style: MusicStyle) => {
    const formData = new FormData();
    formData.append('file', file);

    set({ loading: true });
    try {
      await apiClient.post(`/music/upload/${style}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await get().loadMusicLibrary();
      toast.success(`Successfully uploaded ${file.name}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      set({ loading: false });
    }
  },

  // Delete generated tone
  deleteGeneratedTone: async (toneName: string) => {
    try {
      await apiClient.delete(`/music/generated/delete/${toneName}`);
      await get().loadGeneratedTones();
      toast.success('Tone deleted successfully');
    } catch (error) {
      console.error('Error deleting tone:', error);
      toast.error('Failed to delete tone');
    }
  },

  // Generate new music
  generateNewMusic: async (options) => {
    set({ loading: true });
    try {
      const track = await generateMusic({
        mood: options.style,
        duration: options.duration,
        tempo: options.tempo,
      });
      await get().loadGeneratedTones();
      toast.success(`Generated: ${track.name}`);
    } catch (error) {
      console.error('Error generating music:', error);
      toast.error('Failed to generate music');
    } finally {
      set({ loading: false });
    }
  }
}));
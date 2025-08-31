import { create } from 'zustand';
import {
  getMusicLibrary,
  generateMusic,
  deleteGeneratedMusic
} from '@/app/lib/api';
import toast from 'react-hot-toast';
import type { MusicLibrary, GeneratedTone } from '@/app/types';

interface MusicState {
  // Music state
  musicPlaying: boolean;
  currentMusic: string | null;
  volume: number;
  musicLibrary: MusicLibrary;
  generatedTones: GeneratedTone[];
  loading: boolean;

  // Actions
  playMusic: (style: 'calm' | 'happy' | 'energetic', file?: string) => Promise<void>;
  stopMusic: () => Promise<void>;
  setVolume: (volume: number) => void;
  loadMusicLibrary: () => Promise<void>;
  loadGeneratedTones: () => Promise<void>;
  uploadMusicFile: (file: File, style: 'calm' | 'happy' | 'energetic') => Promise<void>;
  deleteGeneratedTone: (toneName: string) => Promise<void>;
  generateNewMusic: (options: {
    style: 'calm' | 'happy' | 'energetic';
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
  volume: 0.7,
  musicLibrary: { calm: [], happy: [], energetic: [] },
  generatedTones: [],
  loading: false,

  // Play music
  playMusic: async (style: 'calm' | 'happy' | 'energetic', file?: string) => {
    set({ loading: true });
    try {
      const response = await fetch('/api/backend/music/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          volume: get().volume,
          file
        })
      });

      if (response.ok) {
        const data = await response.json();
        set({
          musicPlaying: true,
          currentMusic: file || style
        });
        toast.success(`Playing ${style} music`);
      } else {
        throw new Error('Failed to play music');
      }
    } catch (error) {
      console.error('Error playing music:', error);
      toast.error('Failed to play music');
    } finally {
      set({ loading: false });
    }
  },

  // Stop music
  stopMusic: async () => {
    try {
      await fetch('/api/backend/music/stop', { method: 'POST' });
      set({ musicPlaying: false, currentMusic: null });
    } catch (error) {
      console.error('Error stopping music:', error);
      toast.error('Failed to stop music');
    }
  },

  // Set volume
  setVolume: (volume: number) => set({ volume }),

  // Load music library
  loadMusicLibrary: async () => {
    try {
      const response = await fetch('/api/backend/music/library');
      if (response.ok) {
        const data = await response.json();
        set({ musicLibrary: data.library || { calm: [], happy: [], energetic: [] } });
      }
    } catch (error) {
      console.error('Error loading music library:', error);
      toast.error('Failed to load music library');
    }
  },

  // Load generated tones
  loadGeneratedTones: async () => {
    try {
      const response = await fetch('/api/backend/music/generated');
      if (response.ok) {
        const data = await response.json();
        set({ generatedTones: data.tones || [] });
      }
    } catch (error) {
      console.error('Error loading generated tones:', error);
    }
  },

  // Upload music file
  uploadMusicFile: async (file: File, style: 'calm' | 'happy' | 'energetic') => {
    const formData = new FormData();
    formData.append('file', file);

    set({ loading: true });
    try {
      const response = await fetch(`/api/backend/music/upload/${style}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await get().loadMusicLibrary();
        toast.success(`Successfully uploaded ${file.name}`);
      } else {
        throw new Error('Upload failed');
      }
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
      const response = await fetch(`/api/backend/music/generated/delete/${toneName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await get().loadGeneratedTones();
        toast.success('Tone deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting tone:', error);
      toast.error('Failed to delete tone');
    }
  },

  // Generate new music
  generateNewMusic: async (options) => {
    set({ loading: true });
    try {
      const track = await generateMusic(options);
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
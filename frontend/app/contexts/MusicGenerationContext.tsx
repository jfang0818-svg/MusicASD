'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GenerationTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  params: {
    style: string;
    duration: number;
    mood?: string;
    complexity?: string;
  };
  result: any | null;
  error: string | null;
  progress: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface MusicGenerationContextType {
  tasks: GenerationTask[];
  activeTaskId: string | null;
  isGenerating: boolean;
  startGeneration: (params: any) => Promise<string | null>;
  getTaskStatus: (taskId: string) => Promise<GenerationTask | null>;
  clearCompletedTasks: () => void;
}

const MusicGenerationContext = createContext<MusicGenerationContextType | null>(null);

export function MusicGenerationProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isGenerating = tasks.some(t => t.status === 'pending' || t.status === 'running');

  const startGeneration = useCallback(async (params: any): Promise<string | null> => {
    try {
      const response = await axios.post('http://localhost:8000/music/generate-async', params);
      const taskId = response.data.task_id;

      // Add task to local state
      const newTask: GenerationTask = {
        id: taskId,
        type: 'music_generation',
        status: 'pending',
        params: {
          style: params.style,
          duration: params.duration,
          mood: params.mood,
          complexity: params.complexity
        },
        result: null,
        error: null,
        progress: 0,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null
      };

      setTasks(prev => [newTask, ...prev]);
      setActiveTaskId(taskId);

      toast.success('Music generation started! You can continue using the app.', {
        duration: 4000,
        icon: '🎵'
      });

      return taskId;
    } catch (error: any) {
      console.error('Failed to start music generation:', error);
      toast.error(error.response?.data?.detail || 'Failed to start generation');
      return null;
    }
  }, []);

  const getTaskStatus = useCallback(async (taskId: string): Promise<GenerationTask | null> => {
    try {
      const response = await axios.get(`http://localhost:8000/music/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get task status:', error);
      return null;
    }
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'pending' || t.status === 'running'));
  }, []);

  // Poll for task updates
  useEffect(() => {
    const pollTasks = async () => {
      const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running');

      if (activeTasks.length === 0) {
        return;
      }

      for (const task of activeTasks) {
        const updatedTask = await getTaskStatus(task.id);

        if (updatedTask) {
          setTasks(prev =>
            prev.map(t =>
              t.id === task.id ? { ...t, ...updatedTask } : t
            )
          );

          // Show toast on completion or failure
          if (updatedTask.status === 'completed' && task.status !== 'completed') {
            toast.success(
              `Music generated: ${updatedTask.result?.filename || 'Ready!'}`,
              { duration: 5000, icon: '✅' }
            );
          } else if (updatedTask.status === 'failed' && task.status !== 'failed') {
            toast.error(
              `Generation failed: ${updatedTask.error || 'Unknown error'}`,
              { duration: 5000 }
            );
          }
        }
      }
    };

    // Start polling if there are active tasks
    if (tasks.some(t => t.status === 'pending' || t.status === 'running')) {
      pollingRef.current = setInterval(pollTasks, 2000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tasks, getTaskStatus]);

  return (
    <MusicGenerationContext.Provider
      value={{
        tasks,
        activeTaskId,
        isGenerating,
        startGeneration,
        getTaskStatus,
        clearCompletedTasks
      }}
    >
      {children}
    </MusicGenerationContext.Provider>
  );
}

export function useMusicGeneration() {
  const context = useContext(MusicGenerationContext);
  if (!context) {
    throw new Error('useMusicGeneration must be used within MusicGenerationProvider');
  }
  return context;
}

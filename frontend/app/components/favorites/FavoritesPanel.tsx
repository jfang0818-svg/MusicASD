'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { getFavorites, removeFromFavorites, updateFavoriteTags, type FavoriteSong } from '@/app/lib/api';
import { Star, X, Tag, Play, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface FavoritesPanelProps {
  childId: string;
  onPlayFavorite?: (favorite: FavoriteSong) => void;
  compact?: boolean;
}

export default function FavoritesPanel({ childId, onPlayFavorite, compact = false }: FavoritesPanelProps) {
  const queryClient = useQueryClient();
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Fetch favorites
  const { data: favoritesData, isLoading } = useQuery({
    queryKey: ['favorites', childId],
    queryFn: () => getFavorites(childId),
    enabled: !!childId,
  });

  // Remove favorite mutation
  const removeMutation = useMutation({
    mutationFn: ({ favoriteId }: { favoriteId: string }) =>
      removeFromFavorites(childId, favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', childId] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove favorite');
    },
  });

  // Update tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: ({ favoriteId, tags }: { favoriteId: string; tags: string[] }) =>
      updateFavoriteTags({ child_id: childId, favorite_id: favoriteId, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', childId] });
      toast.success('Tags updated');
      setEditingTags(null);
      setTagInput('');
    },
    onError: () => {
      toast.error('Failed to update tags');
    },
  });

  const favorites = favoritesData?.favorites || [];

  const handleRemove = (favoriteId: string) => {
    if (confirm('Remove this song from favorites?')) {
      removeMutation.mutate({ favoriteId });
    }
  };

  const handleTagEdit = (favorite: FavoriteSong) => {
    setEditingTags(favorite.id);
    setTagInput(favorite.tags.join(', '));
  };

  const handleTagSave = (favoriteId: string) => {
    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    updateTagsMutation.mutate({ favoriteId, tags });
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'calm': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'happy': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'energetic': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No favorite songs yet</p>
        <p className="text-xs mt-1">Click the star icon while playing music to add favorites</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'p-4'}`}>
      <AnimatePresence mode="popLayout">
        {favorites.map((favorite: FavoriteSong, index: number) => (
          <motion.div
            key={favorite.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Song name and play button */}
                <div className="flex items-center gap-2 mb-2">
                  {onPlayFavorite && (
                    <button
                      onClick={() => onPlayFavorite(favorite)}
                      className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors flex-shrink-0"
                      title="Play this favorite"
                    >
                      <Play className="w-3 h-3" fill="currentColor" />
                    </button>
                  )}
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {favorite.music_file.replace(/\.(mp3|wav|ogg)$/i, '')}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getStyleColor(favorite.music_style)}`}>
                    {favorite.music_style}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Quality: {favorite.avg_quality_score?.toFixed(0) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    <span>{favorite.play_count} plays</span>
                  </div>
                  {favorite.total_duration_played > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(favorite.total_duration_played)}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {editingTags === favorite.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="calming, morning, transition..."
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:border-primary"
                      onKeyPress={(e) => e.key === 'Enter' && handleTagSave(favorite.id)}
                    />
                    <button
                      onClick={() => handleTagSave(favorite.id)}
                      className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingTags(null);
                        setTagInput('');
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {favorite.tags.length > 0 ? (
                      favorite.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">No tags</span>
                    )}
                    <button
                      onClick={() => handleTagEdit(favorite)}
                      className="text-xs text-primary hover:underline"
                    >
                      {favorite.tags.length > 0 ? 'Edit' : 'Add tags'}
                    </button>
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(favorite.id)}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove from favorites"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

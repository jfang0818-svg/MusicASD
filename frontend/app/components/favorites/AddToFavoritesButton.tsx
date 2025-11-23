'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tantml:react-query';
import { addToFavorites } from '@/app/lib/api';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MusicStyle } from '@/app/types';

interface AddToFavoritesButtonProps {
  childId: string;
  musicFile: string;
  musicStyle: MusicStyle;
  qualityScore?: number;
  className?: string;
}

export default function AddToFavoritesButton({
  childId,
  musicFile,
  musicStyle,
  qualityScore,
  className = ''
}: AddToFavoritesButtonProps) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(false);

  const addMutation = useMutation({
    mutationFn: () =>
      addToFavorites({
        child_id: childId,
        music_file: musicFile,
        music_style: musicStyle,
        quality_score: qualityScore,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', childId] });
      setAdded(true);
      toast.success('Added to favorites!', {
        icon: '⭐',
      });
      // Reset after 2 seconds
      setTimeout(() => setAdded(false), 2000);
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        toast.error('Already in favorites');
      } else {
        toast.error('Failed to add to favorites');
      }
    },
  });

  return (
    <button
      onClick={() => addMutation.mutate()}
      disabled={addMutation.isPending || added}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all
        ${added
          ? 'bg-yellow-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-700 dark:text-gray-300'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title="Add to favorites"
    >
      <Star
        className={`w-4 h-4 transition-transform ${added ? 'scale-125' : ''}`}
        fill={added ? 'currentColor' : 'none'}
      />
      <span className="text-sm font-medium">
        {added ? 'Added!' : 'Add to Favorites'}
      </span>
    </button>
  );
}

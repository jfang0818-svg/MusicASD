'use client';

import { useState, useEffect } from 'react';
import { Music, Upload, Download, Play, Pause, Trash2, Search, Filter } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import toast from 'react-hot-toast';

export default function MusicLibraryPage() {
  const {
    musicLibrary,
    generatedTones,
    musicPlaying,
    currentMusic,
    loadMusicLibrary,
    loadGeneratedTones,
    playMusic,
    stopMusic,
    uploadMusicFile,
    deleteGeneratedTone
  } = useMusicStore();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'calm' | 'happy' | 'energetic' | 'generated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingCategory, setUploadingCategory] = useState<'calm' | 'happy' | 'energetic' | null>(null);

  useEffect(() => {
    loadMusicLibrary();
    loadGeneratedTones();
  }, [loadMusicLibrary, loadGeneratedTones]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'calm' | 'happy' | 'energetic') => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadMusicFile(file, category);
      setUploadingCategory(null);
    }
  };

  const handlePlayPause = (style: 'calm' | 'happy' | 'energetic', fileName?: string) => {
    if (musicPlaying && currentMusic === (fileName || style)) {
      stopMusic();
    } else {
      playMusic(style, fileName);
    }
  };

  const handleDelete = async (type: 'library' | 'generated', style: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        if (type === 'generated') {
          await deleteGeneratedTone(fileName);
        } else {
          const response = await fetch(`/api/backend/music/delete/${style}/${fileName}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            loadMusicLibrary();
            toast.success('File deleted successfully');
          }
        }
      } catch (error) {
        toast.error('Failed to delete file');
      }
    }
  };

  // Filter music based on search and category
  const getFilteredMusic = () => {
    const results: Array<{
      name: string;
      category: 'calm' | 'happy' | 'energetic';
      type: 'library' | 'generated';
      duration?: number;
      tempo?: number;
      created?: string;
    }> = [];

    // Add library music
    if (selectedCategory !== 'generated') {
      Object.entries(musicLibrary).forEach(([category, files]) => {
        if (selectedCategory === 'all' || selectedCategory === category) {
          files.forEach((file: { name: string; duration?: number }) => {
            if (!searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({
                name: file.name,
                category: category as 'calm' | 'happy' | 'energetic',
                type: 'library',
                duration: file.duration
              });
            }
          });
        }
      });
    }

    // Add generated tones
    if (selectedCategory === 'all' || selectedCategory === 'generated') {
      generatedTones.forEach(tone => {
        if (!searchQuery || tone.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            name: tone.name,
            category: tone.style,
            type: 'generated',
            duration: tone.duration,
            tempo: tone.tempo,
            created: tone.created
          });
        }
      });
    }

    return results;
  };

  const filteredMusic = getFilteredMusic();
  const totalFiles = Object.values(musicLibrary).reduce((sum, files) => sum + files.length, 0) + generatedTones.length;

  const categoryColors = {
    calm: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    happy: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    energetic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    generated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6" />
            Music Library
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {totalFiles} total files in library
          </p>
        </div>

        <button
          onClick={() => setUploadingCategory('calm')}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Music
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search music files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
            >
              <option value="all">All Categories</option>
              <option value="calm">Calm</option>
              <option value="happy">Happy</option>
              <option value="energetic">Energetic</option>
              <option value="generated">Generated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Music Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMusic.length > 0 ? (
          filteredMusic.map((item, index) => (
            <div key={index} className="card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {item.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[item.category]}`}>
                      {item.category}
                    </span>
                    {item.type === 'generated' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Generated
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.type, item.category, item.name)}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {item.duration && <p>Duration: {item.duration}s</p>}
                {item.tempo && <p>Tempo: {item.tempo} BPM</p>}
                {item.created && <p>Created: {new Date(item.created).toLocaleDateString()}</p>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handlePlayPause(item.category, item.name)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                >
                  {musicPlaying && currentMusic === item.name ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play
                    </>
                  )}
                </button>

                <button className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Music className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No music found matching your search' : 'No music files in library'}
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadingCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Upload Music File</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select a category and choose a file to upload
            </p>

            <select
              value={uploadingCategory}
              onChange={(e) => setUploadingCategory(e.target.value as 'calm' | 'happy' | 'energetic')}
              className="w-full px-4 py-2 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-700"
            >
              <option value="calm">Calm</option>
              <option value="happy">Happy</option>
              <option value="energetic">Energetic</option>
            </select>

            <input
              type="file"
              accept=".mp3,.wav,.ogg"
              onChange={(e) => handleFileUpload(e, uploadingCategory)}
              className="w-full mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setUploadingCategory(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
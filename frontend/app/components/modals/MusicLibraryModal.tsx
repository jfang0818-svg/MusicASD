'use client';

import { useState, useRef } from 'react';
import { X, RefreshCw, Upload, Music, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MusicLibrary, ModalProps, MusicStyle } from '@/app/types';

interface MusicLibraryModalProps extends ModalProps {
  musicLibrary: MusicLibrary;
  loadMusicLibrary: () => void;
  playMusic: (style: MusicStyle, file?: string) => void;
  uploadMusicFile: (file: File, style: MusicStyle, categories?: MusicStyle[]) => Promise<void>;
  sessionActive: boolean;
}

export function MusicLibraryModal({
  show,
  onClose,
  musicLibrary,
  loadMusicLibrary,
  playMusic,
  uploadMusicFile,
  sessionActive
}: MusicLibraryModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ style: string; fileName: string } | null>(null);
  const [uploadingFor, setUploadingFor] = useState<MusicStyle | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<MusicStyle[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  if (!show) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, primaryStyle: MusicStyle) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadingFor(primaryStyle);
      setSelectedCategories([primaryStyle]); // Default to primary category
    }
  };

  const handleConfirmUpload = async () => {
    if (uploadFile && uploadingFor) {
      await uploadMusicFile(uploadFile, uploadingFor, selectedCategories);
      setUploadFile(null);
      setUploadingFor(null);
      setSelectedCategories([]);
    }
  };

  const toggleCategory = (category: MusicStyle) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDelete = async (style: string, fileName: string) => {
    try {
      const response = await fetch(`/api/backend/music/delete/${style}/${fileName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadMusicLibrary();
        setDeleteConfirm(null);
        toast.success('File deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleCardClick = (style: MusicStyle, fileName: string) => {
    if (sessionActive) {
      playMusic(style, fileName);
      onClose();
    } else {
      toast.error('Please start a session first');
    }
  };

  const styleConfig: Record<MusicStyle, { emoji: string; color: string; label: string }> = {
    calming_regulation: { emoji: '😌', color: 'blue', label: 'Calming & Regulation' },
    focus_attention: { emoji: '🎯', color: 'purple', label: 'Focus & Attention' },
    social_interactive: { emoji: '👥', color: 'green', label: 'Social & Interactive' },
    movement_motor: { emoji: '🏃', color: 'orange', label: 'Movement & Motor' },
    sensory_seeking: { emoji: '⚡', color: 'yellow', label: 'Sensory Seeking' },
    sensory_soothing: { emoji: '🌊', color: 'teal', label: 'Sensory Soothing' },
    sleep_rest: { emoji: '😴', color: 'indigo', label: 'Sleep & Rest' },
    transition: { emoji: '🔄', color: 'pink', label: 'Transition' }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Music className="h-6 w-6" />
              Music Libraries
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadMusicLibrary}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-8rem)]">
            {Object.entries(musicLibrary).map(([style, files]) => (
              <div key={style} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-2xl">{styleConfig[style as keyof typeof styleConfig]?.emoji}</span>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                  <span className="text-sm text-gray-500">({files.length} files)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {files.length > 0 ? (
                    files.map((file: { name: string; duration?: number; categories?: MusicStyle[] }, index: number) => {
                      const fileCategories = file.categories || [style as MusicStyle];
                      return (
                        <div
                          key={index}
                          onClick={() => handleCardClick(style as MusicStyle, file.name)}
                          className={`
                            relative p-4 rounded-lg border-2 cursor-pointer
                            bg-gradient-to-br from-${styleConfig[style as MusicStyle]?.color}-50
                            to-${styleConfig[style as MusicStyle]?.color}-100
                            dark:from-${styleConfig[style as MusicStyle]?.color}-900/20
                            dark:to-${styleConfig[style as MusicStyle]?.color}-900/30
                            border-${styleConfig[style as MusicStyle]?.color}-200
                            dark:border-${styleConfig[style as MusicStyle]?.color}-800
                            hover:shadow-lg transition-all duration-200
                            ${sessionActive ? 'hover:scale-105' : 'opacity-60'}
                          `}
                          title={sessionActive ? "Click to play" : "Start session to play"}
                        >
                          <button
                            className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ style, fileName: file.name });
                            }}
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                          <div className="pr-8">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate mb-2">
                              {file.name}
                            </p>

                            {/* Category badges */}
                            {fileCategories.length > 1 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {fileCategories.map(cat => (
                                  <span key={cat} className="text-xs px-2 py-0.5 bg-white/60 dark:bg-gray-800/60 rounded-full">
                                    {styleConfig[cat]?.emoji}
                                  </span>
                                ))}
                              </div>
                            )}

                            {file.duration && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Duration: {file.duration}s
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center text-gray-500 dark:text-gray-400">
                      No files uploaded yet
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <label
                    htmlFor={`upload-${style}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium">Upload new {styleConfig[style as MusicStyle]?.label || style} music:</span>
                    <input
                      ref={el => { fileInputRefs.current[style] = el; }}
                      id={`upload-${style}`}
                      type="file"
                      accept=".mp3,.wav,.ogg"
                      onChange={(e) => handleFileSelect(e, style as MusicStyle)}
                      className="ml-auto text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Delete File</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deleteConfirm.fileName}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.style, deleteConfirm.fileName)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Dialog for Upload */}
      {uploadFile && uploadingFor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">Select Categories</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Uploading: <span className="font-medium">{uploadFile.name}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select all categories this music belongs to (you can select multiple):
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {(Object.keys(styleConfig) as MusicStyle[]).map((style) => {
                const config = styleConfig[style];
                const isSelected = selectedCategories.includes(style);
                return (
                  <button
                    key={style}
                    onClick={() => toggleCategory(style)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{config.emoji}</span>
                      <span className="font-semibold text-sm">{config.label}</span>
                      {isSelected && <span className="ml-auto text-purple-500">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Selected ({selectedCategories.length}):</strong>{' '}
                {selectedCategories.map(cat => styleConfig[cat].label).join(', ')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUploadFile(null);
                  setUploadingFor(null);
                  setSelectedCategories([]);
                }}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={selectedCategories.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload to {selectedCategories.length} {selectedCategories.length === 1 ? 'Category' : 'Categories'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Music, Play, Pause, Search, Filter, Gamepad2, BookOpen, TrendingUp, Clock, Heart, Sparkles, Activity, Calendar, Upload, X, FileText, Copy, Save, Trash2, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles, getUsageHistory, getUsageAnalytics, logMusicPlay, logResourceAccess, getSessions, createPlannedSession, getSessionTemplates, deleteSessionTemplate } from '@/app/lib/api';
import { useMusicStore } from '@/app/store/useMusicStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import type { MusicStyle } from '@/app/types';
import { ActivityAICreateModal } from '@/app/components/ActivityAICreateModal';
import { ResourceAICreateModal } from '@/app/components/ResourceAICreateModal';
import { ActivityPreviewModal, ResourcePreviewModal } from '@/app/components/PreviewModals';
import { ActivityUploadModal, ResourceUploadModal } from '@/app/components/UploadModals';
import { PlanSessionModal } from '@/app/components/modals/PlanSessionModal';

type TabType = 'music' | 'activities' | 'resources' | 'templates' | 'history';

export default function ExpandedLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childIdFromUrl = searchParams.get('childId');

  const [activeTab, setActiveTab] = useState<TabType>('music');
  const [selectedChild, setSelectedChild] = useState<string>(childIdFromUrl || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);

  // Activity/Resource modals
  const [showActivityPreview, setShowActivityPreview] = useState<any>(null);
  const [showResourcePreview, setShowResourcePreview] = useState<any>(null);
  const [showActivityUpload, setShowActivityUpload] = useState(false);
  const [showResourceUpload, setShowResourceUpload] = useState(false);
  const [showActivityAICreate, setShowActivityAICreate] = useState(false);
  const [showResourceAICreate, setShowResourceAICreate] = useState(false);

  // Session Template modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const { data: children } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const {
    musicLibrary,
    musicPlaying,
    currentMusic,
    loadMusicLibrary,
    playMusic,
    stopMusic,
    uploadMusicFile,
  } = useMusicStore();

  useEffect(() => {
    loadMusicLibrary();
  }, [loadMusicLibrary]);

  useEffect(() => {
    if (childIdFromUrl && children?.length) {
      setSelectedChild(childIdFromUrl);
    } else if (children?.length === 1) {
      setSelectedChild(children[0].id);
    }
  }, [childIdFromUrl, children]);

  const handlePlayPause = async (style: MusicStyle, fileName?: string, title?: string) => {
    const isPlaying = musicPlaying && currentMusic === (fileName || style);

    if (isPlaying) {
      stopMusic();
    } else {
      playMusic(style, fileName);

      // Track music play
      if (selectedChild) {
        try {
          await logMusicPlay({
            child_id: selectedChild,
            music_file: fileName || `${style}_default`,
            music_title: title || `${style} music`,
            music_style: style,
            duration_played: 0, // Will be updated when stopped
            completed: false,
            skipped: false,
            replay: false,
            context: 'library_preview'
          });
        } catch (error) {
          console.error('Failed to log music play:', error);
        }
      }
    }
  };

  const tabs = [
    { id: 'music' as TabType, label: 'Music Library', icon: Music, color: 'blue' },
    { id: 'activities' as TabType, label: 'Activities', icon: Gamepad2, color: 'orange' },
    { id: 'resources' as TabType, label: 'Resources', icon: BookOpen, color: 'purple' },
    { id: 'templates' as TabType, label: 'Session Templates', icon: FileText, color: 'teal' },
    { id: 'history' as TabType, label: 'Usage History', icon: TrendingUp, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Library</h1>
          <p className="text-gray-600">Browse music, activities, resources, and track usage</p>
        </div>

        {/* Child Selector */}
        {children && children.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Child</label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Children</option>
              {children.map((child: any) => (
                <option key={child.id} value={child.id}>
                  {child.demographics.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-500 text-white`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: tab.color === 'blue' ? '#3b82f6' : tab.color === 'orange' ? '#f97316' : tab.color === 'purple' ? '#a855f7' : tab.color === 'teal' ? '#14b8a6' : '#22c55e' }
                    : {}
                }
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'music' && (
            <MusicLibraryTab
              musicLibrary={musicLibrary}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              handlePlayPause={handlePlayPause}
              musicPlaying={musicPlaying}
              currentMusic={currentMusic}
              onOpenUpload={() => setShowUploadModal(true)}
              onOpenAIGenerate={() => setShowAIGenerateModal(true)}
              uploadMusicFile={uploadMusicFile}
              loadMusicLibrary={loadMusicLibrary}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesLibraryTab
              searchQuery={searchQuery}
              selectedChild={selectedChild}
              router={router}
              onPreview={setShowActivityPreview}
              onOpenUpload={() => setShowActivityUpload(true)}
              onOpenAICreate={() => setShowActivityAICreate(true)}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesLibraryTab
              searchQuery={searchQuery}
              selectedChild={selectedChild}
              onPreview={setShowResourcePreview}
              onOpenUpload={() => setShowResourceUpload(true)}
              onOpenAICreate={() => setShowResourceAICreate(true)}
            />
          )}

          {activeTab === 'templates' && (
            <SessionTemplatesTab
              selectedChild={selectedChild}
              onSelectTemplate={(template) => {
                setSelectedTemplate(template);
                setShowPlanModal(true);
              }}
            />
          )}

          {activeTab === 'history' && (
            <UsageHistoryTab
              selectedChild={selectedChild}
            />
          )}
        </AnimatePresence>

        {/* Activity Preview Modal */}
        {showActivityPreview && (
          <ActivityPreviewModal
            activity={showActivityPreview}
            onClose={() => setShowActivityPreview(null)}
          />
        )}

        {/* Resource Preview Modal */}
        {showResourcePreview && (
          <ResourcePreviewModal
            resource={showResourcePreview}
            onClose={() => setShowResourcePreview(null)}
          />
        )}

        {/* Activity Upload Modal */}
        <ActivityUploadModal
          show={showActivityUpload}
          onClose={() => setShowActivityUpload(false)}
        />

        {/* Resource Upload Modal */}
        <ResourceUploadModal
          show={showResourceUpload}
          onClose={() => setShowResourceUpload(false)}
        />

        {/* Activity AI Create Modal */}
        {showActivityAICreate && (
          <ActivityAICreateModal
            onClose={() => setShowActivityAICreate(false)}
          />
        )}

        {/* Resource AI Create Modal */}
        {showResourceAICreate && (
          <ResourceAICreateModal
            onClose={() => setShowResourceAICreate(false)}
          />
        )}

        {/* Plan Session Modal */}
        {showPlanModal && selectedTemplate && children && (
          <PlanSessionModal
            show={showPlanModal}
            onClose={() => {
              setShowPlanModal(false);
              setSelectedTemplate(null);
            }}
            childId={selectedChild || (children.length > 0 ? children[0].id : '')}
            childName={selectedChild ? children.find((c: any) => c.id === selectedChild)?.demographics?.name || 'Unknown' : (children.length > 0 ? children[0].demographics.name : 'Unknown')}
            onSave={async (sessionData: any) => {
              try {
                await createPlannedSession(sessionData);
                toast.success('Session plan created from template!');
                setShowPlanModal(false);
                setSelectedTemplate(null);
              } catch (error) {
                toast.error('Failed to create session plan');
              }
            }}
            editSession={{
              title: selectedTemplate.title || `Template: ${selectedTemplate.name || 'Session'}`,
              goals: selectedTemplate.goals || [],
              activities: selectedTemplate.activities || [],
              musicStyles: selectedTemplate.musicStyles || [],
              notes: selectedTemplate.notes || selectedTemplate.description || '',
              duration: selectedTemplate.duration || 30
            }}
            allowParticipantChange={true}
            allChildren={children}
          />
        )}
      </div>
    </div>
  );
}

// ==================== MUSIC LIBRARY TAB ====================
function MusicLibraryTab({
  musicLibrary,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  handlePlayPause,
  musicPlaying,
  currentMusic,
  onOpenUpload,
  onOpenAIGenerate,
  uploadMusicFile,
  loadMusicLibrary
}: any) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);

  const categories = [
    { id: 'all', label: 'All Music', color: 'gray' },
    { id: 'calming_regulation', label: 'Calming & Regulation', color: 'blue', desc: 'Meltdown prevention, transitions' },
    { id: 'focus_attention', label: 'Focus & Attention', color: 'purple', desc: 'Task engagement, concentration' },
    { id: 'social_interactive', label: 'Social & Interactive', color: 'green', desc: 'Turn-taking, joint attention' },
    { id: 'movement_motor', label: 'Movement & Motor', color: 'orange', desc: 'Physical activity, gross motor' },
    { id: 'sensory_seeking', label: 'Sensory Seeking', color: 'yellow', desc: 'For hypo-sensitive individuals' },
    { id: 'sensory_soothing', label: 'Sensory Soothing', color: 'teal', desc: 'For hyper-sensitive individuals' },
    { id: 'sleep_rest', label: 'Sleep & Rest', color: 'indigo', desc: 'Bedtime routines, relaxation' },
    { id: 'transition', label: 'Transition', color: 'pink', desc: 'Activity changes, preparation' },
  ];

  // Toggle category selection
  const toggleCategory = (catId: string) => {
    if (catId === 'all') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev =>
        prev.includes(catId)
          ? prev.filter(id => id !== catId)
          : [...prev, catId]
      );
    }
  };

  // Synthetic demo data for when music library is empty
  const syntheticMusicData = [
    { name: 'Gentle Ocean Waves.mp3', categories: ['calming_regulation', 'sensory_soothing'] },
    { name: 'Morning Sunlight.mp3', categories: ['calming_regulation', 'transition'] },
    { name: 'Focus Flow Beat.mp3', categories: ['focus_attention'] },
    { name: 'Concentration Piano.mp3', categories: ['focus_attention', 'calming_regulation'] },
    { name: 'Happy Clap Along.mp3', categories: ['social_interactive', 'movement_motor'] },
    { name: 'Turn Taking Song.mp3', categories: ['social_interactive'] },
    { name: 'Dance Party Fun.mp3', categories: ['movement_motor', 'sensory_seeking'] },
    { name: 'Marching Band.mp3', categories: ['movement_motor'] },
    { name: 'Energizing Drums.mp3', categories: ['sensory_seeking', 'movement_motor'] },
    { name: 'Upbeat Adventure.mp3', categories: ['sensory_seeking'] },
    { name: 'Soft Rain Sounds.mp3', categories: ['sensory_soothing', 'sleep_rest'] },
    { name: 'Peaceful Garden.mp3', categories: ['sensory_soothing'] },
    { name: 'Lullaby Dreams.mp3', categories: ['sleep_rest'] },
    { name: 'Nighttime Stars.mp3', categories: ['sleep_rest', 'sensory_soothing'] },
    { name: 'Getting Ready Song.mp3', categories: ['transition'] },
    { name: 'Time to Change.mp3', categories: ['transition', 'calming_regulation'] },
  ];

  // Collect all unique music files with their categories
  const allMusicFiles = new Map<string, { file: any; styles: string[] }>();

  // Check if musicLibrary has actual content
  const hasRealMusic = Object.values(musicLibrary).some((files: any) => Array.isArray(files) && files.length > 0);

  if (hasRealMusic) {
    Object.entries(musicLibrary).forEach(([style, files]: [string, any]) => {
      if (Array.isArray(files)) {
        files.forEach((file: any) => {
          const fileName = typeof file === 'string' ? file : file.name;
          const fileCategories = typeof file === 'object' && file.categories ? file.categories : [style];

          if (allMusicFiles.has(fileName)) {
            const existing = allMusicFiles.get(fileName)!;
            existing.styles = Array.from(new Set([...existing.styles, ...fileCategories]));
          } else {
            allMusicFiles.set(fileName, {
              file,
              styles: fileCategories
            });
          }
        });
      }
    });
  } else {
    // Use synthetic demo data
    syntheticMusicData.forEach((item) => {
      allMusicFiles.set(item.name, {
        file: item.name,
        styles: item.categories
      });
    });
  }

  // Filter music based on selected categories
  const filteredMusic = Array.from(allMusicFiles.entries())
    .map(([fileName, { file, styles }]) => {
      const title = fileName.replace('.mp3', '').replace(/_/g, ' ');
      return {
        file: typeof file === 'string' ? file : file.name,
        fileObj: file,
        title,
        styles,
        primaryStyle: styles[0] // Use first style as primary
      };
    })
    .filter((item) => {
      // If no categories selected, show all
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.some(cat => item.styles.includes(cat));
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  return (
    <motion.div
      key="music"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Multi-Category Filter with Action Buttons */}
      <div className="bg-white rounded-xl p-4 shadow-md mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Filter by Categories</h3>
            <span className="text-sm text-gray-500">
              {selectedCategories.length === 0 ? 'All categories' : `${selectedCategories.length} selected`}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setShowAIGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const isSelected = cat.id === 'all' ? selectedCategories.length === 0 : selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } shadow-sm`}
              >
                {isSelected && cat.id !== 'all' && '✓ '}
                {cat.label}
              </button>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Showing music in:</span>{' '}
            {selectedCategories.map(catId =>
              categories.find(c => c.id === catId)?.label
            ).join(', ')}
          </div>
        )}
      </div>

      {/* Music Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMusic.map((item, index) => {
          const isPlaying = musicPlaying && currentMusic === item.file;

          // Get color for each category
          const getCategoryColor = (style: string) => {
            const cat = categories.find(c => c.id === style);
            const colorMap: Record<string, string> = {
              'blue': 'bg-blue-500',
              'purple': 'bg-purple-500',
              'green': 'bg-green-500',
              'orange': 'bg-orange-500',
              'yellow': 'bg-yellow-500',
              'teal': 'bg-teal-500',
              'indigo': 'bg-indigo-500',
              'pink': 'bg-pink-500',
              'gray': 'bg-gray-500'
            };
            return cat ? colorMap[cat.color] || 'bg-gray-500' : 'bg-gray-500';
          };

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 capitalize mb-2">{item.title}</h3>

                  {/* Category Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.styles.map((style: string) => {
                      const cat = categories.find(c => c.id === style);
                      return (
                        <span
                          key={style}
                          className={`text-xs px-2 py-1 rounded-full text-white ${getCategoryColor(style)}`}
                          title={cat?.desc}
                        >
                          {cat?.label || style}
                        </span>
                      );
                    })}
                  </div>

                  {item.styles.length > 1 && (
                    <p className="text-xs text-gray-500 italic">
                      Multi-category
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handlePlayPause(item.primaryStyle as any, item.file, item.title)}
                  className={`p-3 rounded-full transition-all ${
                    isPlaying
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  } text-white shadow-md`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredMusic.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No music found matching your search</p>
        </div>
      )}

      {/* Upload Modal */}
      <UploadMusicModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        uploadMusicFile={uploadMusicFile}
        loadMusicLibrary={loadMusicLibrary}
      />

      {/* AI Generate Modal */}
      <AIGenerateMusicModal
        show={showAIGenerateModal}
        onClose={() => setShowAIGenerateModal(false)}
        loadMusicLibrary={loadMusicLibrary}
      />
    </motion.div>
  );
}

// ==================== ACTIVITIES LIBRARY TAB ====================
function ActivitiesLibraryTab({ searchQuery, selectedChild, router, onPreview, onOpenUpload, onOpenAICreate }: any) {
  const activities = [
    {
      id: 'sound-matching',
      name: 'Sound Matching Game',
      description: 'Interactive auditory processing and matching exercise',
      icon: '🎵',
      color: 'from-purple-500 to-blue-500',
      category: 'Auditory',
      difficulty: 'Easy to Hard',
      duration: '10-15 min'
    },
    {
      id: 'storytelling',
      name: 'Musical Stories',
      description: 'Interactive therapeutic storytelling with music cues',
      icon: '📚',
      color: 'from-pink-500 to-purple-500',
      category: 'Communication',
      difficulty: 'Easy to Medium',
      duration: '8-12 min'
    },
    {
      id: 'recommendations',
      name: 'AI Music Recommendations',
      description: 'Personalized song suggestions based on therapy goals',
      icon: '✨',
      color: 'from-green-500 to-emerald-500',
      category: 'Personalization',
      difficulty: 'All Levels',
      duration: '2-5 min'
    },
    {
      id: 'movement',
      name: 'Movement Activities',
      description: 'Guided physical exercises synchronized with music',
      icon: '🏃',
      color: 'from-orange-500 to-red-500',
      category: 'Motor Skills',
      difficulty: 'Easy to Hard',
      duration: '5-10 min'
    },
    {
      id: 'emotion',
      name: 'Emotion-Matching Music',
      description: 'Interactive emotional regulation using Iso-principle',
      icon: '❤️',
      color: 'from-red-500 to-pink-500',
      category: 'Emotional',
      difficulty: 'Medium',
      duration: '10-20 min'
    },
  ];

  const filteredActivities = activities.filter((activity) =>
    activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleActivityClick = (activityId: string) => {
    if (selectedChild) {
      router.push(`/dashboard/session?childId=${selectedChild}`);
      toast.success('Opening session to start activity');
    } else {
      toast.error('Please select a child first');
    }
  };

  return (
    <motion.div
      key="activities"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Interactive Activities</h2>
          <p className="text-sm text-gray-600">Therapeutic exercises requiring active participation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={onOpenAICreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            AI Create
          </button>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-200 group"
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${activity.color} rounded-2xl flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform`}>
              {activity.icon}
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{activity.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{activity.description}</p>

            <div className="space-y-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Category: {activity.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Difficulty: {activity.difficulty}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Duration: {activity.duration}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onPreview(activity)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition-all"
              >
                Preview
              </button>
              <button
                onClick={() => handleActivityClick(activity.id)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Start
              </button>
            </div>
          </motion.div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No activities found matching your search</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== RESOURCES LIBRARY TAB ====================
function ResourcesLibraryTab({ searchQuery, selectedChild, onPreview, onOpenUpload, onOpenAICreate }: any) {
  const resources = {
    stories: [
      { id: 'morning_routine', name: 'Morning Routine', type: 'story', duration: '8 min', scenes: 5 },
      { id: 'bedtime_wind_down', name: 'Bedtime Wind Down', type: 'story', duration: '10 min', scenes: 6 },
      { id: 'feelings_adventure', name: 'Feelings Adventure', type: 'story', duration: '12 min', scenes: 7 },
    ],
    soundPacks: [
      { id: 'animals', name: 'Animal Sounds', type: 'sound_pack', sounds: 24, difficulty: 'Easy' },
      { id: 'instruments', name: 'Musical Instruments', type: 'sound_pack', sounds: 24, difficulty: 'Medium' },
      { id: 'nature', name: 'Nature Sounds', type: 'sound_pack', sounds: 24, difficulty: 'Easy' },
    ],
    presets: [
      { id: 'ocean', name: 'Ocean Waves', type: 'soundscape', preset: 'Calm' },
      { id: 'forest', name: 'Forest Ambience', type: 'soundscape', preset: 'Peaceful' },
      { id: 'rain', name: 'Gentle Rain', type: 'soundscape', preset: 'Relaxing' },
    ]
  };

  const allResources = [
    ...resources.stories.map(r => ({ ...r, category: 'Stories' })),
    ...resources.soundPacks.map(r => ({ ...r, category: 'Sound Packs' })),
    ...resources.presets.map(r => ({ ...r, category: 'Soundscapes' })),
  ].filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResourceClick = async (resource: any) => {
    if (selectedChild) {
      try {
        await logResourceAccess({
          child_id: selectedChild,
          resource_type: resource.type,
          resource_id: resource.id,
          resource_name: resource.name,
          action: 'viewed',
          context: 'library_browse'
        });
        toast.success(`${resource.name} details viewed`);
      } catch (error) {
        console.error('Failed to log resource access:', error);
      }
    }
  };

  return (
    <motion.div
      key="resources"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Content Resources</h2>
          <p className="text-sm text-gray-600">Browse and preview therapeutic content libraries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={onOpenAICreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            AI Create
          </button>
        </div>
      </div>

      {/* Stories Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-pink-500" />
          Therapeutic Stories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.stories
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">📚</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{story.name}</h3>
                    <p className="text-xs text-gray-500">{story.scenes} scenes • {story.duration}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview({ ...story, category: 'Stories' })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleResourceClick(story)}
                    className="flex-1 bg-pink-100 hover:bg-pink-200 text-pink-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    View Story
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Sound Packs Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Music className="w-6 h-6 text-purple-500" />
          Sound Packs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.soundPacks
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((pack) => (
              <div
                key={pack.id}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">🎵</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{pack.name}</h3>
                    <p className="text-xs text-gray-500">{pack.sounds} sounds • {pack.difficulty}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview({ ...pack, category: 'Sound Packs' })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleResourceClick(pack)}
                    className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    Browse
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Soundscapes Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          Ambient Soundscapes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.presets
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((preset) => (
              <div
                key={preset.id}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">🌊</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{preset.name}</h3>
                    <p className="text-xs text-gray-500">{preset.preset}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview({ ...preset, category: 'Soundscapes' })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleResourceClick(preset)}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg font-semibold transition-all"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {allResources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No resources found matching your search</p>
        </div>
      )}
    </motion.div>
  );
}

// ==================== USAGE HISTORY TAB ====================
function UsageHistoryTab({ selectedChild }: any) {
  const { data: historyData } = useQuery({
    queryKey: ['usage-history', selectedChild],
    queryFn: () => selectedChild ? getUsageHistory(selectedChild, 30) : null,
    enabled: !!selectedChild
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['usage-analytics', selectedChild],
    queryFn: () => selectedChild ? getUsageAnalytics(selectedChild, 30) : null,
    enabled: !!selectedChild
  });

  // Synthetic demo data for demonstration
  const syntheticAnalytics = {
    totals: {
      music_plays: 47,
      total_music_minutes: 156,
      activity_uses: 23,
      total_activity_minutes: 89,
      resource_accesses: 31
    },
    music_analytics: {
      completion_rate: 78
    }
  };

  const syntheticHistory = {
    logs: [
      { log_type: 'music_play', music_title: 'Gentle Ocean Waves', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), completed: true },
      { log_type: 'activity_usage', activity_name: 'Sound Matching Game', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), completed: true },
      { log_type: 'music_play', music_title: 'Focus Flow Beat', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), completed: true },
      { log_type: 'resource_access', resource_name: 'Morning Routine Story', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), completed: false },
      { log_type: 'music_play', music_title: 'Dance Party Fun', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), completed: true },
      { log_type: 'activity_usage', activity_name: 'Movement Activities', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), completed: true },
      { log_type: 'music_play', music_title: 'Lullaby Dreams', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), completed: true },
      { log_type: 'resource_access', resource_name: 'Animal Sounds Pack', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), completed: true },
      { log_type: 'activity_usage', activity_name: 'Musical Stories', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(), completed: false },
      { log_type: 'music_play', music_title: 'Turn Taking Song', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), completed: true },
    ]
  };

  // Use synthetic data if no real data available
  const displayAnalytics = analyticsData || syntheticAnalytics;
  const displayHistory = historyData || syntheticHistory;
  const isUsingDemoData = !selectedChild || !analyticsData;

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Demo Data Banner */}
      {isUsingDemoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-700">
            <strong>Demo Mode:</strong> Showing sample data for demonstration purposes
          </p>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <Music className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{displayAnalytics.totals.music_plays}</p>
          <p className="text-sm text-gray-500">Music Plays</p>
          <p className="text-xs text-gray-400 mt-1">{displayAnalytics.totals.total_music_minutes} min</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <Gamepad2 className="w-8 h-8 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{displayAnalytics.totals.activity_uses}</p>
          <p className="text-sm text-gray-500">Activities</p>
          <p className="text-xs text-gray-400 mt-1">{displayAnalytics.totals.total_activity_minutes} min</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <BookOpen className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{displayAnalytics.totals.resource_accesses}</p>
          <p className="text-sm text-gray-500">Resources</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <Heart className="w-8 h-8 text-pink-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{displayAnalytics.music_analytics.completion_rate}%</p>
          <p className="text-sm text-gray-500">Completion Rate</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-500" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {displayHistory.logs.slice(0, 10).map((log: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-2xl">
                {log.log_type === 'music_play' ? '🎵' :
                 log.log_type === 'activity_usage' ? '🎮' : '📚'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  {log.music_title || log.activity_name || log.resource_name}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
              {log.completed && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                  Completed
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== SESSION TEMPLATES TAB ====================
function SessionTemplatesTab({ selectedChild, onSelectTemplate }: any) {
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);

  // Fetch custom templates
  useEffect(() => {
    loadCustomTemplates();
  }, []);

  const loadCustomTemplates = async () => {
    try {
      const templates = await getSessionTemplates();
      setCustomTemplates(templates);
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteSessionTemplate(templateId);
      toast.success('Template deleted successfully');
      loadCustomTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Predefined templates
  const predefinedTemplates = [
    {
      id: 'template_social_skills',
      name: 'Social Skills Development',
      description: 'Interactive session focusing on turn-taking, joint attention, and social interaction',
      type: 'predefined',
      goals: ['Improve turn-taking', 'Enhance joint attention', 'Practice social greetings'],
      activities: ['Interactive songs', 'Call and response', 'Passing instruments'],
      musicStyles: ['social_interactive', 'movement_motor'],
      duration: 30,
      icon: '👥',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'template_sensory_regulation',
      name: 'Sensory Regulation',
      description: 'Calming session for emotional regulation and sensory processing',
      type: 'predefined',
      goals: ['Reduce anxiety', 'Practice self-regulation', 'Improve sensory processing'],
      activities: ['Deep breathing with music', 'Slow movement', 'Listening exercises'],
      musicStyles: ['calming_regulation', 'sensory_soothing'],
      duration: 25,
      icon: '🌊',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'template_motor_skills',
      name: 'Motor Skills & Movement',
      description: 'Active session for gross motor development and body awareness',
      type: 'predefined',
      goals: ['Improve coordination', 'Develop body awareness', 'Practice rhythmic movement'],
      activities: ['Freeze dance', 'Movement to tempo', 'Instrument playing'],
      musicStyles: ['movement_motor', 'focus_attention'],
      duration: 30,
      icon: '🏃',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'template_focus_attention',
      name: 'Focus & Attention Building',
      description: 'Structured session to enhance concentration and task persistence',
      type: 'predefined',
      goals: ['Increase attention span', 'Practice following instructions', 'Improve task completion'],
      activities: ['Sound matching', 'Musical patterns', 'Listening games'],
      musicStyles: ['focus_attention', 'transition'],
      duration: 20,
      icon: '🎯',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'template_transition_routine',
      name: 'Transition & Routine Support',
      description: 'Structured session with predictable transitions and routine building',
      type: 'predefined',
      goals: ['Ease transitions', 'Build routines', 'Reduce anxiety'],
      activities: ['Hello song', 'Main activity', 'Goodbye song'],
      musicStyles: ['transition', 'calming_regulation'],
      duration: 15,
      icon: '🔄',
      color: 'from-teal-500 to-cyan-500'
    },
    {
      id: 'template_sleep_rest',
      name: 'Bedtime & Relaxation',
      description: 'Wind-down session for sleep preparation and deep relaxation',
      type: 'predefined',
      goals: ['Promote relaxation', 'Support sleep routine', 'Reduce overstimulation'],
      activities: ['Lullabies', 'Slow breathing', 'Gentle sounds'],
      musicStyles: ['sleep_rest', 'sensory_soothing'],
      duration: 20,
      icon: '😴',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  // Fetch historical sessions
  const { data: historicalSessions } = useQuery({
    queryKey: ['sessions-as-templates'],
    queryFn: () => getSessions(20),
  });

  const historicalTemplates = (historicalSessions || []).map((session: any) => ({
    ...session,
    type: 'historical',
    name: `${session.participantName || 'Session'} - ${new Date(session.startTime).toLocaleDateString()}`,
    icon: '📋'
  }));

  const allTemplates = [...predefinedTemplates, ...historicalTemplates];

  return (
    <motion.div
      key="templates"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Predefined Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-teal-500" />
              Predefined Templates
            </h2>
            <p className="text-sm text-gray-600">System-provided session templates ready to use</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predefinedTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-200 group"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${template.color} rounded-2xl flex items-center justify-center mb-3 text-3xl group-hover:scale-110 transition-transform`}>
                {template.icon}
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>

              <div className="space-y-2 text-xs mb-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {template.duration} min</span>
                </div>
                <div>
                  <span className="text-gray-500">Goals: </span>
                  <span className="text-gray-700">{template.goals.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.musicStyles.map((style) => (
                    <span key={style} className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                      {style.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Use Template
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom Templates Section */}
      {customTemplates.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Save className="w-6 h-6 text-purple-500" />
              My Custom Templates
            </h2>
            <p className="text-sm text-gray-600">Templates you've created and saved</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                    {template.icon || '⭐'}
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-lg text-gray-800 mb-2">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                )}

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Duration: {template.duration} min</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Goals: </span>
                    <span className="text-gray-700">{template.goals?.length || 0}</span>
                  </div>
                  {template.musicStyles && template.musicStyles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.musicStyles.slice(0, 2).map((style: string) => (
                        <span key={style} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {style.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {template.musicStyles.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{template.musicStyles.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectTemplate(template)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Use Template
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Sessions as Templates */}
      {historicalTemplates.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Your Session History
            </h2>
            <p className="text-sm text-gray-600">Use past sessions as templates for new session plans</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historicalTemplates.slice(0, 9).map((session: any, index: number) => (
              <div
                key={session.id}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">📋</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{session.participantName || 'Session'}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(session.startTime).toLocaleDateString()} • {Math.round(session.duration / 60)}min
                    </p>
                  </div>
                </div>

                {session.goals && session.goals.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {session.goals.slice(0, 2).map((goal: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {goal.length > 20 ? goal.substring(0, 20) + '...' : goal}
                        </span>
                      ))}
                      {session.goals.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{session.goals.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSelectTemplate(session)}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Use as Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No templates available</p>
        </div>
      )}
    </motion.div>
  );
}

// ==================== UPLOAD MUSIC MODAL ====================
function UploadMusicModal({ show, onClose, uploadMusicFile, loadMusicLibrary }: any) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<MusicStyle[]>([]);
  const [uploading, setUploading] = useState(false);

  const categories: { id: MusicStyle; label: string; emoji: string }[] = [
    { id: 'calming_regulation', label: 'Calming & Regulation', emoji: '😌' },
    { id: 'focus_attention', label: 'Focus & Attention', emoji: '🎯' },
    { id: 'social_interactive', label: 'Social & Interactive', emoji: '👥' },
    { id: 'movement_motor', label: 'Movement & Motor', emoji: '🏃' },
    { id: 'sensory_seeking', label: 'Sensory Seeking', emoji: '⚡' },
    { id: 'sensory_soothing', label: 'Sensory Soothing', emoji: '🌊' },
    { id: 'sleep_rest', label: 'Sleep & Rest', emoji: '😴' },
    { id: 'transition', label: 'Transition', emoji: '🔄' }
  ];

  const toggleCategory = (cat: MusicStyle) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-select first category as default
      if (selectedCategories.length === 0) {
        setSelectedCategories([categories[0].id]);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || selectedCategories.length === 0) {
      toast.error('Please select a file and at least one category');
      return;
    }

    setUploading(true);
    try {
      // Use first selected category as primary
      await uploadMusicFile(uploadFile, selectedCategories[0], selectedCategories);
      toast.success('Music uploaded successfully!');
      loadMusicLibrary();
      onClose();
      // Reset state
      setUploadFile(null);
      setSelectedCategories([]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload music');
    } finally {
      setUploading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Upload Music
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Music File
            </label>
            <input
              type="file"
              accept=".mp3,.wav,.ogg,.m4a"
              onChange={handleFileChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{uploadFile.name}</span>
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Categories (Multi-select)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-sm font-semibold">{cat.label}</span>
                      {isSelected && <span className="ml-auto text-purple-500">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected ({selectedCategories.length}):</strong>{' '}
                  {selectedCategories.map(id =>
                    categories.find(c => c.id === id)?.label
                  ).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || selectedCategories.length === 0 || uploading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : `Upload to ${selectedCategories.length} ${selectedCategories.length === 1 ? 'Category' : 'Categories'}`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== AI GENERATE MUSIC MODAL ====================
function AIGenerateMusicModal({ show, onClose, loadMusicLibrary }: any) {
  const [generationMode, setGenerationMode] = useState<'generic' | 'asd_specific'>('generic');
  const [selectedCategories, setSelectedCategories] = useState<MusicStyle[]>(['calming_regulation']);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [sensoryProfile, setSensoryProfile] = useState<'hypo' | 'balanced' | 'hyper'>('balanced');
  const [predictability, setPredictability] = useState(50); // 0-100
  const [duration, setDuration] = useState(10);
  const [tempo, setTempo] = useState(120);
  const [generating, setGenerating] = useState(false);

  const { data: children } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const categories: { id: MusicStyle; label: string; emoji: string }[] = [
    { id: 'calming_regulation', label: 'Calming & Regulation', emoji: '😌' },
    { id: 'focus_attention', label: 'Focus & Attention', emoji: '🎯' },
    { id: 'social_interactive', label: 'Social & Interactive', emoji: '👥' },
    { id: 'movement_motor', label: 'Movement & Motor', emoji: '🏃' },
    { id: 'sensory_seeking', label: 'Sensory Seeking', emoji: '⚡' },
    { id: 'sensory_soothing', label: 'Sensory Soothing', emoji: '🌊' },
    { id: 'sleep_rest', label: 'Sleep & Rest', emoji: '😴' },
    { id: 'transition', label: 'Transition', emoji: '🔄' }
  ];

  const toggleCategory = (cat: MusicStyle) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async () => {
    // Validation
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one therapeutic category');
      return;
    }

    if (generationMode === 'asd_specific' && !selectedChild) {
      toast.error('Please select a patient');
      return;
    }

    setGenerating(true);
    try {
      // Map category to style for backend
      const style = selectedCategories[0]?.replace(/_/g, '_') || 'calming_regulation';

      const requestBody = {
        style,
        duration,
        tempo,
        use_musicgen: true,  // Use MusicGen AI
        mood: sensoryProfile === 'sensory_seeking' ? 'energetic' : 'peaceful',
        complexity: 'simple',
        filename: generationMode === 'generic'
          ? `generic_${style}_${Date.now()}`
          : `asd_${selectedChild}_${Date.now()}`,
        child_id: generationMode === 'asd_specific' ? selectedChild : undefined,
      };

      const response = await fetch('/api/backend/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        toast.success('AI music generated successfully!');
        loadMusicLibrary();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || errorData.error || `Generation failed (${response.status})`;
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error(error.message || 'Failed to generate music');
    } finally {
      setGenerating(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              AI Generate Music
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setGenerationMode('generic')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                generationMode === 'generic'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎵 Generic Music
            </button>
            <button
              onClick={() => setGenerationMode('asd_specific')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                generationMode === 'asd_specific'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✨ ASD-Specific Music
            </button>
          </div>

          {/* Generic Mode Content */}
          {generationMode === 'generic' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Generate music for general listening and enjoyment</p>

              {/* Therapeutic Categories */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Music Categories (Multi-select)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.emoji}</span>
                          <span className="text-sm font-semibold">{cat.label}</span>
                          {isSelected && <span className="ml-auto text-blue-500">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Selected ({selectedCategories.length}):</strong>{' '}
                      {selectedCategories.map(id =>
                        categories.find(c => c.id === id)?.label
                      ).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Duration Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration: {duration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Tempo Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tempo: {tempo} BPM
                </label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          )}

          {/* ASD-Specific Mode Content */}
          {generationMode === 'asd_specific' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">Generate therapeutic music tailored for ASD patients</p>

              {/* Patient Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Patient
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a patient...</option>
                  {children?.map((child: any) => (
                    <option key={child.id} value={child.id}>
                      👤 {child.demographics.name} - {child.demographics.age} years old
                    </option>
                  ))}
                </select>
              </div>

              {/* Therapeutic Categories */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Therapeutic Categories (Multi-select)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.emoji}</span>
                          <span className="text-sm font-semibold">{cat.label}</span>
                          {isSelected && <span className="ml-auto text-purple-500">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sensory Profile */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Sensory Profile
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSensoryProfile('hypo')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      sensoryProfile === 'hypo'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">⚡</div>
                      <div className="text-xs font-semibold">Hypo-sensitive</div>
                      <div className="text-xs text-gray-500">Seeking</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSensoryProfile('balanced')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      sensoryProfile === 'balanced'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">⚖️</div>
                      <div className="text-xs font-semibold">Balanced</div>
                      <div className="text-xs text-gray-500">Typical</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSensoryProfile('hyper')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      sensoryProfile === 'hyper'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🌊</div>
                      <div className="text-xs font-semibold">Hyper-sensitive</div>
                      <div className="text-xs text-gray-500">Soothing</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration: {duration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Tempo Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tempo: {tempo} BPM
                </label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Predictability Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Predictability: {predictability}%
                  <span className="ml-2 text-xs text-gray-500">
                    ({predictability < 33 ? 'Low - More variation' : predictability < 67 ? 'Medium - Balanced' : 'High - Very repetitive'})
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={predictability}
                  onChange={(e) => setPredictability(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Info Box */}
              {selectedCategories.length > 0 && selectedChild && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <strong>AI will generate therapeutic music for:</strong><br />
                    Patient: {children?.find((c: any) => c.id === selectedChild)?.demographics.name}<br />
                    Categories: {selectedCategories.map(id =>
                      categories.find(c => c.id === id)?.label
                    ).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={
                generating ||
                selectedCategories.length === 0 ||
                (generationMode === 'asd_specific' && !selectedChild)
              }
              className={`flex-1 py-3 ${
                generationMode === 'generic'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              } text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {generationMode === 'generic' ? 'Generate Generic Music' : 'Generate ASD Music'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


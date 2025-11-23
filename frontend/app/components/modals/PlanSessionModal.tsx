'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, Target, Music, FileText, Save, Plus, Trash2, Sparkles, Info, Link as LinkIcon } from 'lucide-react';
import { PlannedSession, MusicStyle } from '@/app/types';
import { AIPlanningWizard } from '../AIPlanningWizard';
import { getSessionTemplates, createSessionTemplate, SessionTemplate } from '@/app/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface PlanSessionModalProps {
  show: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  onSave: (session: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editSession?: PlannedSession | Partial<PlannedSession> | null;
  allowParticipantChange?: boolean;
  allChildren?: any[];
}

const MUSIC_STYLES: { value: MusicStyle; label: string }[] = [
  { value: 'calming_regulation', label: 'Calming & Regulation' },
  { value: 'focus_attention', label: 'Focus & Attention' },
  { value: 'social_interactive', label: 'Social & Interactive' },
  { value: 'movement_motor', label: 'Movement & Motor' },
  { value: 'sensory_seeking', label: 'Sensory Seeking' },
  { value: 'sensory_soothing', label: 'Sensory Soothing' },
  { value: 'sleep_rest', label: 'Sleep & Rest' },
  { value: 'transition', label: 'Transitions' },
];

const COMMON_GOALS = [
  'Emotional Regulation',
  'Social Skills',
  'Focus & Attention',
  'Sensory Processing',
  'Communication',
  'Self-Expression',
  'Transitions',
  'Relaxation',
  'Motor Skills',
  'Turn-Taking',
];

const COMMON_ACTIVITIES = [
  'Sound Matching Game',
  'Musical Storytelling',
  'Movement Activity',
  'Emotion Recognition',
  'Free Play with Music',
  'Structured Listening',
  'Interactive Singing',
  'Rhythm Exercises',
];

const PREDEFINED_TEMPLATES = [
  {
    id: 'template_social_skills',
    name: 'Social Skills Development',
    description: 'Interactive session focusing on turn-taking, joint attention, and social interaction',
    goals: ['Improve turn-taking', 'Enhance joint attention', 'Practice social greetings'],
    activities: ['Interactive songs', 'Call and response', 'Passing instruments'],
    musicStyles: ['social_interactive', 'movement_motor'] as MusicStyle[],
    duration: 30,
  },
  {
    id: 'template_sensory_regulation',
    name: 'Sensory Regulation',
    description: 'Calming session for emotional regulation and sensory processing',
    goals: ['Reduce anxiety', 'Practice self-regulation', 'Improve sensory processing'],
    activities: ['Deep breathing with music', 'Slow movement', 'Listening exercises'],
    musicStyles: ['calming_regulation', 'sensory_soothing'] as MusicStyle[],
    duration: 25,
  },
  {
    id: 'template_motor_skills',
    name: 'Motor Skills & Movement',
    description: 'Active session for gross motor development and body awareness',
    goals: ['Improve coordination', 'Develop body awareness', 'Practice rhythmic movement'],
    activities: ['Freeze dance', 'Movement to tempo', 'Instrument playing'],
    musicStyles: ['movement_motor', 'focus_attention'] as MusicStyle[],
    duration: 30,
  },
  {
    id: 'template_focus_attention',
    name: 'Focus & Attention Building',
    description: 'Structured session to enhance concentration and task persistence',
    goals: ['Increase attention span', 'Practice following instructions', 'Improve task completion'],
    activities: ['Sound matching', 'Musical patterns', 'Listening games'],
    musicStyles: ['focus_attention', 'transition'] as MusicStyle[],
    duration: 20,
  },
  {
    id: 'template_transition_routine',
    name: 'Transition & Routine Support',
    description: 'Structured session with predictable transitions and routine building',
    goals: ['Ease transitions', 'Build routines', 'Reduce anxiety'],
    activities: ['Hello song', 'Main activity', 'Goodbye song'],
    musicStyles: ['transition', 'calming_regulation'] as MusicStyle[],
    duration: 15,
  },
  {
    id: 'template_sleep_rest',
    name: 'Bedtime & Relaxation',
    description: 'Wind-down session for sleep preparation and deep relaxation',
    goals: ['Promote relaxation', 'Support sleep routine', 'Reduce overstimulation'],
    activities: ['Lullabies', 'Slow breathing', 'Gentle sounds'],
    musicStyles: ['sleep_rest', 'sensory_soothing'] as MusicStyle[],
    duration: 20,
  },
];

export function PlanSessionModal({
  show,
  onClose,
  childId,
  childName,
  onSave,
  editSession,
  allowParticipantChange = false,
  allChildren = [],
}: PlanSessionModalProps) {
  const [selectedChildId, setSelectedChildId] = useState(childId);
  const [selectedChildName, setSelectedChildName] = useState(childName);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState('');
  const [selectedMusicStyles, setSelectedMusicStyles] = useState<MusicStyle[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [showAIWizard, setShowAIWizard] = useState(false);

  // Template-related state
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customTemplates, setCustomTemplates] = useState<SessionTemplate[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Fetch custom templates on mount
  useEffect(() => {
    if (show) {
      loadCustomTemplates();
    }
  }, [show]);

  const loadCustomTemplates = async () => {
    try {
      const templates = await getSessionTemplates();
      setCustomTemplates(templates);
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  // Populate form if editing
  useEffect(() => {
    if (editSession) {
      setTitle(editSession.title);

      // Handle scheduled date/time (may not exist when cloning from historical session)
      if (editSession.scheduledDateTime) {
        const dateTime = new Date(editSession.scheduledDateTime);
        setScheduledDate(dateTime.toISOString().split('T')[0]);
        setScheduledTime(dateTime.toTimeString().slice(0, 5));
      } else {
        // Default to empty when cloning from historical session
        setScheduledDate('');
        setScheduledTime('');
      }

      setDuration(editSession.duration);
      setSelectedGoals(editSession.goals);
      setSelectedActivities(editSession.activities);
      setSelectedMusicStyles(editSession.musicStyles);
      setNotes(editSession.notes);
      setIsRecurring(editSession.isRecurring ?? false);
      if (editSession.recurrencePattern) {
        setRecurrencePattern(editSession.recurrencePattern);
      }
    } else {
      // Reset form
      setTitle('');
      setScheduledDate('');
      setScheduledTime('');
      setDuration(30);
      setSelectedGoals([]);
      setSelectedActivities([]);
      setSelectedMusicStyles([]);
      setNotes('');
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setUseTemplate(false);
      setSelectedTemplateId('');
      setSaveAsTemplate(false);
      setTemplateName('');
      setTemplateDescription('');
    }
  }, [editSession, show]);

  const handleAddGoal = () => {
    if (customGoal.trim() && !selectedGoals.includes(customGoal.trim())) {
      setSelectedGoals([...selectedGoals, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  const handleAddActivity = () => {
    if (customActivity.trim() && !selectedActivities.includes(customActivity.trim())) {
      setSelectedActivities([...selectedActivities, customActivity.trim()]);
      setCustomActivity('');
    }
  };

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const toggleActivity = (activity: string) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter(a => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const toggleMusicStyle = (style: MusicStyle) => {
    if (selectedMusicStyles.includes(style)) {
      setSelectedMusicStyles(selectedMusicStyles.filter(s => s !== style));
    } else {
      setSelectedMusicStyles([...selectedMusicStyles, style]);
    }
  };

  const handleTemplateSelection = (templateId: string) => {
    if (!templateId) {
      // Clear template selection
      setSelectedTemplateId('');
      return;
    }

    setSelectedTemplateId(templateId);

    // Find the template (predefined or custom)
    const predefinedTemplate = PREDEFINED_TEMPLATES.find(t => t.id === templateId);
    const customTemplate = customTemplates.find(t => t.id === templateId);
    const template = predefinedTemplate || customTemplate;

    if (template) {
      // Pre-fill form with template data
      if (predefinedTemplate) {
        setTitle(predefinedTemplate.name);
        setDuration(predefinedTemplate.duration);
        setSelectedGoals(predefinedTemplate.goals);
        setSelectedActivities(predefinedTemplate.activities);
        setSelectedMusicStyles(predefinedTemplate.musicStyles);
        setNotes('');
      } else if (customTemplate) {
        setTitle(customTemplate.name);
        setDuration(customTemplate.duration);
        setSelectedGoals(customTemplate.goals);
        setSelectedActivities(customTemplate.activities);
        setSelectedMusicStyles(customTemplate.musicStyles);
        setNotes(customTemplate.notes || '');
      }
      toast.success('Template loaded! Adjust as needed.');
    }
  };

  const handleAIWizardComplete = (sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Pre-fill the form with AI suggestions
    setTitle(sessionData.title);
    setDuration(sessionData.duration);
    setSelectedGoals(sessionData.goals);
    setSelectedActivities(sessionData.activities);
    setSelectedMusicStyles(sessionData.musicStyles);
    setNotes(sessionData.notes);
    setShowAIWizard(false);
    toast.success('AI suggestions applied! Review and adjust as needed.');
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a session title');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }
    if (duration < 5 || duration > 180) {
      toast.error('Duration must be between 5 and 180 minutes');
      return;
    }

    // Validate template fields if saving as template
    if (saveAsTemplate && !templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    // Combine date and time
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

    const sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'> = {
      childId: selectedChildId,
      title: title.trim(),
      scheduledDateTime: scheduledDateTime.toISOString(),
      status: 'upcoming',
      goals: selectedGoals,
      activities: selectedActivities,
      musicStyles: selectedMusicStyles,
      notes: notes.trim(),
      duration,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
    };

    // Save as template if checkbox is checked
    if (saveAsTemplate) {
      try {
        await createSessionTemplate({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          goals: selectedGoals,
          activities: selectedActivities,
          musicStyles: selectedMusicStyles,
          notes: notes.trim() || undefined,
          duration,
          icon: undefined,
          color: undefined,
        });
        toast.success('Session plan and template saved!');
      } catch (error) {
        console.error('Error saving template:', error);
        toast.error('Failed to save template, but session plan will still be created');
      }
    }

    onSave(sessionData);
    if (!saveAsTemplate) {
      toast.success(editSession ? `Session plan created for ${selectedChildName}!` : 'Session plan created!');
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {editSession ? 'Edit Session Plan' : 'Plan New Session'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {childName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!editSession && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAIWizard(true)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Plan with AI
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Banner - Link to Session Logs */}
          {!editSession && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Want to plan a session based on previous history?{' '}
                  <Link
                    href="/dashboard/logs"
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                    onClick={onClose}
                  >
                    Go to Session Logs
                    <LinkIcon className="w-3.5 h-3.5" />
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Template Selection */}
          {!editSession && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTemplate}
                  onChange={(e) => {
                    setUseTemplate(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedTemplateId('');
                    }
                  }}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="font-semibold text-gray-700">Start from a template?</span>
              </label>

              {useTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelection(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a template...</option>
                    <optgroup label="Predefined Templates">
                      {PREDEFINED_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                    {customTemplates.length > 0 && (
                      <optgroup label="My Custom Templates">
                        {customTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Participant Selection (when creating from historical session) */}
          {allowParticipantChange && allChildren.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Participant *
              </label>
              <select
                value={selectedChildId}
                onChange={(e) => {
                  const child = allChildren.find(c => c.id === e.target.value);
                  setSelectedChildId(e.target.value);
                  setSelectedChildName(child?.demographics?.name || '');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                {allChildren.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.demographics.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                You can use this session plan for the same participant or adapt it for a different participant
              </p>
            </div>
          )}

          {/* Session Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Routine Practice, Social Skills Focus"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (minutes) *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-purple-600 min-w-[60px]">
                {duration} min
              </span>
            </div>
          </div>

          {/* Recurring */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="font-semibold text-gray-700">Recurring Session</span>
            </label>
            {isRecurring && (
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Repeat Pattern
                </label>
                <select
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Therapeutic Goals
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedGoals.includes(goal)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
                placeholder="Add custom goal..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {selectedGoals.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedGoals.map((goal) => (
                  <div key={goal} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                    {goal}
                    <button onClick={() => toggleGoal(goal)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Activities
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_ACTIVITIES.map((activity) => (
                <button
                  key={activity}
                  onClick={() => toggleActivity(activity)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedActivities.includes(activity)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {activity}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddActivity()}
                placeholder="Add custom activity..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleAddActivity}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {selectedActivities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedActivities.map((activity) => (
                  <div key={activity} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                    {activity}
                    <button onClick={() => toggleActivity(activity)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Music Styles */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Music className="w-4 h-4 inline mr-1" />
              Music Styles
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MUSIC_STYLES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleMusicStyle(value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedMusicStyles.includes(value)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or special instructions for this session..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Save as Template */}
          {!editSession && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="font-semibold text-gray-700">Save this session as a template</span>
              </label>

              {saveAsTemplate && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., My Morning Routine Template"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Description (optional)
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe when to use this template..."
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Your template will be saved and available for future sessions in the Library under Session Templates.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Save className="w-5 h-5" />
              {editSession ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Planning Wizard */}
      <AIPlanningWizard
        show={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        childId={childId}
        childName={childName}
        onComplete={handleAIWizardComplete}
      />
    </div>
  );
}

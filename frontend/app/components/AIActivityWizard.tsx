'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Sparkles, Loader2, Check, Save, Play,
  Clock, Target, Users, Music, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  chatWithActivityWizard,
  saveActivityTemplate,
  ActivityTemplate,
  ChatMessage
} from '@/app/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  activity?: ActivityTemplate | null;
  follow_up_questions?: string[];
}

interface AIActivityWizardProps {
  show: boolean;
  onClose: () => void;
  childId?: string;
  childName?: string;
  onActivityGenerated?: (activity: ActivityTemplate) => void;
}

const CATEGORY_INFO = {
  rhythmic: { icon: '🥁', name: 'Rhythmic', description: 'Motor timing, coordination' },
  social: { icon: '🤝', name: 'Social', description: 'Turn-taking, joint attention' },
  sensory: { icon: '🎧', name: 'Sensory', description: 'Regulation, calming' },
  communication: { icon: '💬', name: 'Communication', description: 'Language, expression' },
  emotional: { icon: '💜', name: 'Emotional', description: 'Expression, regulation' },
  cognitive: { icon: '🧩', name: 'Cognitive', description: 'Focus, memory' },
};

const QUICK_PROMPTS = [
  "Create a calming activity for sensory regulation",
  "I need a turn-taking activity for social skills",
  "Design a rhythm activity for motor coordination",
  "Make a communication activity using songs",
  "Create something for emotional expression",
];

export function AIActivityWizard({
  show,
  onClose,
  childId,
  childName,
  onActivityGenerated
}: AIActivityWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedActivity, setGeneratedActivity] = useState<ActivityTemplate | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([0]);
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial greeting when wizard opens
  useEffect(() => {
    if (show && messages.length === 0) {
      sendInitialMessage();
    }
  }, [show]);

  const sendInitialMessage = async () => {
    const greeting = childName
      ? `Hi! I'd like to create a custom music therapy activity for ${childName}.`
      : `Hi! I'd like to create a custom music therapy activity.`;

    setMessages([{ role: 'user', content: greeting }]);
    await sendMessage(greeting, []);
  };

  const sendMessage = async (messageText: string, conversationHistory: Message[]) => {
    setIsLoading(true);

    try {
      const history: ChatMessage[] = conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatWithActivityWizard(childId || null, history, messageText);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        activity: response.activity,
        follow_up_questions: response.follow_up_questions,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.activity) {
        setGeneratedActivity(response.activity);
      }
    } catch (error) {
      console.error('Error chatting with AI:', error);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');

    await sendMessage(messageText, [...messages, userMessage]);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
    };

    setMessages(prev => [...prev, userMessage]);
    await sendMessage(prompt, [...messages, userMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveActivity = async () => {
    if (!generatedActivity) return;

    setSaving(true);
    try {
      await saveActivityTemplate(generatedActivity, true);
      toast.success('Activity saved to library!');
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const handleUseActivity = () => {
    if (!generatedActivity) return;

    if (onActivityGenerated) {
      onActivityGenerated(generatedActivity);
    }
    toast.success('Activity ready to use!');
    handleClose();
  };

  const togglePhase = (index: number) => {
    setExpandedPhases(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setGeneratedActivity(null);
    setExpandedPhases([0]);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex"
      >
        {/* Left: Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">AI Activity Generator</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {childName ? `Creating for ${childName}` : 'Create custom activities'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-2">Quick start:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Follow-up question buttons */}
                    {message.role === 'assistant' && message.follow_up_questions && message.follow_up_questions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300/30 space-y-2">
                        {message.follow_up_questions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setInput(q);
                            }}
                            className="block w-full text-left text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Creating activity...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what kind of activity you need..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Activity Preview */}
        <div className="w-[450px] flex flex-col bg-gray-50 dark:bg-gray-900/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white">Generated Activity</h3>
          </div>

          {generatedActivity ? (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Activity Header */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{generatedActivity.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">
                      {generatedActivity.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {generatedActivity.description}
                    </p>
                  </div>
                </div>

                {/* Category badge */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${generatedActivity.category === 'rhythmic' ? 'orange' : generatedActivity.category === 'social' ? 'purple' : 'blue'}-100 text-${generatedActivity.category}-700`}>
                    {CATEGORY_INFO[generatedActivity.category]?.icon} {CATEGORY_INFO[generatedActivity.category]?.name}
                  </span>
                  {generatedActivity.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-semibold text-sm">{generatedActivity.total_duration_minutes} min</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Participants</p>
                    <p className="font-semibold text-sm">{generatedActivity.min_participants}-{generatedActivity.max_participants}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">Music</p>
                    <p className="font-semibold text-sm text-xs">{generatedActivity.music_style.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Difficulty</p>
                    <p className="font-semibold text-sm capitalize">{generatedActivity.difficulty_levels[0]}</p>
                  </div>
                </div>
              </div>

              {/* Therapeutic Goals */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm">
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  Therapeutic Goals
                </h5>
                <div className="space-y-2">
                  {generatedActivity.primary_goals.map((goal, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{goal.goal}</span>
                      <p className="text-xs text-gray-500">{goal.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Phases */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm">
                <h5 className="font-semibold text-sm mb-3">Activity Steps</h5>
                <div className="space-y-2">
                  {generatedActivity.phases.map((phase, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => togglePhase(idx)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {phase.phase_number}
                          </span>
                          <span className="font-medium text-sm">{phase.name}</span>
                          <span className="text-xs text-gray-500">({Math.floor(phase.duration_seconds / 60)}:{(phase.duration_seconds % 60).toString().padStart(2, '0')})</span>
                        </div>
                        {expandedPhases.includes(idx) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedPhases.includes(idx) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-3 pb-3"
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {phase.description}
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                Caregiver: {phase.caregiver_instruction}
                              </p>
                            </div>
                            {phase.music_cue && (
                              <p className="text-xs text-purple-600 mt-1">
                                🎵 {phase.music_cue}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caregiver Tips */}
              {generatedActivity.caregiver_tips.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-4">
                  <h5 className="font-semibold text-sm mb-2 text-yellow-800 dark:text-yellow-200">
                    💡 Caregiver Tips
                  </h5>
                  <ul className="space-y-1">
                    {generatedActivity.caregiver_tips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-yellow-700 dark:text-yellow-300">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning Signs */}
              {generatedActivity.warning_signs.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-4">
                  <h5 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Watch For
                  </h5>
                  <ul className="space-y-1">
                    {generatedActivity.warning_signs.map((sign, idx) => (
                      <li key={idx} className="text-xs text-red-700 dark:text-red-300">
                        • {sign}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chat with AI to generate a custom activity</p>
                <p className="text-xs mt-1 opacity-75">Activities will appear here</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {generatedActivity && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button
                onClick={handleUseActivity}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Use This Activity
              </button>
              <button
                onClick={handleSaveActivity}
                disabled={saving}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save to Library
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

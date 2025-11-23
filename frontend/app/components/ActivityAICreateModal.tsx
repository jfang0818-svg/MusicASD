'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getChildProfiles } from '@/app/lib/api';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ActivityAICreateModalProps {
  onClose: () => void;
}

export function ActivityAICreateModal({ onClose }: ActivityAICreateModalProps) {
  const [creationMode, setCreationMode] = useState<'generic' | 'asd_specific'>('generic');
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI assistant for creating therapeutic activities. I can help you design custom activities like sound matching games, musical stories, movement exercises, and more. What kind of activity would you like to create today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: children } = useQuery({
    queryKey: ['child-profiles'],
    queryFn: getChildProfiles,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset messages when mode changes
  useEffect(() => {
    const initialMessage = creationMode === 'generic'
      ? "Hi! I'm your AI assistant for creating generic therapeutic activities. I can help you design activities for general use like sound matching games, musical stories, movement exercises, and more. What would you like to create?"
      : "Hello! I'm your AI assistant for creating ASD-specific therapeutic activities. I can design personalized activities based on the patient's profile, therapeutic goals, and sensory needs. Please select a patient to get started, then tell me what you'd like to create.";

    setMessages([{ role: 'assistant', content: initialMessage }]);
  }, [creationMode]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Validate ASD-specific mode requires child selection
    if (creationMode === 'asd_specific' && !selectedChild) {
      toast.error('Please select a patient first');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setGenerating(true);

    try {
      // TODO: Replace with actual AI API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aiResponse: Message = {
        role: 'assistant',
        content: generateAIResponse(input, creationMode, selectedChild)
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      toast.error('Failed to generate response');
    } finally {
      setGenerating(false);
    }
  };

  const generateAIResponse = (userInput: string, mode: 'generic' | 'asd_specific', childId?: string): string => {
    const lowerInput = userInput.toLowerCase();
    const childProfile = children?.find((c: any) => c.id === childId);
    const isASDMode = mode === 'asd_specific';

    if (lowerInput.includes('sound') || lowerInput.includes('matching')) {
      if (isASDMode && childProfile) {
        return `Great! Let's create a personalized sound matching game for ${childProfile.demographics.name}.\n\n` +
          `**ASD-Specific Activity: Sound Matching Game**\n` +
          `• Patient: ${childProfile.demographics.name} (${childProfile.demographics.age} years)\n` +
          `• Sensory Profile: Tailored to their needs\n` +
          `• Difficulty: Adaptive based on performance\n` +
          `• Duration: 10-15 minutes\n\n` +
          `**Personalized Features:**\n` +
          `1. Sound categories matched to their interests\n` +
          `2. Visual supports (images, colors) based on preferences\n` +
          `3. Sensory-appropriate volume and complexity\n` +
          `4. Breaks and pacing based on attention span\n` +
          `5. Positive reinforcement tailored to motivation\n\n` +
          `What sound categories would work best? (e.g., their favorite animals, familiar sounds)`;
      }
      return "Great! Let's create a sound matching game. Here's what I suggest:\n\n" +
        "**Activity: Custom Sound Matching Game**\n" +
        "• Category: Auditory Processing\n" +
        "• Difficulty: Adjustable (Easy/Medium/Hard)\n" +
        "• Duration: 10-15 minutes\n\n" +
        "**Features:**\n" +
        "1. Choose sound categories (animals, instruments, nature, etc.)\n" +
        "2. Set number of rounds (5-20)\n" +
        "3. Include visual cues or audio-only mode\n" +
        "4. Track accuracy and response time\n\n" +
        "Would you like to customize any of these settings?";
    }

    if (lowerInput.includes('story') || lowerInput.includes('storytelling')) {
      if (isASDMode && childProfile) {
        return `Perfect! Let's design a personalized musical story for ${childProfile.demographics.name}.\n\n` +
          `**ASD-Specific Activity: Musical Story**\n` +
          `• Patient: ${childProfile.demographics.name}\n` +
          `• Theme: Based on their daily routine or interests\n` +
          `• Duration: 8-12 minutes\n` +
          `• Scenes: 5-7\n\n` +
          `**Personalized Elements:**\n` +
          `1. **Predictable structure** for comfort\n` +
          `2. **Visual supports** matched to communication level\n` +
          `3. **Music tempo** adjusted for sensory needs\n` +
          `4. **Social scripts** for relevant situations\n` +
          `5. **Familiar characters/settings** for engagement\n\n` +
          `What story theme would be most helpful? (bedtime routine, school day, social situations, etc.)`;
      }
      return "Wonderful! Let's design a musical story. Here's a template:\n\n" +
        "**Activity: Interactive Musical Story**\n" +
        "• Category: Communication & Social\n" +
        "• Duration: 8-12 minutes\n" +
        "• Scenes: 5-7\n\n" +
        "**Story Elements:**\n" +
        "1. Narrative theme (routine, emotions, adventure)\n" +
        "2. Music cues for each scene\n" +
        "3. Participation prompts (clapping, moving, choosing)\n" +
        "4. Visual supports (images, colors)\n\n" +
        "What theme would you like for your story?";
    }

    if (lowerInput.includes('movement') || lowerInput.includes('physical')) {
      return "Excellent choice! Let's create a movement activity:\n\n" +
        "**Activity: Music & Movement Exercise**\n" +
        "• Category: Motor Skills\n" +
        "• Energy Level: Customizable\n" +
        "• Duration: 5-10 minutes\n\n" +
        "**Movement Sequence:**\n" +
        "1. Warm-up movements (stretching, marching)\n" +
        "2. Main activities (jumping, dancing, balancing)\n" +
        "3. Cool-down (breathing, relaxing)\n" +
        "4. Music tempo matches movement intensity\n\n" +
        "What energy level are you targeting? (Low/Medium/High)";
    }

    if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('generate')) {
      return "I can help you create several types of activities:\n\n" +
        "1. **Sound Matching Games** - Auditory discrimination\n" +
        "2. **Musical Stories** - Narrative with music cues\n" +
        "3. **Movement Activities** - Physical exercise with music\n" +
        "4. **Emotion Recognition** - Music-based emotional learning\n" +
        "5. **Custom Activities** - Your unique idea!\n\n" +
        "Which type interests you most?";
    }

    return "I understand you'd like to create an activity. Could you tell me more about:\n\n" +
      "• What therapeutic goal you want to achieve?\n" +
      "• What age group is this for?\n" +
      "• How long should the activity last?\n" +
      "• Any specific preferences or requirements?\n\n" +
      "This will help me design the perfect activity for you!";
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Activity Creator</h2>
                <p className="text-sm text-gray-600">Design custom therapeutic activities with AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCreationMode('generic')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                creationMode === 'generic'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎵 Generic Activity
            </button>
            <button
              onClick={() => setCreationMode('asd_specific')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                creationMode === 'asd_specific'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✨ ASD-Specific Activity
            </button>
          </div>

          {/* Patient Selector for ASD-Specific Mode */}
          {creationMode === 'asd_specific' && (
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
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Describe the activity you want to create..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={generating}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || generating}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: Be specific about the activity type, goals, difficulty, and duration
          </p>
        </div>
      </motion.div>
    </div>
  );
}

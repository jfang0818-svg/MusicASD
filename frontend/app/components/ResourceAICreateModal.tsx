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

interface ResourceAICreateModalProps {
  onClose: () => void;
}

export function ResourceAICreateModal({ onClose }: ResourceAICreateModalProps) {
  const [creationMode, setCreationMode] = useState<'generic' | 'asd_specific'>('generic');
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI assistant for creating therapeutic resources. I can help you design therapeutic stories, custom sound packs, ambient soundscapes, and other content resources. What would you like to create today?"
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
      ? "Hello! I'm your AI assistant for creating generic therapeutic resources. I can help you design stories, sound packs, ambient soundscapes, and other content for general use. What would you like to create?"
      : "Hi! I'm your AI assistant for creating ASD-specific therapeutic resources. I can design personalized content based on the patient's profile, interests, and therapeutic needs. Please select a patient to get started.";

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

    if (lowerInput.includes('story') || lowerInput.includes('narrative')) {
      if (isASDMode && childProfile) {
        return `Perfect! Let's create a personalized therapeutic story for ${childProfile.demographics.name}.\n\n` +
          `**ASD-Specific Resource: Therapeutic Story**\n` +
          `• Patient: ${childProfile.demographics.name} (${childProfile.demographics.age} years)\n` +
          `• Theme: Tailored to their interests and needs\n` +
          `• Duration: 8-12 minutes\n` +
          `• Scenes: 5-7\n\n` +
          `**Personalized Story Elements:**\n` +
          `1. **Familiar routines** they experience daily\n` +
          `2. **Characters** they can relate to\n` +
          `3. **Music style** matched to sensory preferences\n` +
          `4. **Visual supports** at appropriate complexity\n` +
          `5. **Social skills** relevant to their goals\n` +
          `6. **Predictable structure** for comfort\n\n` +
          `What theme would be most helpful? (morning routine, going to school, visiting the doctor, bedtime, etc.)`;
      }
      return "Perfect! Let's create a therapeutic story. Here's what I recommend:\n\n" +
        "**Resource: Therapeutic Story**\n" +
        "• Type: Musical Narrative\n" +
        "• Duration: 8-12 minutes\n" +
        "• Scenes: 5-7\n\n" +
        "**Story Components:**\n" +
        "1. **Theme**: Daily routine, emotions, social situations, or sensory experiences\n" +
        "2. **Music Cues**: Background music that matches scene mood\n" +
        "3. **Participation**: Interactive moments for the child\n" +
        "4. **Visual Aids**: Optional images or color themes\n\n" +
        "What story theme would work best for your needs?";
    }

    if (lowerInput.includes('sound') && (lowerInput.includes('pack') || lowerInput.includes('library'))) {
      if (isASDMode && childProfile) {
        return `Excellent! Let's create a personalized sound pack for ${childProfile.demographics.name}.\n\n` +
          `**ASD-Specific Resource: Custom Sound Pack**\n` +
          `• Patient: ${childProfile.demographics.name}\n` +
          `• Category: Based on their interests and learning goals\n` +
          `• Sounds: 12-24 sounds\n` +
          `• Difficulty: Matched to current skill level\n\n` +
          `**Personalized Features:**\n` +
          `1. **Sounds from preferred topics** (favorite animals, vehicles, etc.)\n` +
          `2. **Appropriate complexity** for their auditory processing\n` +
          `3. **Clear distinctions** or gradual similarities based on goals\n` +
          `4. **Visual supports** matched to learning style\n` +
          `5. **Sensory-friendly volume** and duration\n\n` +
          `What sound category interests them most? Or what skill are we targeting?`;
      }
      return "Great! Let's build a custom sound pack:\n\n" +
        "**Resource: Custom Sound Pack**\n" +
        "• Category: Your choice (animals, nature, instruments, household, etc.)\n" +
        "• Sounds: 12-24 sounds\n" +
        "• Difficulty: Adjustable\n\n" +
        "**Sound Pack Features:**\n" +
        "1. **Curated sounds** for specific therapeutic goals\n" +
        "2. **Clear, distinct** audio for easy discrimination\n" +
        "3. **Paired with visuals** for multi-sensory learning\n" +
        "4. **Difficulty levels** from simple to complex\n\n" +
        "Which sound category interests you most?";
    }

    if (lowerInput.includes('soundscape') || lowerInput.includes('ambient') || lowerInput.includes('background')) {
      if (isASDMode && childProfile) {
        return `Perfect! Let's design a personalized ambient soundscape for ${childProfile.demographics.name}.\n\n` +
          `**ASD-Specific Resource: Ambient Soundscape**\n` +
          `• Patient: ${childProfile.demographics.name}\n` +
          `• Type: Calming background environment\n` +
          `• Sensory Profile: Tailored to their needs\n` +
          `• Duration: Continuous loop\n\n` +
          `**Personalized Elements:**\n` +
          `1. **Volume & density** matched to sensory sensitivity\n` +
          `2. **Sound frequencies** comfortable for their hearing\n` +
          `3. **Predictability level** for anxiety reduction\n` +
          `4. **Preferred environments** (ocean, rain, forest, space)\n` +
          `5. **Layering** adjusted for over/under-stimulation\n\n` +
          `What sensory environment would help them most? (calming for bedtime, focusing for tasks, regulating during transitions, etc.)`;
      }
      return "Excellent! Let's design an ambient soundscape:\n\n" +
        "**Resource: Custom Soundscape**\n" +
        "• Type: Generative ambient music\n" +
        "• Mood: Calming, peaceful, relaxing\n" +
        "• Duration: Continuous loop\n\n" +
        "**Soundscape Elements:**\n" +
        "1. **Base layers**: Ocean waves, rain, forest sounds\n" +
        "2. **Musical tones**: Soft chimes, gentle piano, harmonics\n" +
        "3. **Density control**: Sparse to rich layering\n" +
        "4. **Brightness**: Warm to bright sonic character\n\n" +
        "What environment would you like to create? (Ocean, forest, rain, space, etc.)";
    }

    if (lowerInput.includes('bedtime') || lowerInput.includes('sleep') || lowerInput.includes('routine')) {
      return "Perfect timing for a bedtime story! Here's a template:\n\n" +
        "**Resource: Bedtime Routine Story**\n" +
        "• Theme: Wind-down and sleep preparation\n" +
        "• Duration: 10 minutes\n" +
        "• Scenes: 6 scenes (dinner → bath → pajamas → brushing teeth → reading → sleep)\n\n" +
        "**Story Features:**\n" +
        "1. Gradually slowing tempo\n" +
        "2. Calming music cues\n" +
        "3. Predictable sequence\n" +
        "4. Soothing narration\n\n" +
        "Would you like to customize this bedtime sequence?";
    }

    if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('generate')) {
      return "I can help you create several types of resources:\n\n" +
        "1. **Therapeutic Stories** - Narratives with music and participation\n" +
        "2. **Sound Packs** - Curated audio libraries for learning\n" +
        "3. **Ambient Soundscapes** - Calming background environments\n" +
        "4. **Visual Schedules** - Picture-based routine guides\n" +
        "5. **Custom Resources** - Your unique idea!\n\n" +
        "Which resource type would be most helpful?";
    }

    return "I'd love to help you create a resource! Could you tell me:\n\n" +
      "• What type of resource do you need?\n" +
      "• What's the therapeutic goal?\n" +
      "• Who is this resource for? (age, needs)\n" +
      "• Any specific themes or preferences?\n\n" +
      "This information will help me design the perfect resource for you!";
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Resource Creator</h2>
                <p className="text-sm text-gray-600">Design custom therapeutic resources with AI</p>
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
              📚 Generic Resource
            </button>
            <button
              onClick={() => setCreationMode('asd_specific')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                creationMode === 'asd_specific'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✨ ASD-Specific Resource
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
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
              placeholder="Describe the resource you want to create..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={generating}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || generating}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: Describe the resource type, theme, therapeutic goals, and target audience
          </p>
        </div>
      </motion.div>
    </div>
  );
}

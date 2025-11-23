'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatWithAIPlanner } from '@/app/lib/api';
import { PlannedSession } from '@/app/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: any;
}

interface AIPlanningWizardProps {
  show: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  onComplete: (sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function AIPlanningWizard({ show, onClose, childId, childName, onComplete }: AIPlanningWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial greeting when wizard opens
  useEffect(() => {
    if (show && messages.length === 0) {
      // Auto-send initial greeting
      sendInitialMessage();
    }
  }, [show]);

  const sendInitialMessage = async () => {
    const initialMessage = `Hello! I'd like to plan a therapy session for ${childName}.`;
    setMessages([{ role: 'user', content: initialMessage }]);
    await sendMessage(initialMessage, []);
  };

  const sendMessage = async (messageText: string, conversationHistory: Message[]) => {
    setIsLoading(true);

    try {
      const response = await chatWithAIPlanner(childId, conversationHistory, messageText);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }

      if (response.isComplete) {
        setIsComplete(true);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUseTemplate = () => {
    if (!suggestions) {
      toast.error('No complete session template available yet');
      return;
    }

    const sessionData: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'> = {
      childId,
      title: suggestions.title || `${childName} Session`,
      scheduledDateTime: new Date().toISOString(),
      status: 'upcoming',
      goals: suggestions.goals || [],
      activities: suggestions.activities || [],
      musicStyles: suggestions.musicStyles || [],
      customPlaylist: [],
      notes: suggestions.notes || '',
      duration: suggestions.duration || 30,
      isRecurring: false,
      recurrencePattern: null,
    };

    onComplete(sessionData);
    onClose();
    toast.success('Session template applied!');
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setIsComplete(false);
    setSuggestions(null);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">AI Session Planner</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Planning for {childName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Show suggestions if available */}
                  {message.role === 'assistant' && message.suggestions && (
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                      <p className="text-xs font-semibold opacity-75">AI Suggestions:</p>

                      {message.suggestions.title && (
                        <div className="text-xs">
                          <span className="font-medium">Title:</span> {message.suggestions.title}
                        </div>
                      )}

                      {message.suggestions.goals && message.suggestions.goals.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Goals:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.suggestions.goals.map((goal: string, idx: number) => (
                              <span key={idx} className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {goal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.suggestions.activities && message.suggestions.activities.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Activities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.suggestions.activities.map((activity: string, idx: number) => (
                              <span key={idx} className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {activity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.suggestions.musicStyles && message.suggestions.musicStyles.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Music:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.suggestions.musicStyles.map((style: string, idx: number) => (
                              <span key={idx} className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {style}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.suggestions.duration && (
                        <div className="text-xs">
                          <span className="font-medium">Duration:</span> {message.suggestions.duration} min
                        </div>
                      )}

                      {message.suggestions.reasoning && (
                        <div className="text-xs italic opacity-75 mt-2">
                          {message.suggestions.reasoning}
                        </div>
                      )}
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
                <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {isComplete && suggestions ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Session template ready!
                </span>
              </div>
              <button
                onClick={handleUseTemplate}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Use This Template
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

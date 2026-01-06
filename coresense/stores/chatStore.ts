/**
 * Chat Store - State management for coach chat functionality
 * Manages chat messages, sending, loading states, and chat preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { coresenseApi } from '../utils/coresenseApi';
import { useAuthStore } from './authStore';
import { useMessageLimitStore } from './messageLimitStore';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isStreaming?: boolean;
  streamingText?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  category: 'checkin' | 'mood' | 'focus' | 'health';
  action: () => void;
}

interface ChatStore {
  // State
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  typing: boolean;
  quickActions: QuickAction[];
  
  // Actions
  sendMessage: (text: string, isQuickAction?: boolean) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;
  markAsRead: (messageId: string) => void;
  setTyping: (typing: boolean) => void;
  loadChatHistory: () => Promise<void>;
  completeQuickAction: (actionId: string) => void;
  simulateStreaming: (messageId: string, fullText: string) => Promise<void>;
  
  // Message limit integration
  checkMessageLimit: () => boolean;
  showUpgradePrompt: () => void;
}

export const useChatStore = create<ChatStore>()(
  (set, get) => ({
      // Initial state
      messages: [],
      loading: false,
      sending: false,
      typing: false,
      quickActions: [
        {
          id: 'struggling',
          title: 'Struggling Today',
          icon: 'warning-outline',
          category: 'checkin',
          action: () => {
            const { sendMessage } = get();
            sendMessage("I'm struggling today and need accountability", true);
          },
        },
        {
          id: 'excuse',
          title: 'Made an Excuse',
          icon: 'alert-circle-outline',
          category: 'checkin',
          action: () => {
            const { sendMessage } = get();
            sendMessage("I catch myself making excuses again", true);
          },
        },
        {
          id: 'breakthrough',
          title: 'Had a Breakthrough',
          icon: 'trophy-outline',
          category: 'checkin',
          action: () => {
            const { sendMessage } = get();
            sendMessage("I had a real breakthrough today", true);
          },
        },
        {
          id: 'commit',
          title: 'Making a Commitment',
          icon: 'checkmark-circle-outline',
          category: 'checkin',
          action: () => {
            const { sendMessage } = get();
            sendMessage("I want to make a commitment and need you to hold me to it", true);
          },
        },
      ],

      // Actions
      sendMessage: async (text: string, isQuickAction = false) => {
        if (!text.trim()) return;

        // Check message limit first
        const { canSendMessage, showUpgradePrompt } = useMessageLimitStore.getState();
        
        if (!canSendMessage()) {
          console.log('Message limit reached, showing upgrade prompt');
          showUpgradePrompt();
          return;
        }

        // Set sending and typing states
        set({ sending: true, typing: true });

        // Create user message
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}-${Math.random()}`,
          text: text.trim(),
          sender: 'user',
          timestamp: new Date(),
          status: 'sending',
        };

        // Add user message immediately
        set((state) => ({
          messages: [...state.messages, userMessage],
        }));

        try {
          // Update user message status to sent
          get().updateMessage(userMessage.id, { status: 'sent' });

          // Get user ID from auth store
          const { user } = useAuthStore.getState();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Send to API
          const { data, error } = await coresenseApi.sendChatMessage(user.id, text, {
            current_streak: 0, // TODO: Get from user store
            recent_pattern: 'coasting',
            response_rate: 'high'
          });

          if (error) {
            // Handle different error types
            // Ensure error is a string before calling .includes()
            const errorString = typeof error === 'string' ? error : JSON.stringify(error);
            
            if (errorString.includes('message_limit_reached') || errorString.includes('402')) {
              console.log('Server-side limit check failed, showing upgrade prompt');
              set({ typing: false });
              showUpgradePrompt();
              return;
            }
            throw new Error(errorString);
          }

          // Clear typing state before showing streaming response
          set({ typing: false });

          // Create coach response message
          const coachMessage: ChatMessage = {
            id: `coach-${Date.now()}-${Math.random()}`,
            text: data?.messages?.[0] || "Thank you for your message! I'm here to help you stay on track with your wellness goals.",
            sender: 'coach',
            timestamp: new Date(),
            isStreaming: true,
            streamingText: '',
          };

          // Add coach message
          set((state) => ({
            messages: [...state.messages, coachMessage],
          }));

          // Simulate streaming response
          await get().simulateStreaming(coachMessage.id, coachMessage.text);

          // Refresh usage stats after successful message
          const { loadUsageStats } = useMessageLimitStore.getState();
          loadUsageStats();

        } catch (error: any) {
          console.error('Failed to send message:', error);
          
          // Clear typing state on error
          set({ typing: false });
          
          // Update user message with error status
          get().updateMessage(userMessage.id, { status: 'sent' });
          
          // Add error message from coach
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            text: "I'm sorry, I'm having trouble responding right now. Please try again.",
            sender: 'coach',
            timestamp: new Date(),
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
          }));
        } finally {
          set({ sending: false });
        }
      },

      setMessages: (messages: ChatMessage[]) => {
        set({ messages });
      },

      addMessage: (message: ChatMessage) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      updateMessage: (id: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      clearChat: () => {
        set({ messages: [] });
      },

      markAsRead: (messageId: string) => {
        get().updateMessage(messageId, { status: 'read' });
      },

      setTyping: (typing: boolean) => {
        set({ typing });
      },

      loadChatHistory: async () => {
        set({ loading: true });
        
        try {
          const { user } = useAuthStore.getState();
          if (!user) {
            console.log('No authenticated user, skipping chat history load');
            return;
          }

          const { data, error } = await coresenseApi.getChatHistory(user.id);
          
          if (!error && data) {
            const formattedMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
              id: msg.id,
              text: msg.content || msg.text, // Handle both old and new schema
              sender: msg.sender_type === 'gpt' ? 'coach' : 'user', // New schema support
              timestamp: new Date(msg.created_at || msg.timestamp),
              status: 'delivered',
            }));
            
            console.log(`Loaded ${formattedMessages.length} messages from chat history`);
            set({ messages: formattedMessages });
          } else if (error) {
            console.log('Chat history API error (might be new account):', error);
            // Don't show error for new accounts - just start with empty chat
            set({ messages: [] });
          }
        } catch (error) {
          console.error('Failed to load chat history:', error);
          // Set empty messages for new accounts or error cases
          set({ messages: [] });
        } finally {
          set({ loading: false });
        }
      },

      completeQuickAction: (actionId: string) => {
        const action = get().quickActions.find((a) => a.id === actionId);
        if (action) {
          action.action();
        }
      },

      // Helper method for streaming simulation
      simulateStreaming: async (messageId: string, fullText: string) => {
        const words = fullText.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
          currentText += (i > 0 ? ' ' : '') + words[i];
          
          get().updateMessage(messageId, { 
            streamingText: currentText,
            text: currentText 
          });
          
          // Simulate typing delay
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
        
        // Complete streaming
        get().updateMessage(messageId, { 
          isStreaming: false,
          streamingText: undefined,
          status: 'delivered'
        });
      },

      // Message limit integration
      checkMessageLimit: () => {
        const { canSendMessage } = useMessageLimitStore.getState();
        return canSendMessage();
      },

      showUpgradePrompt: () => {
        const { showUpgradePrompt } = useMessageLimitStore.getState();
        showUpgradePrompt();
      },
    })
  );

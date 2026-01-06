/**
 * User Store (Zustand)
 * Enhanced with chat preferences and settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile, getUserPreferences, updatePreferences } from '../utils/api';
import type { UserProfile, UserPreferences } from '../types';

export interface ChatPreferences {
  chatTone: 'casual' | 'professional' | 'motivational' | 'supportive';
  chatStyle: 'brief' | 'detailed' | 'conversational';
  chatVerbosity: 'short' | 'medium' | 'long';
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursDays: number[];
  historyRetentionDays: number;
  autoSyncEnabled: boolean;
}

interface UserState {
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  chatPreferences: ChatPreferences;
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, updates: Partial<UserPreferences>) => Promise<void>;
  updateChatPreferences: (updates: Partial<ChatPreferences>) => void;
  resetChatPreferences: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      preferences: null,
      chatPreferences: {
        chatTone: 'supportive',
        chatStyle: 'conversational',
        chatVerbosity: 'medium',
        notificationsEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        quietHoursDays: [1, 2, 3, 4, 5, 6, 7], // All days
        historyRetentionDays: 30,
        autoSyncEnabled: true,
      },
      isLoading: false,

      fetchProfile: async (userId: string) => {
        console.log('[UserStore] 🔄 fetchProfile called for userId:', userId);
        set({ isLoading: true });
        try {
          const { data, error } = await getUserProfile(userId);
          console.log('[UserStore] 📡 getUserProfile response:', { data, error });
          if (error) {
            // If it's a "table not found" error, the database might not be set up
            const errorMessage = typeof error === 'string' ? error : error.message || JSON.stringify(error);
            if (errorMessage.includes('table') || errorMessage.includes('not found')) {
              console.warn('Database table not found. Please run DATABASE_SETUP.sql in Supabase.');
            }
            throw error;
          }
          console.log('[UserStore] ✅ Profile fetched successfully:', data);
          set({ profile: data, isLoading: false });
        } catch (error) {
          console.error('[UserStore] 💥 Fetch profile error:', error);
          // Don't throw - just set loading to false and continue
          // The app can work without profile data initially
          set({ isLoading: false, profile: null });
        }
      },

      updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
        console.log('[UserStore] 🔄 updateProfile called:', { userId, updates });
        try {
          const { data, error } = await updateUserProfile(userId, updates);
          console.log('[UserStore] 📡 updateUserProfile response:', { data, error });
          if (error) {
            console.log('[UserStore] ❌ Profile update failed:', error);
            throw error;
          }
          console.log('[UserStore] ✅ Profile updated successfully');
          set((state) => ({ 
            profile: state.profile ? { ...state.profile, ...updates } : null 
          }));
        } catch (error) {
          console.error('[UserStore] 💥 Update profile error:', error);
          throw error;
        }
      },

      fetchPreferences: async (userId: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await getUserPreferences(userId);
          if (error) {
            // If it's a "table not found" error, the database might not be set up
            const errorMessage = typeof error === 'string' ? error : error.message || JSON.stringify(error);
            if (errorMessage.includes('table') || errorMessage.includes('not found')) {
              console.warn('Database table not found. Please run DATABASE_SETUP.sql in Supabase.');
            }
            throw error;
          }
          set({ preferences: data, isLoading: false });
        } catch (error: any) {
          console.error('Fetch preferences error:', error);
          // Handle empty result set (user has no preferences yet)
          if (error?.code === 'PGRST116' && 
              (error?.message?.includes('0 rows') || error?.details?.includes('0 rows'))) {
            console.log('User has no preferences yet, using defaults');
            set({ isLoading: false, preferences: null });
            return;
          }
          // Don't throw - just set loading to false and continue
          // The app can work without preferences initially
          set({ isLoading: false, preferences: null });
        }
      },

      updatePreferences: async (userId: string, updates: Partial<UserPreferences>) => {
        try {
          const { data, error } = await updatePreferences(userId, updates);
          if (error) throw error;
          set((state) => ({ 
            preferences: state.preferences ? { ...state.preferences, ...updates } : null 
          }));
        } catch (error) {
          console.error('Update preferences error:', error);
          throw error;
        }
      },

      updateChatPreferences: (updates: Partial<ChatPreferences>) => {
        set((state) => ({
          chatPreferences: { ...state.chatPreferences, ...updates },
        }));
      },

      resetChatPreferences: () => {
        set({
          chatPreferences: {
            chatTone: 'supportive',
            chatStyle: 'conversational',
            chatVerbosity: 'medium',
            notificationsEnabled: true,
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            quietHoursDays: [1, 2, 3, 4, 5, 6, 7],
            historyRetentionDays: 30,
            autoSyncEnabled: true,
          },
        });
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        chatPreferences: state.chatPreferences,
      }),
    }
  )
);


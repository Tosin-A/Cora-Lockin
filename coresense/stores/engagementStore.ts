/**
 * Engagement Store (Zustand)
 * Manages AI-suggested engagement actions, commitments, and rituals.
 * 
 * NOTE: This store is now primarily for local state management.
 * Real data is fetched via coresenseApi in the screens.
 * No sample/mock data - all data comes from the backend.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EngagementAction {
  id: string;
  title: string;
  subtitle?: string;
  duration?: string;
  category: 'focus' | 'wellness' | 'habit' | 'reflection' | 'movement';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: Date | string;
  createdAt?: Date | string;
}

export interface Commitment {
  id: string;
  text: string;
  streak?: number;
  lastCheckIn?: Date | string;
  nextCheckIn?: Date | string;
  isActive?: boolean;
  dueDate?: string;
  priority?: string;
  createdAt: Date | string;
}

export interface DailyPrompt {
  id: string;
  question: string;
  response?: string;
  answeredAt?: Date | string;
  createdAt?: Date | string;
}

interface EngagementState {
  // Today's engagement prompt
  dailyPrompt: DailyPrompt | null;
  
  // Suggested actions
  suggestedActions: EngagementAction[];
  
  // Active commitments
  commitments: Commitment[];
  
  // Stats
  totalCompletedToday: number;
  currentStreak: number;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setDailyPrompt: (prompt: DailyPrompt | null) => void;
  setSuggestedActions: (actions: EngagementAction[]) => void;
  setCommitments: (commitments: Commitment[]) => void;
  setStats: (total: number, streak: number) => void;
  
  completeActionLocal: (actionId: string) => void;
  answerPromptLocal: (promptId: string, response: string) => void;
  recordDidItLocal: () => void;
  
  reset: () => void;
}

const STORAGE_KEY = '@coresense/engagement';

export const useEngagementStore = create<EngagementState>((set, get) => ({
  dailyPrompt: null,
  suggestedActions: [],
  commitments: [],
  totalCompletedToday: 0,
  currentStreak: 0,
  isLoading: false,

  setDailyPrompt: (prompt) => {
    set({ dailyPrompt: prompt });
  },

  setSuggestedActions: (actions) => {
    set({ suggestedActions: actions });
  },

  setCommitments: (commitments) => {
    set({ commitments });
  },

  setStats: (total, streak) => {
    set({ totalCompletedToday: total, currentStreak: streak });
  },

  completeActionLocal: (actionId: string) => {
    const { suggestedActions, totalCompletedToday } = get();
    const updatedActions = suggestedActions.map((action) =>
      action.id === actionId
        ? { ...action, completed: true, completedAt: new Date() }
        : action
    );

    set({
      suggestedActions: updatedActions,
      totalCompletedToday: totalCompletedToday + 1,
    });
  },

  answerPromptLocal: (promptId: string, response: string) => {
    const { dailyPrompt } = get();
    if (dailyPrompt && dailyPrompt.id === promptId) {
      set({
        dailyPrompt: {
          ...dailyPrompt,
          response,
          answeredAt: new Date(),
        },
      });
    }
  },

  recordDidItLocal: () => {
    const { totalCompletedToday } = get();
    set({
      totalCompletedToday: totalCompletedToday + 1,
    });
  },

  reset: () => {
    set({
      dailyPrompt: null,
      suggestedActions: [],
      commitments: [],
      totalCompletedToday: 0,
      currentStreak: 0,
      isLoading: false,
    });
  },
}));

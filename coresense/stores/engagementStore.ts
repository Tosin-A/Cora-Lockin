/**
 * Engagement Store (Zustand)
 * Manages AI-suggested engagement actions, commitments, and rituals.
 *
 * NOTE: This store now includes AsyncStorage persistence for streak data.
 * Streaks are saved locally and synced with the backend.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface EngagementAction {
  id: string;
  title: string;
  subtitle?: string;
  duration?: string;
  category: "focus" | "wellness" | "habit" | "reflection" | "movement";
  priority: "high" | "medium" | "low";
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

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  userTimezone: string;
  lastSyncedAt: string | null;
  pendingSync: boolean;
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

  // Streak data with persistence
  streakData: StreakData;

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

  // Streak actions with persistence
  loadStreakFromStorage: () => Promise<void>;
  updateStreakLocally: (streak: number) => Promise<void>;
  setStreakData: (data: StreakData) => Promise<void>;
  markStreakPendingSync: () => Promise<void>;

  reset: () => void;
}

const STORAGE_KEY = "@coresense/engagement";
const STREAK_STORAGE_KEY = "@coresense/streak";

// Default streak data
const defaultStreakData: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  userTimezone: "UTC",
  lastSyncedAt: null,
  pendingSync: false,
};

export const useEngagementStore = create<EngagementState>((set, get) => ({
  dailyPrompt: null,
  suggestedActions: [],
  commitments: [],
  totalCompletedToday: 0,
  currentStreak: 0,
  streakData: defaultStreakData,
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

  // Load streak from AsyncStorage
  loadStreakFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      if (stored) {
        const streakData = JSON.parse(stored);
        set({ streakData, currentStreak: streakData.currentStreak || 0 });
        console.log(
          "[engagementStore] Loaded streak from storage:",
          streakData
        );
      } else {
        console.log(
          "[engagementStore] No streak data in storage, using defaults"
        );
      }
    } catch (error) {
      console.error(
        "[engagementStore] Error loading streak from storage:",
        error
      );
    }
  },

  // Update streak locally and save to AsyncStorage
  updateStreakLocally: async (streak: number) => {
    const { streakData } = get();
    const updatedStreakData: StreakData = {
      ...streakData,
      currentStreak: streak,
      longestStreak: Math.max(streakData.longestStreak, streak),
      lastActivityDate: new Date().toISOString().split("T")[0],
      lastSyncedAt: new Date().toISOString(),
      pendingSync: true, // Mark as needing sync
    };

    try {
      await AsyncStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify(updatedStreakData)
      );
      set({ streakData: updatedStreakData, currentStreak: streak });
      console.log(
        "[engagementStore] Updated streak locally:",
        updatedStreakData
      );
    } catch (error) {
      console.error("[engagementStore] Error saving streak to storage:", error);
    }
  },

  // Set full streak data (from API response)
  setStreakData: async (data: StreakData) => {
    const updatedStreakData: StreakData = {
      ...data,
      lastSyncedAt: new Date().toISOString(),
      pendingSync: false,
    };

    try {
      await AsyncStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify(updatedStreakData)
      );
      set({ streakData: updatedStreakData, currentStreak: data.currentStreak });
      console.log(
        "[engagementStore] Set streak data from API:",
        updatedStreakData
      );
    } catch (error) {
      console.error("[engagementStore] Error saving streak to storage:", error);
    }
  },

  // Mark streak as pending sync (offline mode)
  markStreakPendingSync: async () => {
    const { streakData } = get();
    const updatedStreakData = { ...streakData, pendingSync: true };

    try {
      await AsyncStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify(updatedStreakData)
      );
      set({ streakData: updatedStreakData });
    } catch (error) {
      console.error("[engagementStore] Error marking pending sync:", error);
    }
  },

  reset: () => {
    set({
      dailyPrompt: null,
      suggestedActions: [],
      commitments: [],
      totalCompletedToday: 0,
      currentStreak: 0,
      streakData: defaultStreakData,
      isLoading: false,
    });
  },
}));

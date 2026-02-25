/**
 * Message Limit Store
 * Tracks daily/weekly message limits.
 * Free: 5/day, 15/week
 */

import { create } from 'zustand';
import { coresenseApi } from '../utils/coresenseApi';
import { useAuthStore } from './authStore';

interface MessageLimitState {
  // State
  messagesUsed: number;
  messagesLimit: number;
  messagesRemaining: number;
  usagePercentage: number;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  weeklyUsed: number;
  weeklyLimit: number;
  weeklyRemaining: number;
  limitType: string | null; // "daily" | "weekly" | null
  loading: boolean;
  error: string | null;

  // Actions
  loadUsageStats: () => Promise<void>;
  canSendMessage: () => boolean;
}

export const useMessageLimitStore = create<MessageLimitState>((set, get) => ({
  // Initial state
  messagesUsed: 0,
  messagesLimit: 5,
  messagesRemaining: 5,
  usagePercentage: 0,
  dailyUsed: 0,
  dailyLimit: 5,
  dailyRemaining: 5,
  weeklyUsed: 0,
  weeklyLimit: 15,
  weeklyRemaining: 15,
  limitType: null,
  loading: false,
  error: null,

  loadUsageStats: async () => {
    set({ loading: true, error: null });

    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await coresenseApi.getMessageUsage(user.id);

      if (error) {
        set({ error, loading: false });
        return;
      }

      if (data) {
        set({
          messagesUsed: data.messages_used,
          messagesLimit: data.messages_limit,
          messagesRemaining: data.messages_remaining,
          dailyUsed: data.daily_used ?? 0,
          dailyLimit: data.daily_limit ?? 5,
          dailyRemaining: data.daily_remaining ?? 5,
          weeklyUsed: data.weekly_used ?? 0,
          weeklyLimit: data.weekly_limit ?? 15,
          weeklyRemaining: data.weekly_remaining ?? 15,
          limitType: data.limit_type ?? null,
          usagePercentage: Math.min(100, (data.daily_used / data.daily_limit) * 100),
          loading: false,
          error: null,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load usage stats',
        loading: false,
      });
    }
  },

  canSendMessage: () => {
    const { messagesRemaining } = get();
    return messagesRemaining > 0;
  },
}));

// Helper hook for components
export const useMessageLimit = () => {
  const store = useMessageLimitStore();

  return {
    ...store,
    isNearLimit: store.usagePercentage >= 80,
    isAtLimit: store.messagesRemaining <= 0,
    progressColor: store.usagePercentage >= 80
      ? '#F59E0B'
      : '#10B981',
  };
};

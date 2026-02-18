/**
 * Message Limit Store
 * Tracks daily/weekly message limits.
 * Free: 10/day, 30/week | Pro: 20/day, 100/week
 */

import { create } from 'zustand';
import { Linking } from 'react-native';
import { coresenseApi } from '../utils/coresenseApi';
import { useAuthStore } from './authStore';

// Placeholder - user will provide the real URL
const UPGRADE_URL = 'https://coresense.app/upgrade';

interface MessageLimitState {
  // State
  messagesUsed: number;
  messagesLimit: number;
  isPro: boolean;
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
  showPaywall: boolean;
  paywallMessage: string;

  // Actions
  loadUsageStats: () => Promise<void>;
  canSendMessage: () => boolean;
  showUpgradePrompt: () => void;
  hidePaywall: () => void;
  openUpgradePage: () => void;
  setUpgradeUrl: (url: string) => void;
}

let _upgradeUrl = UPGRADE_URL;

export const useMessageLimitStore = create<MessageLimitState>((set, get) => ({
  // Initial state
  messagesUsed: 0,
  messagesLimit: 10,
  isPro: false,
  messagesRemaining: 10,
  usagePercentage: 0,
  dailyUsed: 0,
  dailyLimit: 10,
  dailyRemaining: 10,
  weeklyUsed: 0,
  weeklyLimit: 30,
  weeklyRemaining: 30,
  limitType: null,
  loading: false,
  error: null,
  showPaywall: false,
  paywallMessage: '',

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
          isPro: data.is_pro,
          messagesRemaining: data.messages_remaining,
          dailyUsed: data.daily_used ?? 0,
          dailyLimit: data.daily_limit ?? 10,
          dailyRemaining: data.daily_remaining ?? 10,
          weeklyUsed: data.weekly_used ?? 0,
          weeklyLimit: data.weekly_limit ?? 30,
          weeklyRemaining: data.weekly_remaining ?? 30,
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
    const { isPro, messagesRemaining } = get();
    return isPro || messagesRemaining > 0;
  },

  showUpgradePrompt: () => {
    const { dailyUsed, dailyLimit, weeklyUsed, weeklyLimit } = get();

    let message: string;
    if (dailyUsed >= dailyLimit) {
      message = `You've used all ${dailyLimit} messages for today. Upgrade to Pro for 20 messages per day and 100 per week.`;
    } else if (weeklyUsed >= weeklyLimit) {
      message = `You've used all ${weeklyLimit} messages this week. Upgrade to Pro for 20 messages per day and 100 per week.`;
    } else {
      message = 'Upgrade to Pro for more messages.';
    }

    set({ showPaywall: true, paywallMessage: message });
  },

  hidePaywall: () => {
    set({ showPaywall: false });
  },

  openUpgradePage: () => {
    Linking.openURL(_upgradeUrl);
  },

  setUpgradeUrl: (url: string) => {
    _upgradeUrl = url;
  },
}));

// Helper hook for components
export const useMessageLimit = () => {
  const store = useMessageLimitStore();

  return {
    ...store,
    isNearLimit: store.usagePercentage >= 80,
    isAtLimit: store.messagesRemaining <= 0,
    progressColor: store.isPro
      ? '#8B5CF6'
      : store.usagePercentage >= 80
        ? '#F59E0B'
        : '#10B981',
  };
};

/**
 * Message Limit Store - State management for message usage tracking
 * Tracks 10-message limit for free users with pro upgrade functionality
 */

import { create } from 'zustand';
import { Alert } from 'react-native';
import { coresenseApi } from '../utils/coresenseApi';
import { useAuthStore } from './authStore';

interface MessageLimitState {
  // State
  messagesUsed: number;
  messagesLimit: number;
  isPro: boolean;
  messagesRemaining: number;
  usagePercentage: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadUsageStats: () => Promise<void>;
  checkLimit: () => boolean;
  canSendMessage: () => boolean;
  getUpgradePrompt: () => string;
  showUpgradePrompt: () => void;
  upgradeToPro: () => Promise<boolean>;
}

export const useMessageLimitStore = create<MessageLimitState>((set, get) => ({
  // Initial state
  messagesUsed: 0,
  messagesLimit: 10,
  isPro: false,
  messagesRemaining: 10,
  usagePercentage: 0,
  loading: false,
  error: null,

  // Actions
  loadUsageStats: async () => {
    set({ loading: true, error: null });
    
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.log('No authenticated user, skipping usage stats load');
        set({ loading: false });
        return;
      }

      console.log('Loading usage stats for user:', user.id);
      const { data, error } = await coresenseApi.getMessageUsage(user.id);
      
      if (error) {
        console.error('Failed to load usage stats:', error);
        set({ 
          error: error,
          loading: false 
        });
        return;
      }

      if (data) {
        console.log('Usage stats loaded:', data);
        set({
          messagesUsed: data.messages_used,
          messagesLimit: data.messages_limit,
          isPro: data.is_pro,
          messagesRemaining: typeof data.messages_remaining === 'number' 
            ? data.messages_remaining 
            : (data.is_pro ? 999 : Math.max(0, data.messages_limit - data.messages_used)),
          usagePercentage: Math.min(100, (data.messages_used / data.messages_limit) * 100),
          loading: false,
          error: null
        });
      }
    } catch (error: any) {
      console.error('Error loading usage stats:', error);
      set({ 
        error: error.message || 'Failed to load usage stats',
        loading: false 
      });
    }
  },

  checkLimit: () => {
    const { isPro, messagesRemaining } = get();
    return isPro || messagesRemaining > 0;
  },

  canSendMessage: () => {
    const { isPro, messagesRemaining } = get();
    return isPro || messagesRemaining > 0;
  },

  getUpgradePrompt: () => {
    const { messagesUsed, messagesLimit, isPro } = get();
    
    if (isPro) {
      return 'You have unlimited messages with Pro!';
    }
    
    if (messagesUsed >= messagesLimit) {
      return `You've used all ${messagesLimit} free messages. Upgrade to Pro for unlimited messages!`;
    }
    
    const remaining = messagesLimit - messagesUsed;
    return `You've used ${messagesUsed}/${messagesLimit} free messages. ${remaining} remaining. Upgrade to Pro for unlimited messages!`;
  },

  showUpgradePrompt: () => {
    const { messagesUsed, messagesLimit, isPro, upgradeToPro } = get();
    
    if (isPro) {
      Alert.alert(
        'Pro Plan',
        'You already have unlimited messages with Pro!',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const remaining = messagesLimit - messagesUsed;
    
    Alert.alert(
      'Upgrade to Pro',
      `${get().getUpgradePrompt()}\\n\\nPro features:\\n• Unlimited messages\\n• Priority support\\n• Advanced coach features\\n• Early access to new features`,
      [
        { 
          text: 'Maybe Later', 
          style: 'cancel',
          onPress: () => console.log('User chose to upgrade later')
        },
        { 
          text: 'Upgrade Now', 
          onPress: async () => {
            console.log('User wants to upgrade to Pro');
            const success = await upgradeToPro();
            if (success) {
              Alert.alert(
                'Welcome to Pro! 🎉',
                'You now have unlimited messages. Enjoy your enhanced coaching experience!',
                [{ text: 'Awesome!' }]
              );
            }
          }
        }
      ]
    );
  },

  upgradeToPro: async () => {
    set({ loading: true, error: null });
    
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Upgrading user to Pro:', user.id);
      const { success, error } = await coresenseApi.upgradeToPro(user.id);
      
      if (error) {
        console.error('Failed to upgrade to Pro:', error);
        set({ 
          error: error,
          loading: false 
        });
        return false;
      }

      if (success) {
        console.log('Successfully upgraded to Pro');
        // Refresh usage stats to reflect Pro status
        await get().loadUsageStats();
        set({ loading: false });
        return true;
      } else {
        throw new Error('Upgrade failed');
      }
      
    } catch (error: any) {
      console.error('Error upgrading to Pro:', error);
      set({ 
        error: error.message || 'Failed to upgrade to Pro',
        loading: false 
      });
      return false;
    }
  },
}));

// Helper hook for components that need to react to usage changes
export const useMessageLimit = () => {
  const store = useMessageLimitStore();
  
  return {
    ...store,
    // Computed values
    isNearLimit: store.usagePercentage >= 80,
    isAtLimit: store.messagesUsed >= store.messagesLimit,
    progressColor: store.isPro 
      ? '#8B5CF6' // Purple for Pro
      : store.usagePercentage >= 80 
        ? '#F59E0B' // Orange for near limit
        : '#10B981', // Green for safe
  };
};

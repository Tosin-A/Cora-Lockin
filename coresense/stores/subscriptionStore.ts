/**
 * Subscription Store
 * Manages Pro subscription state, Stripe Checkout flow, and portal access.
 */

import { create } from 'zustand';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { coresenseApi } from '../utils/coresenseApi';
import { useMessageLimitStore } from './messageLimitStore';

interface SubscriptionState {
  isPro: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  checkoutLoading: boolean;
  error: string | null;

  loadSubscriptionStatus: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  handleSubscriptionSuccess: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  status: 'inactive',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  loading: false,
  checkoutLoading: false,
  error: null,

  loadSubscriptionStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await coresenseApi.getSubscriptionStatus();
      if (error) {
        set({ error, loading: false });
        return;
      }
      if (data) {
        set({
          isPro: data.is_pro,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          loading: false,
        });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to load subscription status', loading: false });
    }
  },

  startCheckout: async () => {
    set({ checkoutLoading: true, error: null });
    try {
      const { data, error } = await coresenseApi.createCheckoutSession();

      if (error) {
        set({ error, checkoutLoading: false });
        Alert.alert('Error', error);
        return;
      }

      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to start checkout', checkoutLoading: false });
      Alert.alert('Error', 'Could not open checkout. Please try again.');
    } finally {
      set({ checkoutLoading: false });
    }
  },

  openCustomerPortal: async () => {
    try {
      const { data, error } = await coresenseApi.createPortalSession();
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open billing portal. Please try again.');
    }
  },

  cancelSubscription: async () => {
    try {
      const { data, error } = await coresenseApi.cancelSubscription();
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      if (data) {
        set({
          cancelAtPeriodEnd: data.cancel_at_period_end,
          currentPeriodEnd: data.current_period_end,
        });
        Alert.alert(
          'Subscription Cancelled',
          `Your Pro access will remain active until ${
            data.current_period_end
              ? new Date(data.current_period_end).toLocaleDateString()
              : 'the end of your billing period'
          }.`,
        );
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not cancel subscription. Please try again.');
    }
  },

  handleSubscriptionSuccess: async () => {
    await get().loadSubscriptionStatus();
    useMessageLimitStore.getState().loadUsageStats();
  },
}));

/**
 * Subscription Store
 * Manages Pro subscription state.
 * IAP only (StoreKit on iOS). No Stripe.
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import { Alert } from 'react-native';
import { coresenseApi } from '../utils/coresenseApi';
import { useMessageLimitStore } from './messageLimitStore';
import {
  isIAPAvailable,
  initIAP,
  purchaseProSubscription,
  getReceiptForVerification,
  finishIAPTransaction,
  showManageSubscriptionsIOS,
} from '../utils/iap';

interface SubscriptionState {
  isPro: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  source: 'stripe' | 'apple' | null;
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
  source: null,
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
          source: data.source ?? null,
          loading: false,
        });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to load subscription status', loading: false });
    }
  },

  startCheckout: async () => {
    if (Platform.OS !== 'ios' || !isIAPAvailable()) {
      Alert.alert(
        'Pro on iOS',
        'Pro subscription is available via In-App Purchase on iOS. Please use an iPhone or iPad to upgrade.',
      );
      return;
    }
    set({ checkoutLoading: true, error: null });
    try {
      await initIAP();
      const purchase = await purchaseProSubscription();
      if (!purchase) {
        set({ checkoutLoading: false });
        return;
      }
      const receipt = await getReceiptForVerification();
      if (!receipt) {
        set({ checkoutLoading: false });
        Alert.alert(
          'Verification Issue',
          'Could not retrieve receipt. Please try again or contact support.',
        );
        return;
      }
      const { data, error } = await coresenseApi.verifyIAPPurchase({
        platform: 'ios',
        productId: purchase.productId,
        transactionId: purchase.transactionId ?? '',
        receipt,
      });
      if (error) {
        set({ error, checkoutLoading: false });
        Alert.alert('Error', error);
        return;
      }
      if (data) {
        set({
          isPro: data.is_pro,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          source: 'apple',
        });
        await finishIAPTransaction(purchase);
        useMessageLimitStore.getState().loadUsageStats();
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to start checkout', checkoutLoading: false });
      Alert.alert('Error', e.message || 'Could not complete purchase. Please try again.');
    } finally {
      set({ checkoutLoading: false });
    }
  },

  openCustomerPortal: async () => {
    try {
      if (Platform.OS === 'ios') {
        await showManageSubscriptionsIOS();
      } else {
        Alert.alert(
          'Pro on iOS',
          'Manage your Pro subscription in the App Store on your iPhone or iPad.',
        );
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open subscription settings. Please try again.');
    }
  },

  cancelSubscription: async () => {
    try {
      if (Platform.OS === 'ios') {
        await showManageSubscriptionsIOS();
        Alert.alert(
          'Manage Subscription',
          'Use the App Store settings to cancel or modify your subscription.',
        );
      } else {
        Alert.alert(
          'Pro on iOS',
          'Manage your Pro subscription in the App Store on your iPhone or iPad.',
        );
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open subscription settings. Please try again.');
    }
  },

  handleSubscriptionSuccess: async () => {
    await get().loadSubscriptionStatus();
    useMessageLimitStore.getState().loadUsageStats();
  },
}));

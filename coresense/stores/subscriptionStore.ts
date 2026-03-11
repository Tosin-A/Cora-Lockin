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
  restoreProPurchase,
  getReceiptForVerification,
  finishIAPTransaction,
  showManageSubscriptionsIOS,
  fetchSubscriptionProducts,
} from '../utils/iap';

interface SubscriptionState {
  isPro: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  source: 'stripe' | 'apple' | null;
  loading: boolean;
  checkoutLoading: boolean;
  restoreLoading: boolean;
  error: string | null;
  priceString: string | null;

  loadSubscriptionStatus: () => Promise<void>;
  loadProductPrice: () => Promise<void>;
  startCheckout: () => Promise<void>;
  restorePurchases: () => Promise<void>;
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
  restoreLoading: false,
  error: null,
  priceString: null,

  loadProductPrice: async () => {
    if (!isIAPAvailable()) return;
    try {
      await initIAP();
      const products = await fetchSubscriptionProducts();
      if (products && products.length > 0) {
        const product = products[0];
        const price = product.displayPrice || product.localizedPrice || null;
        console.log('[SubscriptionStore] Product price loaded:', { displayPrice: product.displayPrice, localizedPrice: product.localizedPrice, resolved: price });
        set({ priceString: price });
      } else {
        console.warn('[SubscriptionStore] No subscription products returned');
      }
    } catch (e) {
      console.warn('[SubscriptionStore] Failed to load product price:', e);
    }
  },

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
      // Prefer the receipt from the purchase transaction (fresh), fall back to device receipt
      const receipt = purchase.transactionReceipt || await getReceiptForVerification();
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
        // Refresh from backend to ensure UI stays in sync
        await get().loadSubscriptionStatus();
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to start checkout', checkoutLoading: false });
      if (e.message === 'IAP_PRODUCT_NOT_FOUND') {
        Alert.alert(
          'Pro Subscription Not Found',
          'The Pro product could not be loaded from the App Store.\n\n' +
            'Checklist:\n' +
            '• Product "com.coresense.app.pro_monthly" created in App Store Connect → Subscriptions\n' +
            '• Product status is "Ready to Submit"\n' +
            '• Paid Apps Agreement signed (App Store Connect → Agreements)\n' +
            '• Banking & tax info complete\n' +
            '• In-App Purchase capability added in Xcode\n' +
            '• Testing on a physical device (not simulator)\n' +
            '• Using a Sandbox tester account',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert('Error', e.message || 'Could not complete purchase. Please try again.');
      }
    } finally {
      set({ checkoutLoading: false });
    }
  },

  restorePurchases: async () => {
    if (Platform.OS !== 'ios' || !isIAPAvailable()) return;
    set({ restoreLoading: true, error: null });
    try {
      const purchase = await restoreProPurchase();
      if (!purchase) {
        Alert.alert('No Purchases Found', 'No active Pro subscription found on this device.');
        set({ restoreLoading: false });
        return;
      }
      const receipt = purchase.transactionReceipt || await getReceiptForVerification();
      if (!receipt) {
        Alert.alert('Verification Issue', 'Could not retrieve receipt. Please try again.');
        set({ restoreLoading: false });
        return;
      }
      const { data, error } = await coresenseApi.verifyIAPPurchase({
        platform: 'ios',
        productId: purchase.productId,
        transactionId: purchase.transactionId ?? '',
        receipt,
      });
      if (error) {
        Alert.alert('Error', error);
        set({ restoreLoading: false });
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
        useMessageLimitStore.getState().loadUsageStats();
        await get().loadSubscriptionStatus();
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not restore purchases.');
    } finally {
      set({ restoreLoading: false });
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

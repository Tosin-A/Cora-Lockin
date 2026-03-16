/**
 * In-App Purchase utilities for iOS (StoreKit) and Android (Google Play)
 * Uses react-native-iap. On web, IAP is not available.
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getReceiptIOS,
  requestReceiptRefreshIOS,
  getAvailablePurchases,
  finishTransaction,
  showManageSubscriptionsIOS as showManageSubscriptionsIOSNative,
  type Purchase,
} from 'react-native-iap';
import { IAP_SUBSCRIPTION_SKUS, IAP_PRODUCT_IDS } from '../constants/iap';

let purchaseListener: { remove: () => void } | null = null;
let errorListener: { remove: () => void } | null = null;

export const isIAPAvailable = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export const initIAP = async (): Promise<boolean> => {
  if (!isIAPAvailable()) return false;
  try {
    await initConnection();
    return true;
  } catch (e) {
    console.warn('[IAP] initConnection failed:', e);
    return false;
  }
};

export const endIAP = (): void => {
  if (purchaseListener) {
    purchaseListener.remove();
    purchaseListener = null;
  }
  if (errorListener) {
    errorListener.remove();
    errorListener = null;
  }
  if (isIAPAvailable()) {
    endConnection();
  }
};

export const fetchSubscriptionProducts = async () => {
  if (!isIAPAvailable()) return [];
  return fetchProducts({ skus: [...IAP_SUBSCRIPTION_SKUS], type: 'subs' });
};

export const purchaseProSubscription = async (): Promise<Purchase | null> => {
  if (!isIAPAvailable()) {
    throw new Error('IAP not available on this platform');
  }

  // Must fetch products first — StoreKit returns "SKU not found" otherwise
  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    products = await fetchProducts({
      skus: [...IAP_SUBSCRIPTION_SKUS],
      type: 'subs',
    });
  } catch (fetchError: any) {
    throw new Error(
      `Could not load Pro subscription: ${fetchError?.message || 'Unknown error'}. See docs/IAP_SETUP.md for setup.`,
    );
  }
  if (!products || products.length === 0) {
    throw new Error('IAP_PRODUCT_NOT_FOUND');
  }

  console.log('[IAP] Products fetched:', products.map((p: any) => ({ id: p.productId, price: p.localizedPrice })));
  console.log('[IAP] Starting purchase for', IAP_PRODUCT_IDS.PRO_MONTHLY);

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (purchaseListener) {
        purchaseListener.remove();
        purchaseListener = null;
      }
      if (errorListener) {
        errorListener.remove();
        errorListener = null;
      }
    };

    // Timeout after 2 minutes to prevent infinite hang
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        console.warn('[IAP] Purchase timed out after 120s');
        reject(new Error('Purchase timed out. Please try again.'));
      }
    }, 120000);

    purchaseListener = purchaseUpdatedListener((purchase) => {
      console.log('[IAP] purchaseUpdatedListener fired:', purchase.productId, purchase.transactionId);
      if ((IAP_SUBSCRIPTION_SKUS as readonly string[]).includes(purchase.productId)) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          cleanup();
          resolve(purchase);
        }
      }
    });

    errorListener = purchaseErrorListener(async (error) => {
      console.log('[IAP] purchaseErrorListener fired:', error.code, error.message);
      cleanup();
      clearTimeout(timeout);
      if (settled) return;
      settled = true;

      if ((error.code as string) === 'E_USER_CANCELLED') {
        resolve(null);
        return;
      }
      // "Item already owned" = user has active subscription, restore it
      if ((error.code as string) === 'E_ALREADY_OWNED' || /already own|already bought/i.test(error.message || '')) {
        try {
          const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
          const proPurchase = purchases?.find((p) => (IAP_SUBSCRIPTION_SKUS as readonly string[]).includes(p.productId));
          if (proPurchase) {
            resolve(proPurchase);
            return;
          }
        } catch {
          // Fall through to reject
        }
      }
      reject(new Error(error.message || 'Purchase failed'));
    });

    requestPurchase({
      request: {
        apple: { sku: IAP_PRODUCT_IDS.PRO_MONTHLY, quantity: 1 },
        google: { skus: [IAP_PRODUCT_IDS.PRO_MONTHLY] },
      },
      type: 'subs',
    }).catch((e) => {
      console.error('[IAP] requestPurchase error:', e);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        cleanup();
        reject(e);
      }
    });
  });
};

export const getReceiptForVerification = async (): Promise<string | null> => {
  if (Platform.OS !== 'ios') return null;
  try {
    let receipt = await getReceiptIOS();
    if (!receipt) {
      receipt = await requestReceiptRefreshIOS();
    }
    return receipt || null;
  } catch {
    return null;
  }
};

export const getActivePurchases = async () => {
  if (!isIAPAvailable()) return [];
  return getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
};

/** Restore existing Pro subscription and return the purchase if found. */
export const restoreProPurchase = async (): Promise<Purchase | null> => {
  if (!isIAPAvailable()) return null;
  try {
    await initConnection();
    const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    return purchases?.find((p) => (IAP_SUBSCRIPTION_SKUS as readonly string[]).includes(p.productId)) ?? null;
  } catch {
    return null;
  }
};

export const finishIAPTransaction = async (purchase: Purchase): Promise<void> => {
  if (isIAPAvailable()) {
    await finishTransaction({ purchase });
  }
};

export const showManageSubscriptionsIOS = (): Promise<void> =>
  Platform.OS === 'ios' ? showManageSubscriptionsIOSNative().then(() => {}) : Promise.resolve();

export { IAP_PRODUCT_IDS };

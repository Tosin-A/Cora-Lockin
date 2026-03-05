/**
 * In-App Purchase product IDs
 *
 * Setup required:
 * 1. App Store Connect: Create subscription product with this ID (com.coresense.app.pro_monthly)
 * 2. App Store Connect > App > Subscriptions: Create App-Specific Shared Secret, add to backend as APPLE_SHARED_SECRET
 * 3. Xcode: Add "In-App Purchase" capability to the app target (react-native-iap plugin may add this)
 */
export const IAP_PRODUCT_IDS = {
  PRO_MONTHLY: 'com.coresense.app.pro_monthly',
} as const;

export const IAP_SUBSCRIPTION_SKUS = [IAP_PRODUCT_IDS.PRO_MONTHLY] as const;

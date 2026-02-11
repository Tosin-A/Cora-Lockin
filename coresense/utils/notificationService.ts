/**
 * Notification Service for CoreSense
 * Handles push notification registration, handlers, and local scheduling
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { coresenseApi } from './coresenseApi';

// Notification types matching backend
export enum NotificationType {
  TASK_REMINDER = 'task_reminder',
  COACH_NUDGE = 'coach_nudge',
  INSIGHT = 'insight',
  STREAK_ALERT = 'streak_alert',
  COACH_TASK = 'coach_task',
  COACH_MESSAGE = 'coach_message',
}

// Types for notification handling
export interface NotificationData {
  type?: NotificationType | string;
  screen?: string;
  task_id?: string;
  insight_id?: string;
  nudge_type?: string;
  reference_type?: string;
  reference_id?: string;
  params?: Record<string, any>;
  [key: string]: any;
}

export interface ScheduledNotification {
  title: string;
  body: string;
  triggerDate: Date;
  data?: NotificationData;
}

// Navigation reference for deep linking from notifications
let navigationRef: any = null;

export function setNotificationNavigationRef(ref: any) {
  navigationRef = ref;
}

/**
 * Register for push notifications and get the Expo push token.
 * Also registers the token with the backend for server-side push notifications.
 * Returns null if notifications are not available (e.g., Expo Go, development).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Dynamically import expo-notifications to handle cases where it's not available
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications) {
      console.log('[notificationService] expo-notifications not available');
      return null;
    }

    const isPhysicalDevice = typeof (Constants as { isDevice?: boolean }).isDevice === 'boolean'
      ? (Constants as { isDevice?: boolean }).isDevice
      : Platform.OS !== 'web';

    // Check if we're on a physical device (required for push notifications)
    if (!isPhysicalDevice) {
      console.log('[notificationService] Push notifications require a physical device');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[notificationService] Push notification permission denied');
      return null;
    }

    // Get the Expo push token
    // Use project ID from app.json extra.eas.projectId
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[notificationService] No project ID found in app config');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenData.data;
    console.log('[notificationService] Expo push token obtained:', expoPushToken);

    // Register token with backend for server-side push notifications
    await registerTokenWithBackend(expoPushToken);

    return expoPushToken;
  } catch (error) {
    console.log('[notificationService] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Register the push token with the backend API.
 * This allows the server to send push notifications.
 */
async function registerTokenWithBackend(expoPushToken: string): Promise<void> {
  try {
    const platform = Platform.OS as 'ios' | 'android';

    const result = await coresenseApi.registerDeviceToken(expoPushToken, platform);

    if (result.error) {
      console.log('[notificationService] Failed to register token with backend:', result.error);
    } else {
      console.log('[notificationService] Token registered with backend successfully');
    }
  } catch (error) {
    console.log('[notificationService] Error registering token with backend:', error);
  }
}

/**
 * Unregister the device token from the backend.
 * Call this on logout or when user disables notifications.
 */
export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    const result = await coresenseApi.unregisterDeviceToken(token);

    if (result.error) {
      console.log('[notificationService] Failed to unregister token:', result.error);
    } else {
      console.log('[notificationService] Token unregistered successfully');
    }
  } catch (error) {
    console.log('[notificationService] Error unregistering token:', error);
  }
}

/**
 * Set up notification handlers for foreground and background handling.
 * Also handles navigation when user taps on a notification.
 */
export async function setupNotificationHandlers(): Promise<() => void> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications) {
      console.log('[notificationService] expo-notifications not available for handlers');
      return () => {};
    }

    // Configure notification behavior for iOS
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Handle notifications received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[notificationService] Foreground notification received:', notification);
        // You can handle foreground notifications here (e.g., show in-app toast)
      }
    );

    // Handle notification tap (user interaction)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[notificationService] Notification tapped:', response);

        const data = response.notification.request.content.data as NotificationData;

        // Handle navigation based on notification type
        handleNotificationNavigation(data);
      }
    );

    // Return cleanup function
    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.log('[notificationService] Error setting up notification handlers:', error);
    return () => {};
  }
}

/**
 * Handle navigation when a notification is tapped.
 * Routes to the appropriate screen based on notification type.
 */
function handleNotificationNavigation(data: NotificationData): void {
  if (!navigationRef) {
    console.log('[notificationService] Navigation ref not set, cannot navigate');
    return;
  }

  try {
    // If explicit screen is provided, use it
    if (data?.screen) {
      navigationRef.navigate(data.screen, data.params || {});
      return;
    }

    // Otherwise, route based on notification type
    switch (data?.type) {
      case NotificationType.TASK_REMINDER:
      case NotificationType.COACH_TASK:
        navigationRef.navigate('Tasks');
        break;

      case NotificationType.COACH_NUDGE:
      case NotificationType.COACH_MESSAGE:
        navigationRef.navigate('Coach');
        break;

      case NotificationType.INSIGHT:
        navigationRef.navigate('Insights');
        break;

      case NotificationType.STREAK_ALERT:
        navigationRef.navigate('Home');
        break;

      default:
        // Default to Home for unknown types
        navigationRef.navigate('Home');
        break;
    }
  } catch (navError) {
    console.log('[notificationService] Navigation error:', navError);
  }
}

/**
 * Schedule a local notification for a specific time.
 * Useful for reminders and scheduled nudges.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: NotificationData
): Promise<string | null> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications) {
      console.log('[notificationService] expo-notifications not available for scheduling');
      return null;
    }

    // Calculate seconds until trigger
    const now = new Date();
    const secondsUntilTrigger = Math.max(
      Math.floor((triggerDate.getTime() - now.getTime()) / 1000),
      1
    );

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger,
      },
    });

    console.log('[notificationService] Local notification scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.log('[notificationService] Error scheduling local notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled local notification.
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications) {
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[notificationService] Notification cancelled:', notificationId);
  } catch (error) {
    console.log('[notificationService] Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled local notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications) {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[notificationService] All notifications cancelled');
  } catch (error) {
    console.log('[notificationService] Error cancelling all notifications:', error);
  }
}

/**
 * Get the current badge count (iOS only).
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications || Platform.OS !== 'ios') {
      return 0;
    }

    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.log('[notificationService] Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set the badge count (iOS only).
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    const Notifications = await import('expo-notifications').catch(() => null);

    if (!Notifications || Platform.OS !== 'ios') {
      return;
    }

    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.log('[notificationService] Error setting badge count:', error);
  }
}

// Export default object with all functions
export const notificationService = {
  registerForPushNotifications,
  unregisterPushNotifications,
  setupNotificationHandlers,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  setNotificationNavigationRef,
  getBadgeCount,
  setBadgeCount,
};

export default notificationService;

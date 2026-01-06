/**
 * HealthKit Service
 * Handles HealthKit permissions and data fetching
 */

import { Platform } from 'react-native';

// Dynamic import for react-native-health to handle Expo Go limitations
let AppleHealthKit: any = null;
let HealthKitPermissions: any = null;
let HealthValue: any = null;
let HealthInputOptions: any = null;
let HealthUnit: any = null;

try {
  // Only import if we're not in Expo Go (Expo Go doesn't support native modules)
  if (Platform.OS === 'ios' && !__DEV__) {
    const healthKit = require('react-native-health');
    AppleHealthKit = healthKit.default || healthKit;
    HealthKitPermissions = healthKit.HealthKitPermissions;
    HealthValue = healthKit.HealthValue;
    HealthInputOptions = healthKit.HealthInputOptions;
    HealthUnit = healthKit.HealthUnit;
  }
} catch (error) {
  console.warn('react-native-health not available - this is expected in Expo Go');
  // Module not available, keep variables as null
}

/* Permission options - only define if AppleHealthKit is available */
const permissions = AppleHealthKit ? {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
    ],
    write: [], // We don't write data, only read
  },
} : null;

export interface HealthData {
  steps: number;
  activeEnergy: number;
  sleepHours: number;
  date: Date;
}

export interface HealthKitStatus {
  isAvailable: boolean;
  permissionsGranted: boolean;
}

/**
 * Request HealthKit permissions explicitly (for retry scenarios)
 */
export const requestHealthKitPermissions = (): Promise<HealthKitStatus> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      resolve({
        isAvailable: false,
        permissionsGranted: false,
      });
      return;
    }

    AppleHealthKit?.isAvailable((error: Object, available: boolean) => {
      if (error) {
        console.error('HealthKit availability check failed:', error);
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      if (!available) {
        console.warn('HealthKit is not available on this device');
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      // Request permissions again
      AppleHealthKit?.initHealthKit(permissions, (error: Object) => {
        if (error) {
          console.error('HealthKit permission request error:', error);
          resolve({
            isAvailable: true,
            permissionsGranted: false,
          });
          return;
        }

        // Check if permissions were granted
        checkPermissions().then((granted) => {
          resolve({
            isAvailable: true,
            permissionsGranted: granted,
          });
        });
      });
    });
  });
};

/**
 * Initialize HealthKit and request permissions
 */
export const initializeHealthKit = (): Promise<HealthKitStatus> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      resolve({
        isAvailable: false,
        permissionsGranted: false,
      });
      return;
    }

    AppleHealthKit?.isAvailable((error: Object, available: boolean) => {
      if (error) {
        console.error('HealthKit availability check failed:', error);
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      if (!available) {
        console.warn('HealthKit is not available on this device');
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      // Request permissions
      AppleHealthKit?.initHealthKit(permissions, (error: Object) => {
        if (error) {
          console.error('HealthKit initialization error:', error);
          resolve({
            isAvailable: true,
            permissionsGranted: false,
          });
          return;
        }

        // Check if permissions were granted
        checkPermissions().then((granted) => {
          resolve({
            isAvailable: true,
            permissionsGranted: granted,
          });
        });
      });
    });
  });
};

/**
 * Check if HealthKit permissions are granted
 */
export const checkPermissions = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit || !permissions) {
      resolve(false);
      return;
    }

    AppleHealthKit?.getAuthStatus(
      permissions?.permissions?.read || [],
      (error: Object, results: Object) => {
        if (error) {
          console.error('Permission check error:', error);
          resolve(false);
          return;
        }

        // Check if any permission is granted
        const statuses = Object.values(results as Record<string, number>);
        const hasPermission = statuses.some(
          (status) => status === AppleHealthKit?.Constants?.Permissions?.Authorized
        );
        resolve(hasPermission);
      }
    );
  });
};

/**
 * Get steps for a specific date
 */
export const getStepsForDate = (date: Date): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve(0);
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const options: any = {
      date: date.toISOString(),
      unit: HealthUnit?.count || 'count',
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    };

    AppleHealthKit?.getStepCount(options, (error: Object, results: any) => {
      if (error) {
        console.error('Error fetching steps:', error);
        resolve(0);
        return;
      }

      resolve(results.value || 0);
    });
  });
};

/**
 * Get daily steps for a date range
 */
export const getDailySteps = (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; steps: number }>> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve([]);
      return;
    }

    const options: any = {
      unit: HealthUnit?.count || 'count',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    AppleHealthKit?.getDailyStepCountSamples(
      options,
      (error: Object, results: any[]) => {
        if (error) {
          console.error('Error fetching daily steps:', error);
          resolve([]);
          return;
        }

        const dailySteps = results.map((sample) => ({
          date: new Date(sample.startDate),
          steps: sample.value || 0,
        }));

        resolve(dailySteps);
      }
    );
  });
};

/**
 * Get sleep duration for a specific date (last night)
 */
export const getSleepForDate = (date: Date): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve(0);
      return;
    }

    // Get sleep from the previous night (sleep analysis is typically recorded for the night before)
    const startOfSleep = new Date(date);
    startOfSleep.setDate(startOfSleep.getDate() - 1);
    startOfSleep.setHours(18, 0, 0, 0); // Evening before

    const endOfSleep = new Date(date);
    endOfSleep.setHours(12, 0, 0, 0); // Noon of current day

    const options: any = {
      startDate: startOfSleep.toISOString(),
      endDate: endOfSleep.toISOString(),
    };

    AppleHealthKit?.getSleepSamples(options, (error: Object, results: any[]) => {
      if (error) {
        console.error('Error fetching sleep:', error);
        resolve(0);
        return;
      }

      // Calculate total sleep hours
      let totalSleepSeconds = 0;
      results.forEach((sample) => {
        if (sample.value === AppleHealthKit?.Constants?.Sleep?.SLEEPING) {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          totalSleepSeconds += (end - start) / 1000;
        }
      });

      const hours = totalSleepSeconds / 3600;
      resolve(hours);
    });
  });
};

/**
 * Get sleep duration for a date range
 */
export const getDailySleep = (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; hours: number }>> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve([]);
      return;
    }

    const options: any = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit?.getSleepSamples(options, (error: Object, results: any[]) => {
      if (error) {
        console.error('Error fetching daily sleep:', error);
        resolve([]);
        return;
      }

      // Group sleep by date
      const sleepByDate: Record<string, number> = {};

      results.forEach((sample) => {
        if (sample.value === AppleHealthKit?.Constants?.Sleep?.SLEEPING) {
          const sleepDate = new Date(sample.endDate);
          const dateKey = sleepDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          const hours = (end - start) / (1000 * 3600);

          if (!sleepByDate[dateKey]) {
            sleepByDate[dateKey] = 0;
          }
          sleepByDate[dateKey] += hours;
        }
      });

      const dailySleep = Object.entries(sleepByDate).map(([dateKey, hours]) => ({
        date: new Date(dateKey),
        hours,
      }));

      resolve(dailySleep);
    });
  });
};

/**
 * Get active energy burned for a date
 */
export const getActiveEnergyForDate = (date: Date): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve(0);
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const options: any = {
      date: date.toISOString(),
      unit: HealthUnit?.kilocalorie || 'kilocalorie',
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    };

    AppleHealthKit?.getActiveEnergyBurned(
      options,
      (error: Object, results: any[]) => {
        if (error) {
          console.error('Error fetching active energy:', error);
          resolve(0);
          return;
        }

        const total = results.reduce((sum, sample) => sum + (sample.value || 0), 0);
        resolve(total);
      }
    );
  });
};

/**
 * Get today's health summary
 */
export const getTodayHealthData = async (): Promise<HealthData> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [steps, activeEnergy, sleepHours] = await Promise.all([
    getStepsForDate(today),
    getActiveEnergyForDate(today),
    getSleepForDate(today), // Last night's sleep
  ]);

  return {
    steps,
    activeEnergy,
    sleepHours,
    date: today,
  };
};

/**
 * Get weekly health data
 */
export const getWeeklyHealthData = async (): Promise<{
  steps: Array<{ date: Date; steps: number }>;
  sleep: Array<{ date: Date; hours: number }>;
}> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [steps, sleep] = await Promise.all([
    getDailySteps(startDate, endDate),
    getDailySleep(startDate, endDate),
  ]);

  return { steps, sleep };
};



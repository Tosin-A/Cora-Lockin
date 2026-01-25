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

console.log('[HealthService] Module loading, Platform:', Platform.OS);

try {
  // Try to import on iOS - works in development builds and production, fails in Expo Go
  if (Platform.OS === 'ios') {
    console.log('[HealthService] Attempting to require react-native-health...');
    const healthKitModule = require('react-native-health');
    console.log('[HealthService] healthKit module keys:', Object.keys(healthKitModule || {}));

    // Handle both default export and direct export patterns
    const healthKit = healthKitModule.default || healthKitModule;
    console.log('[HealthService] healthKit resolved keys:', Object.keys(healthKit || {}));

    AppleHealthKit = healthKit;

    console.log('[HealthService] AppleHealthKit:', AppleHealthKit ? 'loaded' : 'null');
    console.log('[HealthService] Has Constants:', !!AppleHealthKit?.Constants);
    console.log('[HealthService] Has initHealthKit:', typeof AppleHealthKit?.initHealthKit);
    console.log('[HealthService] Has isAvailable:', typeof AppleHealthKit?.isAvailable);

    // Check for the native module - it should have initHealthKit function
    if (typeof AppleHealthKit?.initHealthKit === 'function') {
      HealthUnit = AppleHealthKit.Constants?.Units;
      console.log('[HealthService] HealthKit module loaded successfully');
    } else {
      console.warn('[HealthService] AppleHealthKit native module not properly linked');
      console.warn('[HealthService] Available properties:', JSON.stringify(Object.keys(healthKit || {})));
      AppleHealthKit = null;
    }
  }
} catch (error: any) {
  console.warn('[HealthService] react-native-health not available:', error?.message || error);
  // Module not available, keep variables as null
}

/* Permission options - define lazily when needed */
const getPermissions = () => {
  if (!AppleHealthKit?.Constants?.Permissions) {
    console.warn('[HealthService] Cannot get permissions - Constants not available');
    return null;
  }
  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.SleepAnalysis,
        AppleHealthKit.Constants.Permissions.HeartRate,
      ],
      write: [], // We don't write data, only read
    },
  };
};

export interface HealthData {
  steps: number;
  activeEnergy: number;
  sleepHours: number;
  heartRate: number | null;
  date: Date;
}

export interface DetailedSleepData {
  date: Date;           // The date this sleep is attributed to (wake date)
  durationHours: number;
  bedtime: Date | null;  // When they went to bed
  wakeTime: Date | null; // When they woke up
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
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve({
        isAvailable: false,
        permissionsGranted: false,
      });
      return;
    }

    AppleHealthKit.isAvailable((error: Object, available: boolean) => {
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
      const perms = getPermissions();
      console.log('[HealthService] Requesting permissions with:', JSON.stringify(perms));

      AppleHealthKit.initHealthKit(perms, (error: Object) => {
        if (error) {
          const errorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
          console.error('HealthKit permission request error:', errorMsg);
          resolve({
            isAvailable: true,
            permissionsGranted: false,
          });
          return;
        }

        console.log('[HealthService] initHealthKit succeeded, checking permissions...');

        // Check if permissions were granted
        checkPermissions().then((granted) => {
          console.log('[HealthService] checkPermissions result:', granted);
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
    console.log('[HealthService] initializeHealthKit called');
    console.log('[HealthService] Platform:', Platform.OS);
    console.log('[HealthService] AppleHealthKit available:', !!AppleHealthKit);

    if (Platform.OS !== 'ios') {
      console.log('[HealthService] Not iOS, returning unavailable');
      resolve({
        isAvailable: false,
        permissionsGranted: false,
      });
      return;
    }

    if (!AppleHealthKit) {
      console.log('[HealthService] AppleHealthKit module not loaded');
      resolve({
        isAvailable: false,
        permissionsGranted: false,
      });
      return;
    }

    AppleHealthKit.isAvailable((error: Object, available: boolean) => {
      console.log('[HealthService] isAvailable callback:', { error, available });
      if (error) {
        console.error('[HealthService] HealthKit availability check failed:', error);
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      if (!available) {
        console.warn('[HealthService] HealthKit is not available on this device');
        resolve({
          isAvailable: false,
          permissionsGranted: false,
        });
        return;
      }

      console.log('[HealthService] Requesting permissions...');
      const perms = getPermissions();
      console.log('[HealthService] Permission options:', JSON.stringify(perms));

      // Request permissions
      AppleHealthKit.initHealthKit(perms, (error: Object) => {
        if (error) {
          console.error('[HealthService] HealthKit initialization error:', error);
          resolve({
            isAvailable: true,
            permissionsGranted: false,
          });
          return;
        }

        console.log('[HealthService] initHealthKit succeeded!');
        // If initHealthKit succeeded, permissions were granted (or already existed)
        // We'll verify by attempting to read data
        checkPermissions().then((granted) => {
          console.log('[HealthService] Permissions check result:', granted);
          resolve({
            isAvailable: true,
            permissionsGranted: granted,
          });
        }).catch((err) => {
          console.error('[HealthService] Permissions check error:', err);
          // Assume granted if check fails but init succeeded
          resolve({
            isAvailable: true,
            permissionsGranted: true,
          });
        });
      });
    });
  });
};

/**
 * Check if HealthKit permissions are granted by attempting to read step count
 * react-native-health doesn't have a direct permission check, so we verify by reading data
 */
export const checkPermissions = (): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log('[HealthService] checkPermissions called');

    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      console.log('[HealthService] checkPermissions: not iOS or no AppleHealthKit');
      resolve(false);
      return;
    }

    // Try to read step count - if it works, we have permissions
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const options = {
      date: today.toISOString(),
      startDate: startOfDay.toISOString(),
      endDate: today.toISOString(),
    };

    console.log('[HealthService] checkPermissions: calling getStepCount with:', options);

    AppleHealthKit.getStepCount(options, (error: Object, results: any) => {
      console.log('[HealthService] getStepCount callback:', { error, results });

      if (error) {
        const errorStr = JSON.stringify(error);
        console.log('[HealthService] getStepCount error string:', errorStr);

        // Check if it's an authorization error specifically
        if (errorStr.includes('authorization') || errorStr.includes('denied') || errorStr.includes('Authorization')) {
          console.log('[HealthService] Authorization error detected');
          resolve(false);
        } else {
          // Other errors (like no data) mean we have permission
          console.log('[HealthService] Non-auth error, assuming permission granted');
          resolve(true);
        }
        return;
      }

      console.log('[HealthService] Permission check succeeded, steps:', results?.value);
      resolve(true);
    });
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
 * Get detailed sleep data for a specific date (includes bedtime and wake time)
 */
export const getDetailedSleepForDate = (date: Date): Promise<DetailedSleepData> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve({
        date,
        durationHours: 0,
        bedtime: null,
        wakeTime: null,
      });
      return;
    }

    // Get sleep from the previous night
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
        console.error('Error fetching detailed sleep:', error);
        resolve({
          date,
          durationHours: 0,
          bedtime: null,
          wakeTime: null,
        });
        return;
      }

      // Filter for actual sleep samples (not "in bed" samples)
      const sleepSamples = results.filter(
        (sample) => sample.value === AppleHealthKit?.Constants?.Sleep?.SLEEPING
      );

      if (sleepSamples.length === 0) {
        resolve({
          date,
          durationHours: 0,
          bedtime: null,
          wakeTime: null,
        });
        return;
      }

      // Calculate total sleep and find earliest bedtime / latest wake time
      let totalSleepSeconds = 0;
      let earliestBedtime: Date | null = null;
      let latestWakeTime: Date | null = null;

      sleepSamples.forEach((sample) => {
        const start = new Date(sample.startDate);
        const end = new Date(sample.endDate);
        totalSleepSeconds += (end.getTime() - start.getTime()) / 1000;

        if (!earliestBedtime || start < earliestBedtime) {
          earliestBedtime = start;
        }
        if (!latestWakeTime || end > latestWakeTime) {
          latestWakeTime = end;
        }
      });

      resolve({
        date,
        durationHours: totalSleepSeconds / 3600,
        bedtime: earliestBedtime,
        wakeTime: latestWakeTime,
      });
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
 * Get detailed sleep data for a date range (includes bedtime and wake time)
 */
export const getDetailedDailySleep = (
  startDate: Date,
  endDate: Date
): Promise<DetailedSleepData[]> => {
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
        console.error('Error fetching detailed daily sleep:', error);
        resolve([]);
        return;
      }

      // Group sleep by wake date (when sleep ended)
      const sleepByDate: Record<string, {
        totalSeconds: number;
        bedtime: Date | null;
        wakeTime: Date | null;
      }> = {};

      results.forEach((sample) => {
        if (sample.value === AppleHealthKit?.Constants?.Sleep?.SLEEPING) {
          const wakeDate = new Date(sample.endDate);
          const dateKey = wakeDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const start = new Date(sample.startDate);
          const end = new Date(sample.endDate);
          const seconds = (end.getTime() - start.getTime()) / 1000;

          if (!sleepByDate[dateKey]) {
            sleepByDate[dateKey] = {
              totalSeconds: 0,
              bedtime: null,
              wakeTime: null,
            };
          }

          sleepByDate[dateKey].totalSeconds += seconds;

          // Track earliest bedtime and latest wake time
          if (!sleepByDate[dateKey].bedtime || start < sleepByDate[dateKey].bedtime!) {
            sleepByDate[dateKey].bedtime = start;
          }
          if (!sleepByDate[dateKey].wakeTime || end > sleepByDate[dateKey].wakeTime!) {
            sleepByDate[dateKey].wakeTime = end;
          }
        }
      });

      const detailedSleep: DetailedSleepData[] = Object.entries(sleepByDate).map(
        ([dateKey, data]) => ({
          date: new Date(dateKey),
          durationHours: data.totalSeconds / 3600,
          bedtime: data.bedtime,
          wakeTime: data.wakeTime,
        })
      );

      resolve(detailedSleep);
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
 * Get heart rate for a specific date (average of all samples)
 */
export const getHeartRateForDate = (date: Date): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve(null);
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const options: any = {
      unit: 'bpm',
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
      ascending: false,
    };

    AppleHealthKit?.getHeartRateSamples(options, (error: Object, results: any[]) => {
      if (error) {
        console.error('Error fetching heart rate:', error);
        resolve(null);
        return;
      }

      if (!results || results.length === 0) {
        resolve(null);
        return;
      }

      // Calculate average heart rate for the day
      const sum = results.reduce((acc, sample) => acc + (sample.value || 0), 0);
      const average = Math.round(sum / results.length);
      resolve(average);
    });
  });
};

/**
 * Get daily heart rate for a date range
 */
export const getDailyHeartRate = (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; bpm: number }>> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve([]);
      return;
    }

    const options: any = {
      unit: 'bpm',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    AppleHealthKit?.getHeartRateSamples(options, (error: Object, results: any[]) => {
      if (error) {
        console.error('Error fetching daily heart rate:', error);
        resolve([]);
        return;
      }

      if (!results || results.length === 0) {
        resolve([]);
        return;
      }

      // Group by date and calculate daily averages
      const heartRateByDate: Record<string, { sum: number; count: number }> = {};

      results.forEach((sample) => {
        const sampleDate = new Date(sample.startDate || sample.endDate);
        const dateKey = sampleDate.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!heartRateByDate[dateKey]) {
          heartRateByDate[dateKey] = { sum: 0, count: 0 };
        }
        heartRateByDate[dateKey].sum += sample.value || 0;
        heartRateByDate[dateKey].count += 1;
      });

      const dailyHeartRate = Object.entries(heartRateByDate).map(([dateKey, data]) => ({
        date: new Date(dateKey),
        bpm: Math.round(data.sum / data.count),
      }));

      resolve(dailyHeartRate);
    });
  });
};

/**
 * Get daily active energy for a date range
 */
export const getDailyActiveEnergy = (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; calories: number }>> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      resolve([]);
      return;
    }

    const options: any = {
      unit: HealthUnit?.kilocalorie || 'kilocalorie',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    AppleHealthKit?.getActiveEnergyBurned(options, (error: Object, results: any[]) => {
      if (error) {
        console.error('Error fetching daily active energy:', error);
        resolve([]);
        return;
      }

      if (!results || results.length === 0) {
        resolve([]);
        return;
      }

      // Group by date and sum calories
      const energyByDate: Record<string, number> = {};

      results.forEach((sample) => {
        const sampleDate = new Date(sample.startDate || sample.endDate);
        const dateKey = sampleDate.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!energyByDate[dateKey]) {
          energyByDate[dateKey] = 0;
        }
        energyByDate[dateKey] += sample.value || 0;
      });

      const dailyEnergy = Object.entries(energyByDate).map(([dateKey, calories]) => ({
        date: new Date(dateKey),
        calories: Math.round(calories),
      }));

      resolve(dailyEnergy);
    });
  });
};

/**
 * Get today's health summary
 */
export const getTodayHealthData = async (): Promise<HealthData> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [steps, activeEnergy, sleepHours, heartRate] = await Promise.all([
    getStepsForDate(today),
    getActiveEnergyForDate(today),
    getSleepForDate(today), // Last night's sleep
    getHeartRateForDate(today),
  ]);

  return {
    steps,
    activeEnergy,
    sleepHours,
    heartRate,
    date: today,
  };
};

/**
 * Get weekly health data
 */
export const getWeeklyHealthData = async (): Promise<{
  steps: Array<{ date: Date; steps: number }>;
  sleep: Array<{ date: Date; hours: number }>;
  heartRate: Array<{ date: Date; bpm: number }>;
  activeEnergy: Array<{ date: Date; calories: number }>;
}> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [steps, sleep, heartRate, activeEnergy] = await Promise.all([
    getDailySteps(startDate, endDate),
    getDailySleep(startDate, endDate),
    getDailyHeartRate(startDate, endDate),
    getDailyActiveEnergy(startDate, endDate),
  ]);

  return { steps, sleep, heartRate, activeEnergy };
};





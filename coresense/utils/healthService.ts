/**
 * HealthKit Service
 * Handles HealthKit permissions and data fetching
 * Uses @kingstinct/react-native-healthkit which supports New Architecture
 */

import { Platform } from 'react-native';

// Import the new healthkit package
let HealthKit: any = null;
let isHealthKitAvailable = false;

console.log('[HealthService] Module loading, Platform:', Platform.OS);

try {
  if (Platform.OS === 'ios') {
    console.log('[HealthService] Attempting to require @kingstinct/react-native-healthkit...');
    const healthKitModule = require('@kingstinct/react-native-healthkit');
    HealthKit = healthKitModule.default || healthKitModule;

    console.log('[HealthService] HealthKit module keys:', Object.keys(HealthKit || {}));

    // Check if HealthKit is available
    if (typeof HealthKit?.isHealthDataAvailable === 'function') {
      isHealthKitAvailable = HealthKit.isHealthDataAvailable();
      console.log('[HealthService] HealthKit available:', isHealthKitAvailable);
    } else {
      console.warn('[HealthService] isHealthDataAvailable not found');
    }
  }
} catch (error: any) {
  console.warn('[HealthService] @kingstinct/react-native-healthkit not available:', error?.message || error);
}

// Type identifiers
const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate';
const SLEEP_ANALYSIS = 'HKCategoryTypeIdentifierSleepAnalysis';

// Sleep value enum from the package
enum CategoryValueSleepAnalysis {
  InBed = 0,
  AsleepUnspecified = 1,
  Awake = 2,
  AsleepCore = 3,
  AsleepDeep = 4,
  AsleepREM = 5,
}

export interface HealthData {
  steps: number;
  activeEnergy: number;
  sleepHours: number;
  heartRate: number | null;
  date: Date;
}

export interface DetailedSleepData {
  date: Date;
  durationHours: number;
  bedtime: Date | null;
  wakeTime: Date | null;
}

export interface HealthKitStatus {
  isAvailable: boolean;
  permissionsGranted: boolean;
}

/**
 * Helper to check if a sleep sample represents actual sleep time
 */
const isSleepingSample = (value: number): boolean => {
  // Accept InBed (0), AsleepUnspecified (1), AsleepCore (3), AsleepDeep (4), AsleepREM (5)
  // Reject Awake (2)
  return value !== CategoryValueSleepAnalysis.Awake;
};

/**
 * Request HealthKit permissions
 */
export const requestHealthKitPermissions = async (): Promise<HealthKitStatus> => {
  console.log('[HealthService] requestHealthKitPermissions called');

  if (Platform.OS !== 'ios' || !HealthKit) {
    return { isAvailable: false, permissionsGranted: false };
  }

  try {
    const available = HealthKit.isHealthDataAvailable();
    if (!available) {
      return { isAvailable: false, permissionsGranted: false };
    }

    // Request authorization
    const granted = await HealthKit.requestAuthorization({
      toRead: [STEP_COUNT, ACTIVE_ENERGY, HEART_RATE, SLEEP_ANALYSIS],
      toWrite: [],
    });

    console.log('[HealthService] Authorization result:', granted);
    return { isAvailable: true, permissionsGranted: granted };
  } catch (error) {
    console.error('[HealthService] Error requesting permissions:', error);
    return { isAvailable: true, permissionsGranted: false };
  }
};

/**
 * Initialize HealthKit and request permissions
 */
export const initializeHealthKit = async (): Promise<HealthKitStatus> => {
  console.log('[HealthService] initializeHealthKit called');
  console.log('[HealthService] Platform:', Platform.OS);
  console.log('[HealthService] HealthKit available:', !!HealthKit);

  if (Platform.OS !== 'ios') {
    console.log('[HealthService] Not iOS, returning unavailable');
    return { isAvailable: false, permissionsGranted: false };
  }

  if (!HealthKit) {
    console.log('[HealthService] HealthKit module not loaded');
    return { isAvailable: false, permissionsGranted: false };
  }

  return requestHealthKitPermissions();
};

/**
 * Check if HealthKit permissions are granted
 */
let _sleepPermissionGranted = false;

export const checkPermissions = async (): Promise<boolean> => {
  console.log('[HealthService] checkPermissions called');

  if (Platform.OS !== 'ios' || !HealthKit) {
    console.log('[HealthService] checkPermissions: not iOS or no HealthKit');
    return false;
  }

  try {
    // Try to query a small amount of data to verify permissions
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 1);

    const samples = await HealthKit.queryQuantitySamples(STEP_COUNT, {
      limit: 1,
      unit: 'count',
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    // Also check sleep
    try {
      await HealthKit.queryCategorySamples(SLEEP_ANALYSIS, {
        limit: 1,
        filter: {
          date: {
            startDate,
            endDate,
          },
        },
      });
      _sleepPermissionGranted = true;
    } catch {
      _sleepPermissionGranted = false;
    }

    console.log('[HealthService] Permission check succeeded');
    return true;
  } catch (error) {
    console.log('[HealthService] Permission check failed:', error);
    return false;
  }
};

/**
 * Check if sleep-specific permission is granted
 */
export const isSleepPermissionGranted = (): boolean => {
  return _sleepPermissionGranted;
};

/**
 * Get steps for a specific date
 */
export const getStepsForDate = async (date: Date): Promise<number> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return 0;
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const samples = await HealthKit.queryQuantitySamples(STEP_COUNT, {
      limit: 0, // 0 = no limit
      unit: 'count',
      filter: {
        date: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
      },
    });

    const total = samples.reduce((sum: number, sample: any) => sum + (sample.quantity || 0), 0);
    return total;
  } catch (error) {
    console.error('[HealthService] Error fetching steps:', error);
    return 0;
  }
};

/**
 * Get daily steps for a date range
 */
export const getDailySteps = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; steps: number }>> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    console.log('[HealthService] getDailySteps: Not iOS or no HealthKit');
    return [];
  }

  try {
    console.log(`[HealthService] getDailySteps: Fetching from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Use statistics collection for daily aggregation
    const results = await HealthKit.queryStatisticsCollectionForQuantity(
      STEP_COUNT,
      ['cumulativeSum'], // Changed from 'sum' to 'cumulativeSum'
      startDate,
      { day: 1 },
      {
        from: startDate,
        to: endDate,
        unit: 'count',
      }
    );

    console.log(`[HealthService] getDailySteps: Got ${results?.length || 0} day results`);

    const dailySteps = results.map((stat: any) => ({
      date: new Date(stat.startDate),
      steps: stat.sumQuantity || 0,
    }));

    return dailySteps;
  } catch (error) {
    console.error('[HealthService] getDailySteps error:', error);
    // Fallback to querying all samples and grouping by day
    return getDailyStepsFallback(startDate, endDate);
  }
};

/**
 * Fallback method for getting daily steps
 */
const getDailyStepsFallback = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; steps: number }>> => {
  try {
    const samples = await HealthKit.queryQuantitySamples(STEP_COUNT, {
      limit: 0,
      unit: 'count',
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    // Group by date
    const stepsByDate: Record<string, number> = {};
    samples.forEach((sample: any) => {
      const sampleDate = new Date(sample.startDate || sample.endDate);
      const dateKey = sampleDate.toISOString().split('T')[0];
      if (!stepsByDate[dateKey]) {
        stepsByDate[dateKey] = 0;
      }
      stepsByDate[dateKey] += sample.quantity || 0;
    });

    return Object.entries(stepsByDate).map(([dateKey, steps]) => ({
      date: new Date(dateKey),
      steps,
    }));
  } catch (error) {
    console.error('[HealthService] getDailyStepsFallback error:', error);
    return [];
  }
};

/**
 * Get sleep duration for a specific date (last night)
 */
export const getSleepForDate = async (date: Date): Promise<number> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return 0;
  }

  try {
    // Get sleep from the previous night
    const startOfSleep = new Date(date);
    startOfSleep.setDate(startOfSleep.getDate() - 1);
    startOfSleep.setHours(18, 0, 0, 0);

    const endOfSleep = new Date(date);
    endOfSleep.setHours(12, 0, 0, 0);

    console.log(`[HealthService] getSleepForDate: Querying from ${startOfSleep.toISOString()} to ${endOfSleep.toISOString()}`);

    const samples = await HealthKit.queryCategorySamples(SLEEP_ANALYSIS, {
      limit: 0, // 0 = no limit
      filter: {
        date: {
          startDate: startOfSleep,
          endDate: endOfSleep,
        },
      },
    });

    console.log(`[HealthService] getSleepForDate: Got ${samples?.length || 0} sleep samples`);

    let totalSleepSeconds = 0;
    let acceptedSamples = 0;
    let rejectedSamples = 0;

    samples.forEach((sample: any) => {
      const isValid = isSleepingSample(sample.value);
      if (isValid) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        totalSleepSeconds += (end - start) / 1000;
        acceptedSamples++;
      } else {
        rejectedSamples++;
      }
    });

    const hours = totalSleepSeconds / 3600;
    console.log(`[HealthService] getSleepForDate: Total sleep hours: ${hours.toFixed(2)} (accepted: ${acceptedSamples}, rejected: ${rejectedSamples})`);
    return hours;
  } catch (error) {
    console.error('[HealthService] Error fetching sleep:', error);
    return 0;
  }
};

/**
 * Get detailed sleep data for a specific date
 */
export const getDetailedSleepForDate = async (date: Date): Promise<DetailedSleepData> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return { date, durationHours: 0, bedtime: null, wakeTime: null };
  }

  try {
    const startOfSleep = new Date(date);
    startOfSleep.setDate(startOfSleep.getDate() - 1);
    startOfSleep.setHours(18, 0, 0, 0);

    const endOfSleep = new Date(date);
    endOfSleep.setHours(12, 0, 0, 0);

    const samples = await HealthKit.queryCategorySamples(SLEEP_ANALYSIS, {
      limit: 0,
      filter: {
        date: {
          startDate: startOfSleep,
          endDate: endOfSleep,
        },
      },
    });

    const sleepSamples = samples.filter((sample: any) => isSleepingSample(sample.value));

    if (sleepSamples.length === 0) {
      return { date, durationHours: 0, bedtime: null, wakeTime: null };
    }

    let totalSleepSeconds = 0;
    let earliestBedtime: Date | null = null;
    let latestWakeTime: Date | null = null;

    sleepSamples.forEach((sample: any) => {
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

    return {
      date,
      durationHours: totalSleepSeconds / 3600,
      bedtime: earliestBedtime,
      wakeTime: latestWakeTime,
    };
  } catch (error) {
    console.error('[HealthService] Error fetching detailed sleep:', error);
    return { date, durationHours: 0, bedtime: null, wakeTime: null };
  }
};

/**
 * Get sleep duration for a date range
 */
export const getDailySleep = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; hours: number }>> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    console.log('[HealthService] getDailySleep: Not iOS or no HealthKit');
    return [];
  }

  try {
    console.log(`[HealthService] getDailySleep: Fetching from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const samples = await HealthKit.queryCategorySamples(SLEEP_ANALYSIS, {
      limit: 0,
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    console.log(`[HealthService] getDailySleep: Got ${samples?.length || 0} samples`);

    // Group sleep by date
    const sleepByDate: Record<string, number> = {};

    samples.forEach((sample: any) => {
      if (isSleepingSample(sample.value)) {
        const sleepDate = new Date(sample.endDate);
        const dateKey = sleepDate.toISOString().split('T')[0];
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

    console.log('[HealthService] getDailySleep result:', dailySleep.map(d => ({ date: d.date.toISOString().split('T')[0], hours: d.hours.toFixed(2) })));

    return dailySleep;
  } catch (error) {
    console.error('[HealthService] getDailySleep error:', error);
    return [];
  }
};

/**
 * Get detailed sleep data for a date range
 */
export const getDetailedDailySleep = async (
  startDate: Date,
  endDate: Date
): Promise<DetailedSleepData[]> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return [];
  }

  try {
    const samples = await HealthKit.queryCategorySamples(SLEEP_ANALYSIS, {
      limit: 0,
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    const sleepByDate: Record<string, {
      totalSeconds: number;
      bedtime: Date | null;
      wakeTime: Date | null;
    }> = {};

    samples.forEach((sample: any) => {
      if (isSleepingSample(sample.value)) {
        const wakeDate = new Date(sample.endDate);
        const dateKey = wakeDate.toISOString().split('T')[0];
        const start = new Date(sample.startDate);
        const end = new Date(sample.endDate);
        const seconds = (end.getTime() - start.getTime()) / 1000;

        if (!sleepByDate[dateKey]) {
          sleepByDate[dateKey] = { totalSeconds: 0, bedtime: null, wakeTime: null };
        }

        sleepByDate[dateKey].totalSeconds += seconds;

        if (!sleepByDate[dateKey].bedtime || start < sleepByDate[dateKey].bedtime!) {
          sleepByDate[dateKey].bedtime = start;
        }
        if (!sleepByDate[dateKey].wakeTime || end > sleepByDate[dateKey].wakeTime!) {
          sleepByDate[dateKey].wakeTime = end;
        }
      }
    });

    return Object.entries(sleepByDate).map(([dateKey, data]) => ({
      date: new Date(dateKey),
      durationHours: data.totalSeconds / 3600,
      bedtime: data.bedtime,
      wakeTime: data.wakeTime,
    }));
  } catch (error) {
    console.error('[HealthService] Error fetching detailed daily sleep:', error);
    return [];
  }
};

/**
 * Get active energy burned for a date
 */
export const getActiveEnergyForDate = async (date: Date): Promise<number> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return 0;
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const samples = await HealthKit.queryQuantitySamples(ACTIVE_ENERGY, {
      limit: 0,
      unit: 'kcal',
      filter: {
        date: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
      },
    });

    const total = samples.reduce((sum: number, sample: any) => sum + (sample.quantity || 0), 0);
    return total;
  } catch (error) {
    console.error('[HealthService] Error fetching active energy:', error);
    return 0;
  }
};

/**
 * Get heart rate for a specific date (average)
 */
export const getHeartRateForDate = async (date: Date): Promise<number | null> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return null;
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const samples = await HealthKit.queryQuantitySamples(HEART_RATE, {
      limit: 0,
      unit: 'count/min',
      filter: {
        date: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
      },
    });

    if (!samples || samples.length === 0) {
      return null;
    }

    const sum = samples.reduce((acc: number, sample: any) => acc + (sample.quantity || 0), 0);
    return Math.round(sum / samples.length);
  } catch (error) {
    console.error('[HealthService] Error fetching heart rate:', error);
    return null;
  }
};

/**
 * Get daily heart rate for a date range
 */
export const getDailyHeartRate = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; bpm: number }>> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return [];
  }

  try {
    const samples = await HealthKit.queryQuantitySamples(HEART_RATE, {
      limit: 0,
      unit: 'count/min',
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    if (!samples || samples.length === 0) {
      return [];
    }

    // Group by date and calculate daily averages
    const heartRateByDate: Record<string, { sum: number; count: number }> = {};

    samples.forEach((sample: any) => {
      const sampleDate = new Date(sample.startDate || sample.endDate);
      const dateKey = sampleDate.toISOString().split('T')[0];

      if (!heartRateByDate[dateKey]) {
        heartRateByDate[dateKey] = { sum: 0, count: 0 };
      }
      heartRateByDate[dateKey].sum += sample.quantity || 0;
      heartRateByDate[dateKey].count += 1;
    });

    return Object.entries(heartRateByDate).map(([dateKey, data]) => ({
      date: new Date(dateKey),
      bpm: Math.round(data.sum / data.count),
    }));
  } catch (error) {
    console.error('[HealthService] Error fetching daily heart rate:', error);
    return [];
  }
};

/**
 * Get daily active energy for a date range
 */
export const getDailyActiveEnergy = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; calories: number }>> => {
  if (Platform.OS !== 'ios' || !HealthKit) {
    return [];
  }

  try {
    // Use fallback approach - query all samples and group by day
    const samples = await HealthKit.queryQuantitySamples(ACTIVE_ENERGY, {
      limit: 0,
      unit: 'kcal',
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
    });

    // Group by date
    const energyByDate: Record<string, number> = {};
    samples.forEach((sample: any) => {
      const sampleDate = new Date(sample.startDate || sample.endDate);
      const dateKey = sampleDate.toISOString().split('T')[0];
      if (!energyByDate[dateKey]) {
        energyByDate[dateKey] = 0;
      }
      energyByDate[dateKey] += sample.quantity || 0;
    });

    return Object.entries(energyByDate).map(([dateKey, calories]) => ({
      date: new Date(dateKey),
      calories: Math.round(calories),
    }));
  } catch (error) {
    console.error('[HealthService] Error fetching daily active energy:', error);
    return [];
  }
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
    getSleepForDate(today),
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

/**
 * Health Store (Zustand)
 * Manages health data state and syncing
 */

import { create } from 'zustand';
import {
  getDailySteps,
  getDailySleep,
  updateHealthSyncStatus,
  getHealthSyncStatus,
  type HealthMetric,
  type HealthSyncStatus,
} from '../utils/api';
import { coresenseApi } from '../utils/coresenseApi';
import {
  getTodayHealthData,
  getWeeklyHealthData,
  initializeHealthKit,
  checkPermissions,
  getDetailedSleepForDate,
  getDetailedDailySleep,
  type HealthData,
  type DetailedSleepData,
} from '../utils/healthService';
import { format, subDays, startOfDay } from 'date-fns';

interface DailyHealthData {
  date: Date;
  steps: number;
  sleepHours: number;
}

interface HealthState {
  // HealthKit status
  isAvailable: boolean;
  permissionsGranted: boolean;
  isInitializing: boolean;
  healthKitEnabled: boolean;

  // Today's data
  todayData: HealthData | null;

  // Weekly data
  weeklySteps: Array<{ date: Date; steps: number }>;
  weeklySleep: Array<{ date: Date; hours: number }>;
  weeklyHeartRate: Array<{ date: Date; bpm: number }>;
  weeklyActiveEnergy: Array<{ date: Date; calories: number }>;

  // Loading states
  isLoadingWeeklyData: boolean;

  // Sync status
  syncStatus: HealthSyncStatus | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;

  // Actions
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  setHealthKitEnabled: (enabled: boolean) => void;
  refreshTodayData: () => Promise<void>;
  refreshWeeklyData: () => Promise<void>;
  syncToSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  // Initial state
  isAvailable: false,
  permissionsGranted: false,
  isInitializing: false,
  healthKitEnabled: true,
  todayData: null,
  weeklySteps: [],
  weeklySleep: [],
  weeklyHeartRate: [],
  weeklyActiveEnergy: [],
  isLoadingWeeklyData: false,
  syncStatus: null,
  isSyncing: false,
  lastSyncedAt: null,

  /**
   * Set whether HealthKit integration is enabled by user preference
   */
  setHealthKitEnabled: (enabled: boolean) => {
    console.log('[HealthStore] HealthKit enabled set to:', enabled);
    set({ healthKitEnabled: enabled });
  },

  /**
   * Initialize HealthKit and check permissions
   */
  initialize: async () => {
    console.log('[HealthStore] initialize() called');
    console.log('[HealthStore] Current state:', {
      healthKitEnabled: get().healthKitEnabled,
      isInitializing: get().isInitializing,
      isAvailable: get().isAvailable,
      permissionsGranted: get().permissionsGranted,
    });

    // Check if user has disabled HealthKit via preferences
    if (!get().healthKitEnabled) {
      console.log('[HealthStore] HealthKit disabled by user preference, skipping initialization');
      return;
    }

    // Prevent multiple simultaneous initializations
    if (get().isInitializing) {
      console.log('[HealthStore] Already initializing, skipping...');
      return;
    }
    console.log('[HealthStore] Starting initialization...');
    set({ isInitializing: true });
    try {
      const status = await initializeHealthKit();
      console.log('[HealthStore] HealthKit status:', status);
      set({
        isAvailable: status.isAvailable,
        permissionsGranted: status.permissionsGranted,
        isInitializing: false,
      });

      if (status.isAvailable && status.permissionsGranted) {
        console.log('[HealthStore] Permissions granted, fetching data...');
        // Fetch today's and weekly data immediately
        await Promise.all([
          get().refreshTodayData(),
          get().refreshWeeklyData(),
        ]);
      } else {
        console.log('[HealthStore] HealthKit not available or permissions not granted');
      }
    } catch (error) {
      console.error('[HealthStore] HealthKit initialization error:', error);
      set({ isInitializing: false });
    }
  },

  /**
   * Request HealthKit permissions
   */
  requestPermissions: async () => {
    try {
      await get().initialize();
      const granted = get().permissionsGranted;
      return granted;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  },

  /**
   * Refresh today's health data from HealthKit
   */
  refreshTodayData: async () => {
    if (!get().permissionsGranted) {
      console.warn('[HealthStore] HealthKit permissions not granted for today data');
      return;
    }

    try {
      console.log('[HealthStore] Fetching today health data...');
      const todayData = await getTodayHealthData();
      console.log('[HealthStore] Today data received:', todayData);
      set({ todayData });
    } catch (error) {
      console.error('[HealthStore] Error fetching today health data:', error);
    }
  },

  /**
   * Refresh weekly health data from HealthKit
   */
  refreshWeeklyData: async () => {
    if (!get().permissionsGranted) {
      console.warn('[HealthStore] HealthKit permissions not granted for weekly data');
      return;
    }

    set({ isLoadingWeeklyData: true });

    try {
      console.log('[HealthStore] Fetching weekly health data...');
      const weeklyData = await getWeeklyHealthData();
      console.log('[HealthStore] Weekly data received:', {
        steps: weeklyData.steps.length,
        sleep: weeklyData.sleep.length,
        heartRate: weeklyData.heartRate.length,
        activeEnergy: weeklyData.activeEnergy.length,
      });
      set({
        weeklySteps: weeklyData.steps,
        weeklySleep: weeklyData.sleep,
        weeklyHeartRate: weeklyData.heartRate,
        weeklyActiveEnergy: weeklyData.activeEnergy,
        isLoadingWeeklyData: false,
      });
    } catch (error) {
      console.error('[HealthStore] Error fetching weekly health data:', error);
      set({ isLoadingWeeklyData: false });
    }
  },

  /**
   * Sync health data to Supabase
   */
  syncToSupabase: async (userId: string) => {
    console.log('[HealthStore] syncToSupabase() called for user:', userId);
    console.log('[HealthStore] Sync pre-check state:', {
      healthKitEnabled: get().healthKitEnabled,
      permissionsGranted: get().permissionsGranted,
      isAvailable: get().isAvailable,
      isSyncing: get().isSyncing,
    });

    if (!get().healthKitEnabled) {
      console.log('[HealthStore] HealthKit disabled by user preference, skipping sync');
      return;
    }
    if (!get().permissionsGranted) {
      console.warn('[HealthStore] Cannot sync: HealthKit permissions not granted');
      return;
    }

    set({ isSyncing: true });

    try {
      console.log('[HealthStore] Starting sync to Supabase...');

      // Update sync status to 'syncing'
      await updateHealthSyncStatus(userId, { sync_status: 'syncing' });

      // IMPORTANT: Always fetch fresh data from HealthKit (not cached)
      console.log('[HealthStore] Fetching fresh data from HealthKit...');

      // Get today's data
      const todayData = await getTodayHealthData();
      console.log('[HealthStore] Today data from HealthKit:', {
        steps: todayData.steps,
        sleepHours: todayData.sleepHours,
        activeEnergy: todayData.activeEnergy,
        heartRate: todayData.heartRate,
      });

      // Get weekly data for last 7 days
      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      console.log('[HealthStore] Fetching weekly data from', startDate.toISOString(), 'to', endDate.toISOString());
      const weeklyData = await getWeeklyHealthData();
      console.log('[HealthStore] Weekly data from HealthKit:', {
        stepsCount: weeklyData.steps.length,
        sleepCount: weeklyData.sleep.length,
        steps: weeklyData.steps.map(d => ({ date: format(d.date, 'yyyy-MM-dd'), steps: d.steps })),
        sleep: weeklyData.sleep.map(d => ({ date: format(d.date, 'yyyy-MM-dd'), hours: d.hours })),
      });

      // Prepare metrics for sync
      const metrics: Array<Omit<HealthMetric, 'id' | 'user_id'>> = [];

      // Add today's steps
      const today = startOfDay(new Date());
      metrics.push({
        metric_type: 'steps',
        value: todayData.steps,
        unit: 'count',
        recorded_at: today.toISOString(),
        source: 'healthkit',
      });

      // Add weekly steps (skip today as we already added it)
      weeklyData.steps.forEach((day) => {
        const dayDate = startOfDay(day.date);
        if (dayDate.getTime() !== today.getTime()) {
          metrics.push({
            metric_type: 'steps',
            value: day.steps,
            unit: 'count',
            recorded_at: dayDate.toISOString(),
            source: 'healthkit',
          });
        }
      });

      // Get detailed sleep data with bedtime and wake time
      const detailedSleep = await getDetailedDailySleep(startDate, endDate);
      console.log('[HealthStore] Detailed sleep data from HealthKit:', {
        count: detailedSleep.length,
        data: detailedSleep.map(d => ({
          date: format(d.date, 'yyyy-MM-dd'),
          hours: d.durationHours.toFixed(2),
          bedtime: d.bedtime?.toISOString(),
          wakeTime: d.wakeTime?.toISOString(),
        })),
      });

      // Add detailed sleep data (duration, bedtime, wake time)
      detailedSleep.forEach((sleepData) => {
        const dayDate = startOfDay(sleepData.date);

        // Sleep duration
        if (sleepData.durationHours > 0) {
          metrics.push({
            metric_type: 'sleep_duration',
            value: sleepData.durationHours,
            unit: 'hour',
            recorded_at: dayDate.toISOString(),
            source: 'healthkit',
          });
        }

        // Bedtime (stored as decimal hours, e.g., 22.5 = 10:30 PM)
        if (sleepData.bedtime) {
          const bedtimeHours =
            sleepData.bedtime.getHours() + sleepData.bedtime.getMinutes() / 60;
          metrics.push({
            metric_type: 'sleep_start',
            value: bedtimeHours,
            unit: 'hour',
            recorded_at: dayDate.toISOString(),
            source: 'healthkit',
          });
        }

        // Wake time (stored as decimal hours, e.g., 7.25 = 7:15 AM)
        if (sleepData.wakeTime) {
          const wakeTimeHours =
            sleepData.wakeTime.getHours() + sleepData.wakeTime.getMinutes() / 60;
          metrics.push({
            metric_type: 'sleep_end',
            value: wakeTimeHours,
            unit: 'hour',
            recorded_at: dayDate.toISOString(),
            source: 'healthkit',
          });
        }
      });

      // Also add today's detailed sleep if not already covered
      const todayDetailedSleep = await getDetailedSleepForDate(new Date());
      const yesterdayDate = startOfDay(subDays(today, 1));

      // Check if yesterday's sleep is already in detailedSleep
      const hasYesterdaySleep = detailedSleep.some(
        (s) => startOfDay(s.date).getTime() === yesterdayDate.getTime()
      );

      if (!hasYesterdaySleep && todayDetailedSleep.durationHours > 0) {
        metrics.push({
          metric_type: 'sleep_duration',
          value: todayDetailedSleep.durationHours,
          unit: 'hour',
          recorded_at: yesterdayDate.toISOString(),
          source: 'healthkit',
        });

        if (todayDetailedSleep.bedtime) {
          const bedtimeHours =
            todayDetailedSleep.bedtime.getHours() +
            todayDetailedSleep.bedtime.getMinutes() / 60;
          metrics.push({
            metric_type: 'sleep_start',
            value: bedtimeHours,
            unit: 'hour',
            recorded_at: yesterdayDate.toISOString(),
            source: 'healthkit',
          });
        }

        if (todayDetailedSleep.wakeTime) {
          const wakeTimeHours =
            todayDetailedSleep.wakeTime.getHours() +
            todayDetailedSleep.wakeTime.getMinutes() / 60;
          metrics.push({
            metric_type: 'sleep_end',
            value: wakeTimeHours,
            unit: 'hour',
            recorded_at: yesterdayDate.toISOString(),
            source: 'healthkit',
          });
        }
      }

      // De-dupe any rows that share the same metric_type + recorded_at
      const mergedMetrics = new Map<string, Omit<HealthMetric, 'id' | 'user_id'>>();
      metrics.forEach((metric) => {
        const key = `${metric.metric_type}:${metric.recorded_at}`;
        const existing = mergedMetrics.get(key);
        if (!existing) {
          mergedMetrics.set(key, metric);
          return;
        }
        if (metric.metric_type === 'steps') {
          // Sum steps
          mergedMetrics.set(key, {
            ...existing,
            value: existing.value + metric.value,
          });
          return;
        }
        if (metric.metric_type === 'sleep_duration') {
          // Take max sleep duration
          mergedMetrics.set(key, {
            ...existing,
            value: Math.max(existing.value, metric.value),
          });
          return;
        }
        if (metric.metric_type === 'sleep_start') {
          // Take earliest bedtime (min value)
          mergedMetrics.set(key, {
            ...existing,
            value: Math.min(existing.value, metric.value),
          });
          return;
        }
        if (metric.metric_type === 'sleep_end') {
          // Take latest wake time (max value)
          mergedMetrics.set(key, {
            ...existing,
            value: Math.max(existing.value, metric.value),
          });
          return;
        }
        mergedMetrics.set(key, metric);
      });

      // Filter out zero values, but allow 0 for time-based metrics (sleep_start/sleep_end)
      // where 0 represents midnight (00:00) which is a valid time
      const payload = Array.from(mergedMetrics.values()).filter(
        (metric) =>
          metric.value > 0 ||
          (metric.value === 0 &&
            (metric.metric_type === 'sleep_start' ||
              metric.metric_type === 'sleep_end'))
      );
      if (payload.length === 0) {
        console.warn('[HealthStore] No non-zero health metrics to sync');
        await updateHealthSyncStatus(userId, {
          sync_status: 'idle',
          last_synced_at: new Date().toISOString(),
        });
        set({ isSyncing: false });
        return;
      }

      // Log the final payload
      console.log('[HealthStore] Final payload to sync:', {
        count: payload.length,
        steps: payload.filter(m => m.metric_type === 'steps').map(m => ({ date: m.recorded_at, value: m.value })),
        sleep: payload.filter(m => m.metric_type === 'sleep_duration').map(m => ({ date: m.recorded_at, value: m.value })),
      });

      // Sync to backend (writes to Supabase server-side)
      const { error } = await coresenseApi.syncHealthData({ metrics: payload });

      if (error) {
        console.error('[HealthStore] Sync to backend failed:', error);
        throw error;
      }
      console.log('[HealthStore] Sync to backend successful!');

      // Update sync status
      const now = new Date();
      await updateHealthSyncStatus(userId, {
        sync_status: 'idle',
        last_synced_at: now.toISOString(),
        last_steps_sync: now.toISOString(),
        last_sleep_sync: now.toISOString(),
      });

      set({
        isSyncing: false,
        lastSyncedAt: now,
      });
    } catch (error) {
      console.error('Error syncing health data:', error);
      await updateHealthSyncStatus(userId, {
        sync_status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      set({ isSyncing: false });
    }
  },

  /**
   * Load health data from Supabase
   */
  loadFromSupabase: async (userId: string) => {
    try {
      // Load sync status
      const { data: syncStatus } = await getHealthSyncStatus(userId);
      if (syncStatus) {
        set({ syncStatus, lastSyncedAt: syncStatus.last_synced_at ? new Date(syncStatus.last_synced_at) : null });
      }

      // Load last 7 days of data
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      const [stepsData, sleepData] = await Promise.all([
        getDailySteps(userId, startDate, endDate),
        getDailySleep(userId, startDate, endDate),
      ]);

      if (stepsData.data) {
        const stepsByDate: Record<string, number> = {};
        stepsData.data.forEach((metric) => {
          const dateKey = format(new Date(metric.recorded_at), 'yyyy-MM-dd');
          stepsByDate[dateKey] = (stepsByDate[dateKey] || 0) + metric.value;
        });

        const weeklySteps = Object.entries(stepsByDate).map(([dateKey, steps]) => ({
          date: new Date(dateKey),
          steps,
        }));

        set({ weeklySteps });
      }

      if (sleepData.data) {
        const sleepByDate: Record<string, number> = {};
        sleepData.data.forEach((metric) => {
          const dateKey = format(new Date(metric.recorded_at), 'yyyy-MM-dd');
          sleepByDate[dateKey] = (sleepByDate[dateKey] || 0) + metric.value;
        });

        const weeklySleep = Object.entries(sleepByDate).map(([dateKey, hours]) => ({
          date: new Date(dateKey),
          hours,
        }));

        set({ weeklySleep });
      }

      // Set today's data from latest in Supabase
      const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const todaySteps = stepsData.data?.find(
        (m) => format(new Date(m.recorded_at), 'yyyy-MM-dd') === todayKey
      );
      const yesterdayKey = format(startOfDay(subDays(new Date(), 1)), 'yyyy-MM-dd');
      const lastNightSleep = sleepData.data?.find(
        (m) => format(new Date(m.recorded_at), 'yyyy-MM-dd') === yesterdayKey
      );

      if (todaySteps || lastNightSleep) {
        set({
          todayData: {
            steps: todaySteps?.value || 0,
            activeEnergy: 0, // Not loaded from Supabase for now
            sleepHours: lastNightSleep?.value || 0,
            heartRate: null, // Not loaded from Supabase for now
            date: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error loading health data from Supabase:', error);
    }
  },
}));





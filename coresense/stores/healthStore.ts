/**
 * Health Store (Zustand)
 * Manages health data state and syncing
 */

import { create } from 'zustand';
import {
  syncHealthMetrics,
  getDailySteps,
  getDailySleep,
  updateHealthSyncStatus,
  getHealthSyncStatus,
  type HealthMetric,
  type HealthSyncStatus,
} from '../utils/api';
import {
  getTodayHealthData,
  getWeeklyHealthData,
  initializeHealthKit,
  checkPermissions,
  type HealthData,
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

  // Today's data
  todayData: HealthData | null;

  // Weekly data
  weeklySteps: Array<{ date: Date; steps: number }>;
  weeklySleep: Array<{ date: Date; hours: number }>;

  // Sync status
  syncStatus: HealthSyncStatus | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;

  // Actions
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
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
  todayData: null,
  weeklySteps: [],
  weeklySleep: [],
  syncStatus: null,
  isSyncing: false,
  lastSyncedAt: null,

  /**
   * Initialize HealthKit and check permissions
   */
  initialize: async () => {
    set({ isInitializing: true });
    try {
      const status = await initializeHealthKit();
      set({
        isAvailable: status.isAvailable,
        permissionsGranted: status.permissionsGranted,
        isInitializing: false,
      });

      if (status.isAvailable && status.permissionsGranted) {
        // Fetch today's data immediately
        await get().refreshTodayData();
      }
    } catch (error) {
      console.error('HealthKit initialization error:', error);
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
      console.warn('HealthKit permissions not granted');
      return;
    }

    try {
      const todayData = await getTodayHealthData();
      set({ todayData });
    } catch (error) {
      console.error('Error fetching today health data:', error);
    }
  },

  /**
   * Refresh weekly health data from HealthKit
   */
  refreshWeeklyData: async () => {
    if (!get().permissionsGranted) {
      console.warn('HealthKit permissions not granted');
      return;
    }

    try {
      const weeklyData = await getWeeklyHealthData();
      set({
        weeklySteps: weeklyData.steps,
        weeklySleep: weeklyData.sleep,
      });
    } catch (error) {
      console.error('Error fetching weekly health data:', error);
    }
  },

  /**
   * Sync health data to Supabase
   */
  syncToSupabase: async (userId: string) => {
    if (!get().permissionsGranted) {
      console.warn('Cannot sync: HealthKit permissions not granted');
      return;
    }

    set({ isSyncing: true });

    try {
      // Update sync status to 'syncing'
      await updateHealthSyncStatus(userId, { sync_status: 'syncing' });

      // Get today's data
      const todayData = await getTodayHealthData();

      // Get weekly data for last 7 days
      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      const weeklyData = await getWeeklyHealthData();

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

      // Add sleep data
      if (todayData.sleepHours > 0) {
        // Last night's sleep is recorded for previous day
        const sleepDate = subDays(today, 1);
        metrics.push({
          metric_type: 'sleep_duration',
          value: todayData.sleepHours,
          unit: 'hour',
          recorded_at: startOfDay(sleepDate).toISOString(),
          source: 'healthkit',
        });
      }

      // Add weekly sleep
      weeklyData.sleep.forEach((day) => {
        const dayDate = startOfDay(day.date);
        if (dayDate.getTime() !== subDays(today, 1).getTime()) {
          metrics.push({
            metric_type: 'sleep_duration',
            value: day.hours,
            unit: 'hour',
            recorded_at: dayDate.toISOString(),
            source: 'healthkit',
          });
        }
      });

      // Sync to Supabase
      const { error } = await syncHealthMetrics(metrics, userId);

      if (error) {
        throw error;
      }

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
            date: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error loading health data from Supabase:', error);
    }
  },
}));





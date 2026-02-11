/**
 * Metrics Store - State management for personal analytics
 * Manages quick stats, metric logging, and latest metrics
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coresenseApi } from '../utils/coresenseApi';
import type {
  QuickStats,
  LatestMetrics,
  MetricInput,
} from '../types/metrics';

const CHECK_IN_DATE_KEY = '@coresense_last_check_in_date';

// Helper to get today's date as YYYY-MM-DD string
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

interface MetricsState {
  // State
  quickStats: QuickStats | null;
  latestMetrics: LatestMetrics;
  loading: boolean;
  error: string | null;
  lastCheckInDate: string | null; // YYYY-MM-DD format

  // Computed
  hasCheckedInToday: () => boolean;

  // Actions
  fetchQuickStats: () => Promise<void>;
  fetchLatestMetrics: () => Promise<void>;
  logMetric: (metric: MetricInput) => Promise<boolean>;
  logBatchMetrics: (metrics: MetricInput[]) => Promise<boolean>;
  clearError: () => void;
  loadLastCheckInDate: () => Promise<void>;
  recordCheckIn: () => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  // Initial state
  quickStats: null,
  latestMetrics: {},
  loading: false,
  error: null,
  lastCheckInDate: null,

  // Check if user has already checked in today
  hasCheckedInToday: () => {
    const { lastCheckInDate } = get();
    if (!lastCheckInDate) return false;
    return lastCheckInDate === getTodayDateString();
  },

  // Load last check-in date from storage
  loadLastCheckInDate: async () => {
    try {
      const storedDate = await AsyncStorage.getItem(CHECK_IN_DATE_KEY);
      if (storedDate) {
        set({ lastCheckInDate: storedDate });
      }
    } catch (err) {
      console.warn('[metricsStore] Failed to load last check-in date:', err);
    }
  },

  // Record that user checked in today
  recordCheckIn: async () => {
    const today = getTodayDateString();
    try {
      await AsyncStorage.setItem(CHECK_IN_DATE_KEY, today);
      set({ lastCheckInDate: today });
    } catch (err) {
      console.warn('[metricsStore] Failed to save check-in date:', err);
    }
  },

  // Fetch aggregated quick stats for dashboard
  fetchQuickStats: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await coresenseApi.getQuickStats();

      if (error) {
        console.warn('[metricsStore] Failed to fetch quick stats:', error);
        set({ error, loading: false });
        return;
      }

      if (data) {
        set({ quickStats: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      console.error('[metricsStore] Error fetching quick stats:', err);
      set({ error: err.message || 'Failed to fetch quick stats', loading: false });
    }
  },

  // Fetch latest value for each metric type
  fetchLatestMetrics: async () => {
    try {
      const { data, error } = await coresenseApi.getLatestMetrics();

      if (error) {
        console.warn('[metricsStore] Failed to fetch latest metrics:', error);
        return;
      }

      if (data) {
        set({ latestMetrics: data });
      }
    } catch (err: any) {
      console.error('[metricsStore] Error fetching latest metrics:', err);
    }
  },

  // Log a single metric
  logMetric: async (metric: MetricInput) => {
    try {
      const { data, error } = await coresenseApi.logMetric(metric);

      if (error) {
        console.error('[metricsStore] Failed to log metric:', error);
        set({ error });
        return false;
      }

      if (data?.success) {
        // Refresh stats after logging
        const { fetchQuickStats, fetchLatestMetrics } = get();
        await Promise.all([fetchQuickStats(), fetchLatestMetrics()]);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[metricsStore] Error logging metric:', err);
      set({ error: err.message || 'Failed to log metric' });
      return false;
    }
  },

  // Log multiple metrics at once (used for daily check-in)
  logBatchMetrics: async (metrics: MetricInput[]) => {
    if (!metrics.length) return false;

    try {
      const { data, error } = await coresenseApi.logBatchMetrics(metrics);

      if (error) {
        console.error('[metricsStore] Failed to batch log metrics:', error);
        set({ error });
        return false;
      }

      if (data?.success) {
        // Record the check-in for today
        const { recordCheckIn, fetchQuickStats, fetchLatestMetrics } = get();
        await recordCheckIn();

        // Refresh stats after logging
        await Promise.all([fetchQuickStats(), fetchLatestMetrics()]);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[metricsStore] Error batch logging metrics:', err);
      set({ error: err.message || 'Failed to log metrics' });
      return false;
    }
  },

  // Clear error state
  clearError: () => {
    set({ error: null });
  },
}));

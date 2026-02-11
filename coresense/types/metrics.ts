/**
 * Types for Personal Analytics / Metrics System
 */

export enum MetricType {
  ENERGY = 'energy',
  MOOD = 'mood',
  SLEEP = 'sleep',
  STRESS = 'stress',
  FOCUS = 'focus',
}

export interface MetricLog {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  notes?: string;
  logged_at: string;
  context?: MetricContext;
  created_at: string;
}

export interface MetricContext {
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  after_activity?: string;
  [key: string]: any;
}

export interface MetricInput {
  metric_type: MetricType;
  value: number;
  notes?: string;
  context?: MetricContext;
}

export type MoodLabel = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';
export type TrendDirection = 'up' | 'down' | 'stable';
export type MoodConsistency = 'stable' | 'volatile';

export interface EnergyStats {
  current: number | null;
  avg_this_week: number | null;
  avg_last_week: number | null;
  best_time: string | null;
  trend: TrendDirection;
}

export interface SleepStats {
  last_night: number | null;
  avg_this_week: number | null;
  consistency_score: number | null;
  trend: TrendDirection;
}

export interface MoodStats {
  dominant: MoodLabel | null;
  consistency: MoodConsistency;
}

export interface StreakStats {
  current: number;
  completion_rate_this_week: number;
}

export interface QuickStats {
  energy: EnergyStats;
  sleep: SleepStats;
  mood: MoodStats;
  streak: StreakStats;
}

export interface LatestMetrics {
  [key: string]: {
    value: number;
    logged_at: string;
    context?: MetricContext;
  };
}

// Response types from API
export interface LogMetricResponse {
  success: boolean;
  metric?: MetricLog;
}

export interface BatchLogResponse {
  success: boolean;
  metrics: MetricLog[];
  count: number;
}

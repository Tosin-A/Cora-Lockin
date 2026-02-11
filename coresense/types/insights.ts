/**
 * Insights Types
 * Type definitions for commitment-pattern-focused insights with AI coach interpretation.
 */

export enum InsightType {
  BEHAVIORAL = 'behavioral',  // Blue - behavioral patterns
  PROGRESS = 'progress',      // Green - progress indicators
  RISK = 'risk'               // Amber - areas needing attention
}

export enum PatternType {
  TIME_OF_DAY = 'time_of_day',       // When user is most productive
  DAY_OF_WEEK = 'day_of_week',       // Best days for completing commitments
  STREAK = 'streak',                 // Streak patterns and comparisons
  COMPLETION_RATE = 'completion_rate' // Trending completion rate
}

export interface PatternEvidence {
  type: PatternType | string;    // Pattern type (may come as string from API)
  labels: string[];              // X-axis labels for chart (e.g., ['Mon', 'Tue', ...])
  values: number[];              // Y-axis values for chart
  highlight_index?: number | null; // Index of the bar to highlight
  trend_direction: 'up' | 'down' | 'stable' | string;
  trend_value?: string | null;   // e.g., "+15%" or "3 days"
}

export interface InsightData {
  id: string;
  type: InsightType;
  title: string;
  coach_commentary: string;      // Main AI coach interpretation (largest text)
  evidence: PatternEvidence;
  action_text?: string;          // Optional action button text
  action_steps?: string[];       // Optional action steps from coach
  is_new: boolean;               // Show "NEW" badge
  created_at?: string;
}

export interface InsightsScreenData {
  coach_summary: string | null;  // Overall coach summary at top of screen
  patterns: InsightData[];       // Max 5 active insights
  has_enough_data: boolean;      // Whether user has enough data for insights
  days_until_enough_data?: number; // Days until enough data if not enough
}

// Insight interaction types for tracking engagement
export type InteractionType = 'helpful' | 'not_helpful' | 'dismissed' | 'viewed';

// Color mapping for insight types (unified purple-based system)
export const InsightTypeColors: Record<InsightType, string> = {
  [InsightType.BEHAVIORAL]: '#8B5CF6',  // Primary purple
  [InsightType.PROGRESS]: '#A78BFA',    // Light purple
  [InsightType.RISK]: '#7C3AED',        // Deep purple
};

// Icon mapping for pattern types
export const PatternTypeIcons: Record<PatternType, string> = {
  [PatternType.TIME_OF_DAY]: 'time-outline',
  [PatternType.DAY_OF_WEEK]: 'calendar-outline',
  [PatternType.STREAK]: 'flame-outline',
  [PatternType.COMPLETION_RATE]: 'trending-up-outline',
};

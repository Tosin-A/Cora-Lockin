/**
 * CoreSense Type Definitions
 */

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

// Legacy alias for backward compatibility
export type UserProfile = User;

export interface UserPreferences {
  id: string;
  user_id: string;
  messaging_frequency: number;
  messaging_style: 'firm' | 'balanced' | 'supportive';
  response_length: 'short' | 'medium' | 'long';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_days: number[];
  accountability_level: number;
  goals: string[];
  healthkit_enabled: boolean;
  healthkit_sync_frequency: string;
  // Notification preferences
  push_notifications?: boolean;
  task_reminders?: boolean;
  weekly_reports?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'skipped';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Interaction {
  id: string;
  user_id: string;
  direction: 'incoming' | 'outgoing';
  message_text: string;
  message_type: 'text' | 'task_reminder' | 'check_in';
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface WeeklySummary {
  messages_exchanged: number;
  tasks_completed: number;
  consistency_score: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface Insights {
  weekly_summary: WeeklySummary;
  sleep_insights: {
    average_hours: number;
    consistency_percentage: number;
    trend: 'up' | 'down' | 'neutral';
    trend_value: number;
  };
  habit_consistency: {
    overall_score: number;
    by_habit: Array<{
      habit_id: string;
      name: string;
      consistency: number;
    }>;
  };
  mood_trends: {
    data_points: Array<{
      date: string;
      value: number;
    }>;
  };
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'preference' | 'profile';
  data: any;
  timestamp: number;
  retries: number;
}

export type TimeRange = 'week' | 'month' | 'all';

export type AuthMethod = 'apple' | 'google' | 'email';








export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_by: 'user' | 'coach';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  due_time?: string;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  coach_reasoning?: string;
  linked_insight_id?: string;
  completed_at?: string;
  is_recurring?: boolean;
  frequency?: 'daily' | 'weekly';
  streak_count?: number;
  longest_streak?: number;
  icon?: string;
  completed_today?: boolean;
  weekly_completed?: number;
  weekly_target?: number;
  sort_order?: number;
  streak_milestone?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  due_time?: string;
  reminder_enabled?: boolean;
  reminder_minutes_before?: number;
  is_recurring?: boolean;
  frequency?: 'daily' | 'weekly';
  icon?: string;
  weekly_target?: number;
}

export interface CreateCoachTodoInput extends CreateTodoInput {
  coach_reasoning?: string;
  linked_insight_id?: string;
}

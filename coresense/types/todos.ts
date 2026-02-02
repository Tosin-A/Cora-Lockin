export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_by: 'user' | 'coach';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  due_time: string | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  coach_reasoning: string | null;
  linked_insight_id: string | null;
  completed_at: string | null;
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
}

export interface CreateCoachTodoInput extends CreateTodoInput {
  coach_reasoning?: string;
  linked_insight_id?: string;
}

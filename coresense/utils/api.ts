/** npx expo run:ios
 * API Functions
 * API calls to Supabase backend
 */

import { supabase } from "./supabase";
import type {
  UserProfile,
  UserPreferences,
  Task,
  CreateTaskInput,
} from "../types";

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
            full_name: data.user.user_metadata?.full_name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            created_at: data.user.created_at,
          }
        : null,
      error: null,
    };
  } catch (error: any) {
    return { user: null, error };
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string
) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    return {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
            full_name: data.user.user_metadata?.full_name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            created_at: data.user.created_at,
          }
        : null,
      error: null,
    };
  } catch (error: any) {
    return { user: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) throw error;
    return { user: null, error: null }; // OAuth redirects, user will be set after redirect
  } catch (error: any) {
    return { user: null, error };
  }
};

export const signUpWithGoogle = async () => {
  // Same as signInWithGoogle for OAuth
  return signInWithGoogle();
};

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export const getUserProfile = async (
  userId: string
): Promise<{ data: UserProfile | null; error: any }> => {
  console.log("[api.ts] 🔄 getUserProfile called for userId:", userId);
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    console.log("[api.ts] 📡 Supabase getProfile response:", { data, error });
    return { data, error };
  } catch (error: any) {
    console.log("[api.ts] 💥 Exception in getUserProfile:", error);
    return { data: null, error };
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: any }> => {
  console.log("[api.ts] 🔄 updateUserProfile called:", { userId, updates });
  try {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    console.log("[api.ts] 📡 Supabase update response:", { data, error });
    return { data, error };
  } catch (error: any) {
    console.log("[api.ts] 💥 Exception in updateUserProfile:", error);
    return { data: null, error };
  }
};

// ============================================================================
// PREFERENCES FUNCTIONS
// ============================================================================

export const getUserPreferences = async (
  userId: string
): Promise<{ data: UserPreferences | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    // If no preferences exist, return default preferences
    if (!data) {
      const defaultPreferences: Omit<UserPreferences, "id"> = {
        user_id: userId,
        messaging_frequency: 3,
        messaging_style: "balanced",
        response_length: "medium",
        quiet_hours_enabled: false,
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
        quiet_hours_days: [1, 2, 3, 4, 5, 6, 7],
        accountability_level: 5,
        goals: [],
        healthkit_enabled: false,
        healthkit_sync_frequency: "daily",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create default preferences for the user
      const { data: newPreferences, error: createError } = await supabase
        .from("user_preferences")
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        return { data: null, error: createError };
      }

      return { data: newPreferences, error: null };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const updatePreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ data: UserPreferences | null; error: any }> => {
  try {
    // Remove 'id' from preferences if present to let Supabase generate it
    const { id, ...preferencesWithoutId } = preferences;

    // First try to update existing record
    const { data: updatedData, error: updateError } = await supabase
      .from("user_preferences")
      .update({
        ...preferencesWithoutId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    // If update failed (no existing record), try to insert
    if (updateError || !updatedData) {
      const { data: insertedData, error: insertError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
          ...preferencesWithoutId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data: insertedData, error: insertError };
    }

    return { data: updatedData, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

// ============================================================================
// TASK FUNCTIONS
// ============================================================================

export const fetchTasks = async (
  userId: string,
  filters?: {
    status?: "pending" | "completed" | "skipped";
    dueDate?: Date;
    limit?: number;
  }
): Promise<{ data: Task[] | null; error: any }> => {
  try {
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.dueDate) {
      query = query.eq("due_date", filters.dueDate.toISOString().split("T")[0]);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const createTask = async (
  userId: string,
  task: CreateTaskInput
): Promise<{ data: Task | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        ...task,
      })
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Task>
): Promise<{ data: Task | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const completeTask = async (
  taskId: string
): Promise<{ data: Task | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const deleteTask = async (taskId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    return { error };
  } catch (error: any) {
    return { error };
  }
};

// ============================================================================
// HEALTH API FUNCTIONS
// ============================================================================

export interface HealthMetric {
  id?: string;
  user_id: string;
  metric_type:
    | "steps"
    | "sleep_duration"
    | "sleep_start"
    | "sleep_end"
    | "active_energy"
    | "heart_rate"
    | "distance";
  value: number;
  unit: string;
  recorded_at: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface HealthSyncStatus {
  user_id: string;
  last_synced_at?: string;
  last_steps_sync?: string;
  last_sleep_sync?: string;
  sync_status?: "idle" | "syncing" | "error";
  error_message?: string;
}

/**
 * Sync health metrics to Supabase
 */
export const syncHealthMetrics = async (
  metrics: Array<Omit<HealthMetric, "id" | "user_id">>,
  userId: string
): Promise<{ data: HealthMetric[] | null; error: any }> => {
  try {
    const metricsWithUserId = metrics.map((metric) => ({
      ...metric,
      user_id: userId,
      source: metric.source || "healthkit",
    }));

    const { data, error } = await supabase
      .from("health_metrics")
      .upsert(metricsWithUserId, {
        onConflict: "user_id,metric_type,recorded_at",
      })
      .select();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Get health metrics for a date range
 */
export const getHealthMetrics = async (
  userId: string,
  metricType: HealthMetric["metric_type"],
  startDate: Date,
  endDate: Date
): Promise<{ data: HealthMetric[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("metric_type", metricType)
      .gte("recorded_at", startDate.toISOString())
      .lte("recorded_at", endDate.toISOString())
      .order("recorded_at", { ascending: true });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Get daily steps for a date range
 */
export const getDailySteps = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: HealthMetric[] | null; error: any }> => {
  return getHealthMetrics(userId, "steps", startDate, endDate);
};

/**
 * Get daily sleep for a date range
 */
export const getDailySleep = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: HealthMetric[] | null; error: any }> => {
  return getHealthMetrics(userId, "sleep_duration", startDate, endDate);
};

/**
 * Update health sync status
 */
export const updateHealthSyncStatus = async (
  userId: string,
  status: Partial<HealthSyncStatus>
): Promise<{ data: HealthSyncStatus | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("health_sync_status")
      .upsert(
        {
          user_id: userId,
          ...status,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Get health sync status
 */
export const getHealthSyncStatus = async (
  userId: string
): Promise<{ data: HealthSyncStatus | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("health_sync_status")
      .select("*")
      .eq("user_id", userId)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "coach";
  timestamp: string;
  user_id?: string;
}

export const sendChatMessage = async (
  message: string
): Promise<{ data: { response: string } | null; error: any }> => {
  try {
    // This would typically call your backend API
    // For now, return a mock response
    return {
      data: {
        response:
          "Thanks for your message! I'm here to help you with your wellness journey. What would you like to focus on today?",
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
};

export const getChatHistory = async (): Promise<{
  data: ChatMessage[] | null;
  error: any;
}> => {
  try {
    // This would typically fetch from a chat_messages table
    // For now, return empty array (no chat history yet)
    return { data: [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

// ============================================================================
// PROFILE AND PREFERENCES API COMPATIBILITY
// ============================================================================

// Compatibility functions for coresenseApi interface
export const getProfile = async (): Promise<{
  data: UserProfile | null;
  error: any;
}> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: "No authenticated user" };

    return getUserProfile(user.user.id);
  } catch (error: any) {
    return { data: null, error };
  }
};

export const updateProfile = async (
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error: any }> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { success: false, error: "No authenticated user" };

    const { error } = await updateUserProfile(user.user.id, updates);
    return { success: !error, error };
  } catch (error: any) {
    return { success: false, error };
  }
};

export const getPreferences = async (): Promise<{
  data: UserPreferences | null;
  error: any;
}> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: "No authenticated user" };

    return getUserPreferences(user.user.id);
  } catch (error: any) {
    return { data: null, error };
  }
};

export const updatePreferencesApi = async (
  updates: Partial<UserPreferences>
): Promise<{ success: boolean; error: any }> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { success: false, error: "No authenticated user" };

    const { error } = await updatePreferences(user.user.id, updates);
    return { success: !error, error };
  } catch (error: any) {
    return { success: false, error };
  }
};

/**
 * Goals Store - State management for wellness goals
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WellnessGoal {
  id: string;
  goal_type:
    | "steps"
    | "sleep"
    | "water"
    | "mood"
    | "stress"
    | "nutrition"
    | "activity";
  target_value: number;
  current_value: number;
  unit: string;
  period: "daily" | "weekly" | "monthly";
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "paused" | "cancelled";
  progress_percentage?: number;
  created_at: string;
}

interface GoalsState {
  // State
  goals: WellnessGoal[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchGoals: (status?: string) => Promise<void>;
  createGoal: (
    goalData: Omit<
      WellnessGoal,
      "id" | "created_at" | "current_value" | "progress_percentage"
    >,
  ) => Promise<boolean>;
  updateGoal: (
    goalId: string,
    updates: Partial<WellnessGoal>,
  ) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  getGoalSuggestions: () => Promise<any[]>;
  clearError: () => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      // Initial state
      goals: [],
      loading: false,
      error: null,

      // Actions
      fetchGoals: async (status = "active") => {
        set({ loading: true, error: null });

        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Not authenticated");
          }

          const API_URL =
            process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
          const response = await fetch(
            `${API_URL}/api/v1/wellness/goals?status=${status}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch goals: ${response.status}`);
          }

          const data = await response.json();

          set({
            goals: data.goals || [],
            loading: false,
          });
        } catch (error: any) {
          console.error("Failed to fetch goals:", error);
          set({
            error: error.message || "Failed to load goals",
            loading: false,
          });
        }
      },

      createGoal: async (goalData) => {
        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Not authenticated");
          }

          const API_URL =
            process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
          const response = await fetch(`${API_URL}/api/v1/wellness/goals`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(goalData),
          });

          if (!response.ok) {
            throw new Error(`Failed to create goal: ${response.status}`);
          }

          const data = await response.json();

          // Refresh goals list
          await get().fetchGoals();

          return data.success || false;
        } catch (error: any) {
          console.error("Failed to create goal:", error);
          set({ error: error.message || "Failed to create goal" });
          return false;
        }
      },

      updateGoal: async (goalId, updates) => {
        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Not authenticated");
          }

          const API_URL =
            process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
          const response = await fetch(
            `${API_URL}/api/v1/wellness/goals/${goalId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updates),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to update goal: ${response.status}`);
          }

          // Refresh goals list
          await get().fetchGoals();

          return true;
        } catch (error: any) {
          console.error("Failed to update goal:", error);
          set({ error: error.message || "Failed to update goal" });
          return false;
        }
      },

      deleteGoal: async (goalId) => {
        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Not authenticated");
          }

          const API_URL =
            process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
          const response = await fetch(
            `${API_URL}/api/v1/wellness/goals/${goalId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete goal: ${response.status}`);
          }

          // Refresh goals list
          await get().fetchGoals();

          return true;
        } catch (error: any) {
          console.error("Failed to delete goal:", error);
          set({ error: error.message || "Failed to delete goal" });
          return false;
        }
      },

      getGoalSuggestions: async () => {
        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Not authenticated");
          }

          const API_URL =
            process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
          const response = await fetch(
            `${API_URL}/api/v1/wellness/goals/suggestions`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to get suggestions: ${response.status}`);
          }

          const data = await response.json();
          return data.suggestions || [];
        } catch (error: any) {
          console.error("Failed to get suggestions:", error);
          return [];
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "goals-store",
      partialize: (state) => ({
        goals: state.goals,
      }),
    },
  ),
);

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  const { supabase } = await import("../utils/supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

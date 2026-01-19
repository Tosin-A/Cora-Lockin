/**
 * Wellness Store - State management for wellness scores and insights
 */

import { create } from "zustand";
import { coresenseApi } from "../utils/coresenseApi";

export interface WellnessScore {
  overall: number;
  sleep: number;
  activity: number;
  nutrition: number;
  mental: number;
  hydration: number;
  trend: "improving" | "stable" | "declining";
  date?: string;
}

interface WellnessState {
  // State
  wellnessScore: WellnessScore | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchWellnessScore: (date?: string) => Promise<void>;
  clearError: () => void;
}

export const useWellnessStore = create<WellnessState>((set, get) => ({
  // Initial state
  wellnessScore: null,
  loading: false,
  error: null,

  // Actions
  fetchWellnessScore: async (date?: string) => {
    set({ loading: true, error: null });

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
      const url = date
        ? `${API_URL}/api/v1/wellness/score?target_date=${date}`
        : `${API_URL}/api/v1/wellness/score`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wellness score: ${response.status}`);
      }

      const data = await response.json();

      set({
        wellnessScore: {
          overall: data.overall_score,
          sleep: data.sleep_score,
          activity: data.activity_score,
          nutrition: data.nutrition_score,
          mental: data.mental_wellbeing_score,
          hydration: data.hydration_score,
          trend: data.trend,
          date: data.date,
        },
        loading: false,
      });
    } catch (error: any) {
      console.error("Failed to fetch wellness score:", error);
      set({
        error: error.message || "Failed to load wellness score",
        loading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  const { supabase } = await import("../utils/supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

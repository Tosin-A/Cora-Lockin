/**
 * CoreSense API Client
 * Connects to the backend API for real-time data.
 * NO mock data - all data comes from authenticated user's database records.
 */

import { supabase } from "./supabase";
import { Platform } from "react-native";
import type { User } from "../types";

/**
 * Get the API base URL based on environment and platform.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (for production/staging)
 * 2. Platform-specific defaults for local development:
 *    - iOS Simulator: localhost (shares host network)
 *    - Android Emulator: 10.0.2.2 (special alias for host)
 *    - Physical device: requires EXPO_PUBLIC_API_URL to be set
 */
function getApiUrl(): string {
  // Use environment variable if set
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl;
  }

  // Development fallbacks by platform
  if (__DEV__) {
    if (Platform.OS === "android") {
      // Android emulator uses 10.0.2.2 to reach host machine
      return "http://10.0.2.2:8000";
    }
    // iOS simulator shares host network, use localhost
    return "http://localhost:8000";
  }

  // Production should always have EXPO_PUBLIC_API_URL set
  console.warn("[coresenseApi] No API URL configured for production!");
  return "http://localhost:8000";
}

const API_URL = getApiUrl();

// Log the API URL on startup for debugging
console.log(`[coresenseApi] 🌐 Using API URL: ${API_URL} (Platform: ${Platform.OS}, DEV: ${__DEV__})`);

// Types for API responses
export interface HomeData {
  lastCoachMessage: {
    id: string;
    text: string;
    timestamp: string;
    read: boolean;
  } | null;
  todayInsight: {
    id: string;
    title: string;
    body: string;
    category: string;
    actionable: boolean;
  } | null;
  streak: number;
  completedToday: number;
  sleepHours: number | null;
}

export interface Pattern {
  id: string;
  title: string;
  category: string;
  interpretation: string;
  expandedContent?: string;
  trend: "up" | "down" | "stable";
  trendValue?: string;
  dataPoints: number[];
}

export interface InsightsData {
  weeklySummary: {
    summary: string;
    focusAreas: string[];
    trend: string;
  } | null;
  patterns: Pattern[];
  actionable: {
    id: string;
    title: string;
    body: string;
    actionText?: string;
  } | null;
  savedCount: number;
}

export interface DailyPrompt {
  id: string;
  question: string;
  response: string | null;
  answeredAt: string | null;
}

export interface SuggestedAction {
  id: string;
  title: string;
  subtitle?: string;
  duration?: string;
  category: "focus" | "wellness" | "habit" | "reflection" | "movement";
  priority: "high" | "medium" | "low";
  completed: boolean;
  completedAt?: string;
}

export interface Commitment {
  id: string;
  text: string;
  dueDate?: string;
  priority: string;
  createdAt: string;
}

export type UserProfile = User;

export interface UserPreferences {
  messagingStyle: "soft" | "balanced" | "firm";
  messagingFrequency: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  accountabilityLevel: number;
  goals: string[];
  healthkitEnabled: boolean;
}

export interface Streak {
  current: number;
  longest: number;
  lastActivity: string | null;
}

export interface Streaks {
  check_in?: Streak;
  commitment?: Streak;
  engagement?: Streak;
  health_sync?: Streak;
}

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  console.log("[coresenseApi] 🔐 Getting auth session...");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || null;
  console.log(
    "[coresenseApi] 🔑 Auth token status:",
    token ? "present" : "missing",
  );
  return token;
}

/**
 * Categorize network errors for better debugging and user feedback.
 */
function categorizeNetworkError(error: any, _endpoint: string): {
  message: string;
  category: "network" | "timeout" | "auth" | "server" | "unknown";
  isRetryable: boolean;
} {
  const errorMessage = error?.message?.toLowerCase() || "";

  // Timeout errors
  if (error?.name === "AbortError" || errorMessage.includes("timeout")) {
    return {
      message: "Request timed out - server may be slow or unreachable",
      category: "timeout",
      isRetryable: true,
    };
  }

  // Network connectivity errors (fetch fails before getting response)
  if (
    errorMessage.includes("network request failed") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network error") ||
    errorMessage.includes("connection refused") ||
    errorMessage.includes("econnrefused")
  ) {
    return {
      message: `Cannot reach server at ${API_URL}. Is the backend running?`,
      category: "network",
      isRetryable: true,
    };
  }

  // DNS resolution errors
  if (
    errorMessage.includes("getaddrinfo") ||
    errorMessage.includes("dns") ||
    errorMessage.includes("hostname")
  ) {
    return {
      message: "Cannot resolve server hostname - check your network connection",
      category: "network",
      isRetryable: true,
    };
  }

  // Default
  return {
    message: error?.message || "Request failed",
    category: "unknown",
    isRetryable: false,
  };
}

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    timeout?: number;
  } = {},
): Promise<{
  data: T | null;
  error: string | null;
  errorCategory?: "network" | "timeout" | "auth" | "server" | "unknown";
  isRetryable?: boolean;
}> {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log(
    `[coresenseApi] 📤 [${requestId}] ${options.method || "GET"} ${endpoint}`,
  );

  try {
    const token = await getAuthToken();

    if (!token) {
      console.log(`[coresenseApi] ❌ [${requestId}] No auth token available`);
      return { data: null, error: "Not authenticated", errorCategory: "auth" };
    }

    const timeoutMs = options.timeout || 10000; // Default 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fullUrl = `${API_URL}${endpoint}`;
      console.log(`[coresenseApi] 🌐 [${requestId}] Full URL: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      console.log(
        `[coresenseApi] 📥 [${requestId}] Response: ${response.status} (${duration}ms)`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.detail || `Request failed: ${response.status}`;
        console.log(
          `[coresenseApi] ⚠️ [${requestId}] Server error: ${errorMessage}`,
        );
        return {
          data: null,
          error: errorMessage,
          errorCategory: "server",
          isRetryable: response.status >= 500,
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const { message, category, isRetryable } = categorizeNetworkError(
        fetchError,
        endpoint,
      );

      console.error(
        `[coresenseApi] 💥 [${requestId}] Fetch error after ${duration}ms:`,
        {
          message: fetchError.message,
          name: fetchError.name,
          category,
          apiUrl: API_URL,
        },
      );

      return { data: null, error: message, errorCategory: category, isRetryable };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const { message, category, isRetryable } = categorizeNetworkError(
      error,
      endpoint,
    );

    console.error(
      `[coresenseApi] 💥 [${requestId}] Exception after ${duration}ms:`,
      {
        message: error.message,
        category,
        apiUrl: API_URL,
      },
    );

    return { data: null, error: message, errorCategory: category, isRetryable };
  }
}

// ============================================================================
// HOME SCREEN API
// ============================================================================

/**
 * Get all data needed for the home screen.
 * Returns real user data only - no mock values.
 */
export async function getHomeData(): Promise<{
  data: HomeData | null;
  error: string | null;
}> {
  return apiRequest<HomeData>("/api/v1/home/data");
}

// ============================================================================
// INSIGHTS API
// ============================================================================

/**
 * Get insights for the insights screen.
 * Returns patterns and summaries generated from real user data.
 */
export async function getInsights(): Promise<{
  data: InsightsData | null;
  error: string | null;
}> {
  return apiRequest<InsightsData>("/api/v1/insights");
}

/**
 * Save an insight to favorites.
 */
export async function saveInsight(
  insightId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/insights/${insightId}/save`,
    { method: "POST" },
  );
  return { success: data?.success || false, error };
}

/**
 * Dismiss an insight.
 */
export async function dismissInsight(
  insightId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/insights/${insightId}/dismiss`,
    { method: "POST" },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// ENGAGEMENT API
// ============================================================================

/**
 * Get today's engagement prompt.
 */
export async function getDailyPrompt(): Promise<{
  data: DailyPrompt | null;
  error: string | null;
}> {
  return apiRequest<DailyPrompt>("/api/v1/engagement/prompt");
}

/**
 * Answer the daily prompt.
 */
export async function answerPrompt(
  promptId: string,
  response: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    "/api/v1/engagement/prompt/answer",
    {
      method: "POST",
      body: { prompt_id: promptId, response },
    },
  );
  return { success: data?.success || false, error };
}

/**
 * Get AI-suggested actions.
 */
export async function getSuggestedActions(): Promise<{
  data: SuggestedAction[] | null;
  error: string | null;
}> {
  return apiRequest<SuggestedAction[]>("/api/v1/engagement/actions");
}

/**
 * Complete an action.
 */
export async function completeAction(
  actionId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/engagement/actions/${actionId}/complete`,
    { method: "POST" },
  );
  return { success: data?.success || false, error };
}

/**
 * Record "I Did It" completion.
 */
export async function recordDidIt(): Promise<{
  success: boolean;
  newTotal: number;
  streak: number;
  error: string | null;
}> {
  const { data, error } = await apiRequest<{
    success: boolean;
    newTotal: number;
    streak: number;
  }>("/api/v1/engagement/did-it", { method: "POST" });
  return {
    success: data?.success || false,
    newTotal: data?.newTotal || 0,
    streak: data?.streak || 0,
    error,
  };
}

// ============================================================================
// COMMITMENTS API
// ============================================================================

/**
 * Get active commitments.
 */
export async function getCommitments(): Promise<{
  data: Commitment[] | null;
  error: string | null;
}> {
  return apiRequest<Commitment[]>("/api/v1/commitments");
}

/**
 * Check in on a commitment.
 */
export async function checkInCommitment(
  commitmentId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/commitments/${commitmentId}/check-in`,
    { method: "POST" },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// COACH API
// ============================================================================

/**
 * Get the last message from the coach.
 */
export async function getLastCoachMessage(): Promise<{
  data: { id: string; text: string; timestamp: string; read: boolean } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/coach/last-message");
}

/**
 * Get recent coach messages.
 */
export async function getCoachMessages(
  limit: number = 20,
  offset: number = 0,
): Promise<{
  data: Array<{
    id: string;
    text: string;
    direction: string;
    timestamp: string;
    read: boolean;
  }> | null;
  error: string | null;
}> {
  return apiRequest(`/api/v1/coach/messages?limit=${limit}&offset=${offset}`);
}

/**
 * Send a chat message to the coach using Custom GPT endpoint.
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  context?: any,
  clientTempId?: string,
): Promise<{
  data: {
    messages: string[];
    personality_score: number;
    context_used: string[];
    variation_applied: boolean;
    response_type: string;
    thread_id?: string;
    run_id?: string; // OpenAI run ID for delta tracking (Phase 4)
    function_calls: any[];
    usage_stats?: any;
    saved_ids?: {
      user_message?: string;
      coach_message_0?: string;
      assistant_temp_ids?: string[]; // Temp IDs for assistant messages (Phase 4)
    };
    client_temp_id?: string;
  } | null;
  error: string | null;
}> {
  const requestBody: any = {
    message,
    user_id: userId,
    context: context || {},
    response_type: "coaching",
  };

  // Include client_temp_id if provided (for reconciliation)
  if (clientTempId) {
    requestBody.client_temp_id = clientTempId;
  }

  return apiRequest("/api/v1/coach/custom-gpt/chat", {
    method: "POST",
    body: requestBody,
  });
}

/**
 * Get chat history.
 */
export async function getChatHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<{
  data: {
    messages: Array<{
      id: string;
      text: string;
      content: string; // Alternative field name from backend
      direction: string;
      sender_type: string; // "user" or "gpt"
      timestamp: string;
      created_at: string; // Backend field name
      read: boolean;
      chat_id: string; // Link to conversation
      run_id?: string; // OpenAI run ID (Phase 4)
      assistant_temp_id?: string; // Temp ID for assistant messages (Phase 4)
    }>;
    has_more: boolean;
  } | null;
  error: string | null;
}> {
  return apiRequest(
    `/api/v1/coach/history/${userId}?limit=${limit}&offset=${offset}`,
  );
}

// ============================================================================
// PROFILE API
// ============================================================================

/**
 * Get user profile.
 */
export async function getProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  return apiRequest<UserProfile>("/api/v1/profile");
}

/**
 * Update user profile.
 */
export async function updateProfile(updates: {
  full_name?: string;
  username?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; error: string | null }> {
  console.log("[coresenseApi] 🔄 updateProfile called with updates:", updates);

  try {
    const token = await getAuthToken();
    console.log(
      "[coresenseApi] 🔑 Auth token obtained:",
      token ? "present" : "missing",
    );

    if (!token) {
      console.log("[coresenseApi] ❌ No auth token available");
      return { success: false, error: "Not authenticated" };
    }

    console.log("[coresenseApi] 🌐 Making API request to /api/v1/profile...");
    const response = await fetch(`${API_URL}/api/v1/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    console.log("[coresenseApi] 📡 API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log("[coresenseApi] ❌ API request failed:", errorData);
      return {
        success: false,
        error: errorData.detail || `Request failed: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log("[coresenseApi] ✅ API request successful:", data);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("[coresenseApi] 💥 Exception during API request:", error);
    return { success: false, error: error.message || "Request failed" };
  }
}

/**
 * Get user preferences.
 */
export async function getPreferences(): Promise<{
  data: UserPreferences | null;
  error: string | null;
}> {
  return apiRequest<UserPreferences>("/api/v1/preferences");
}

/**
 * Update user preferences.
 */
export async function updatePreferences(
  updates: Partial<{
    messaging_style: string;
    messaging_frequency: number;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
  }>,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    "/api/v1/preferences",
    { method: "PUT", body: updates },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// HEALTH API
// ============================================================================

/**
 * Get health data summary.
 */
export async function getHealthSummary(): Promise<{
  data: {
    weeklySteps: Array<{ date: string; value: number }>;
    weeklySleep: Array<{ date: string; value: number }>;
    averages: { steps: number; sleep: number };
  } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/health/summary");
}

// ============================================================================
// WELLNESS API
// ============================================================================

/**
 * Get wellness score.
 */
export async function getWellnessScore(date?: string): Promise<{
  data: {
    overall_score: number;
    sleep_score: number;
    activity_score: number;
    nutrition_score: number;
    mental_wellbeing_score: number;
    hydration_score: number;
    trend: string;
    date: string;
  } | null;
  error: string | null;
}> {
  const endpoint = date
    ? `/api/v1/wellness/score?target_date=${date}`
    : "/api/v1/wellness/score";
  return apiRequest(endpoint);
}

/**
 * Log manual health data.
 */
export async function logManualHealthData(logData: {
  log_type: string;
  value?: number;
  text_value?: string;
  unit?: string;
  notes?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    "/api/v1/wellness/logs",
    { method: "POST", body: logData },
  );
  return { success: data?.success || false, error };
}

/**
 * Get wellness goals.
 */
export async function getWellnessGoals(status?: string): Promise<{
  data: any[] | null;
  error: string | null;
}> {
  const endpoint = status
    ? `/api/v1/wellness/goals?status=${status}`
    : "/api/v1/wellness/goals";
  return apiRequest(endpoint);
}

/**
 * Create wellness goal.
 */
export async function createWellnessGoal(goalData: {
  goal_type: string;
  target_value: number;
  unit?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    "/api/v1/wellness/goals",
    { method: "POST", body: goalData },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// STREAKS API (Simplified Schema)
// ============================================================================

/**
 * Get user's current streak (simplified schema).
 */
export async function getStreak(): Promise<{
  data: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    userTimezone: string;
  } | null;
  error: string | null;
}> {
  return apiRequest<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    userTimezone: string;
  }>("/api/v1/streak");
}

/**
 * Record a streak activity.
 * @param timezone - User's timezone (e.g., 'Europe/London')
 */
export async function recordStreak(timezone: string = "UTC"): Promise<{
  data: {
    success: boolean;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    userTimezone: string;
  } | null;
  error: string | null;
}> {
  return apiRequest<{
    success: boolean;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    userTimezone: string;
  }>("/api/v1/streak/record", {
    method: "POST",
    body: { timezone },
  });
}

/**
 * Get all user streaks (legacy multi-type endpoint).
 * @deprecated Use getStreak() for the simplified schema
 */
export async function getStreaksLegacy(): Promise<{
  data: {
    check_in?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    commitment?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    engagement?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    health_sync?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
  } | null;
  error: string | null;
}> {
  return apiRequest<{
    check_in?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    commitment?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    engagement?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
    health_sync?: {
      current: number;
      longest: number;
      lastActivity: string;
      userTimezone: string;
    };
  }>("/api/v1/streaks");
}

/**
 * Get message usage statistics
 */
export async function getMessageUsage(userId: string): Promise<{
  data: {
    messages_used: number;
    messages_limit: number;
    is_pro: boolean;
    messages_remaining: number;
    usage_percentage: number;
  } | null;
  error: string | null;
}> {
  return apiRequest(`/api/v1/coach/usage/${userId}`);
}

/**
 * Upgrade to pro plan (for testing)
 */
export async function upgradeToPro(
  userId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/coach/upgrade/${userId}`,
    { method: "POST" },
  );
  return { success: data?.success || false, error };
}

// Export all functions
export const coresenseApi = {
  // Home
  getHomeData,

  // Insights
  getInsights,
  saveInsight,
  dismissInsight,

  // Engagement
  getDailyPrompt,
  answerPrompt,
  getSuggestedActions,
  completeAction,
  recordDidIt,

  // Commitments
  getCommitments,
  checkInCommitment,

  // Coach
  getLastCoachMessage,
  getCoachMessages,
  sendChatMessage,
  getChatHistory,

  // Profile
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,

  // Health
  getHealthSummary,

  // Wellness
  getWellnessScore,
  logManualHealthData,
  getWellnessGoals,
  createWellnessGoal,

  // Streaks
  getStreak,
  recordStreak,
  getStreaksLegacy,

  // Message Limits
  getMessageUsage,
  upgradeToPro,
};

export default coresenseApi;

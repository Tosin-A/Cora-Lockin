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

// Server warmup tracking - Railway server sleeps after inactivity and needs
// 15-30s to cold-start. This coordinates retry logic so all concurrent requests
// wait behind a single warmup check instead of retrying independently.
let _serverConfirmedAlive = false;
let _warmupPromise: Promise<boolean> | null = null;

async function warmupServer(): Promise<boolean> {
  if (_serverConfirmedAlive) return true;
  if (_warmupPromise) return _warmupPromise;

  _warmupPromise = (async () => {
    try {
      console.log('[coresenseApi] 🔄 Server may be cold-starting, waiting for warmup...');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 25000);
      await fetch(`${API_URL}/api/v1/health`, { signal: controller.signal });
      clearTimeout(tid);
      // Any response (even errors) means the server process is running
      _serverConfirmedAlive = true;
      console.log('[coresenseApi] ✅ Server is awake');
      return true;
    } catch {
      console.log('[coresenseApi] ⚠️ Server warmup failed');
      return false;
    } finally {
      _warmupPromise = null;
    }
  })();

  return _warmupPromise;
}

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
  engagement?: Streak;
  health_sync?: Streak;
}

// Helper to get auth token
// Auth token cache - avoids hitting Supabase on every API call
let _cachedToken: string | null = null;
let _cachedTokenExpiresAt: number = 0;
const TOKEN_CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (tokens last 1 hour, refresh well before)

async function getAuthToken(): Promise<string | null> {
  // Return cached token if still valid
  const now = Date.now();
  if (_cachedToken && now < _cachedTokenExpiresAt) {
    return _cachedToken;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.log("[coresenseApi] Error getting session:", error.message);
      _cachedToken = null;
      return null;
    }

    if (!session) {
      _cachedToken = null;
      return null;
    }

    const token = session.access_token;

    // Check if token is expired
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      if (expiresAt < new Date()) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          _cachedToken = null;
          return null;
        }
        _cachedToken = refreshData.session.access_token;
        _cachedTokenExpiresAt = now + TOKEN_CACHE_TTL_MS;
        return _cachedToken;
      }
    }

    _cachedToken = token || null;
    _cachedTokenExpiresAt = now + TOKEN_CACHE_TTL_MS;
    return _cachedToken;
  } catch (err: any) {
    console.log("[coresenseApi] Exception getting auth token:", err.message);
    _cachedToken = null;
    return null;
  }
}

// Clear token cache on auth state change (called from authStore)
export function clearAuthTokenCache() {
  _cachedToken = null;
  _cachedTokenExpiresAt = 0;
  _serverConfirmedAlive = false;
}

// Request deduplication - prevents duplicate simultaneous requests
const _inflightRequests = new Map<string, Promise<any>>();

function getDedupeKey(endpoint: string, method: string, body?: any): string {
  return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
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

// Helper for API requests with deduplication for GET requests
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
  const method = options.method || "GET";

  // Deduplicate GET requests - if the same request is already in-flight, reuse it
  if (method === "GET") {
    const dedupeKey = getDedupeKey(endpoint, method);
    const inflight = _inflightRequests.get(dedupeKey);
    if (inflight) {
      return inflight;
    }
    const promise = _apiRequestInner<T>(endpoint, options);
    _inflightRequests.set(dedupeKey, promise);
    promise.finally(() => _inflightRequests.delete(dedupeKey));
    return promise;
  }

  return _apiRequestInner<T>(endpoint, options);
}

async function _apiRequestInner<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    timeout?: number;
  } = {},
  retryCount: number = 0,
): Promise<{
  data: T | null;
  error: string | null;
  errorCategory?: "network" | "timeout" | "auth" | "server" | "unknown";
  isRetryable?: boolean;
}> {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const token = await getAuthToken();

    if (!token || token.trim() === '') {
      console.log(`[coresenseApi] ❌ [${requestId}] No auth token available (token: ${token === null ? 'null' : token === undefined ? 'undefined' : 'empty string'})`);
      return { data: null, error: "Not authenticated", errorCategory: "auth" };
    }

    console.log(`[coresenseApi] 🔑 [${requestId}] Token present`);

    const timeoutMs = options.timeout || 10000; // Default 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fullUrl = `${API_URL}${endpoint}`;
      console.log(`[coresenseApi] 🌐 [${requestId}] Full URL: ${fullUrl}`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Always add Authorization header if we have a token
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log(`[coresenseApi] 🔐 [${requestId}] Authorization header set`);
      }

      const response = await fetch(fullUrl, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      _serverConfirmedAlive = true;
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

      // Auto-retry on timeout (server may be cold-starting on Railway).
      // Retries GET requests and idempotent POST endpoints (e.g. health/sync uses upsert).
      // Wait for the shared warmup check so all concurrent requests coordinate
      // behind a single health-check ping instead of retrying independently.
      const reqMethod = options.method || "GET";
      const isIdempotentPost = reqMethod === 'POST' && endpoint.includes('/health/sync');
      if (category === 'timeout' && retryCount < 1 && (reqMethod === 'GET' || isIdempotentPost)) {
        const isWarm = await warmupServer();
        if (isWarm) {
          console.log(`[coresenseApi] 🔄 [${requestId}] Retrying after server warmup...`);
          return _apiRequestInner<T>(endpoint, options, retryCount + 1);
        }
      }

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
  errorCategory?: "network" | "timeout" | "auth" | "server" | "unknown";
  isRetryable?: boolean;
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
    `/api/v1/coach/history?limit=${limit}&offset=${offset}`,
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
    daily_used: number;
    daily_limit: number;
    daily_remaining: number;
    weekly_used: number;
    weekly_limit: number;
    weekly_remaining: number;
    limit_type: string | null;
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

/**
 * Record user reaction (helpful/not helpful) to an insight.
 */
export async function recordInsightReaction(
  insightId: string,
  helpful: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/insights/${insightId}/reaction`,
    { method: "POST", body: { helpful } },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// HEALTH DATA SYNC
// ============================================================================

export interface HealthSyncPayload {
  metrics: Array<{
    metric_type: string;
    value: number;
    unit: string;
    recorded_at: string;
    source?: string;
    metadata?: Record<string, any>;
  }>;
}

export async function syncHealthData(
  payload: HealthSyncPayload,
): Promise<{ data: { success: boolean; inserted: number } | null; error: string | null }> {
  return apiRequest("/api/v1/health/sync", { method: "POST", body: payload, timeout: 30000 });
}

export interface HealthInsightsData {
  coach_summary: string | null;
  patterns: Array<{
    id: string;
    type: string;
    title: string;
    coach_commentary: string;
    evidence: {
      type: string;
      labels: string[];
      values: number[];
      highlight_index: number | null;
      trend_direction: string;
      trend_value: string | null;
    };
    action_text: string | null;
    is_new: boolean;
    action_steps: string[];
  }>;
  has_enough_data: boolean;
  days_until_enough_data?: number;
}

export async function getHealthInsights(): Promise<{
  data: HealthInsightsData | null;
  error: string | null;
}> {
  return apiRequest<HealthInsightsData>("/api/v1/insights/health-patterns");
}

// ============================================================================
// METRICS API (Personal Analytics)
// ============================================================================

import type {
  QuickStats,
  LatestMetrics,
  MetricInput,
  LogMetricResponse,
  BatchLogResponse,
} from '../types/metrics';

export async function getQuickStats(): Promise<{
  data: QuickStats | null;
  error: string | null;
}> {
  return apiRequest<QuickStats>('/api/v1/metrics/quick-stats');
}

export async function getLatestMetrics(): Promise<{
  data: LatestMetrics | null;
  error: string | null;
}> {
  return apiRequest<LatestMetrics>('/api/v1/metrics/latest');
}

export async function logMetric(metric: MetricInput): Promise<{
  data: LogMetricResponse | null;
  error: string | null;
}> {
  return apiRequest<LogMetricResponse>('/api/v1/metrics/log', {
    method: 'POST',
    body: metric,
  });
}

export async function logBatchMetrics(metrics: MetricInput[]): Promise<{
  data: BatchLogResponse | null;
  error: string | null;
}> {
  return apiRequest<BatchLogResponse>('/api/v1/metrics/batch', {
    method: 'POST',
    body: { metrics },
  });
}

// ============================================================================
// TODOS API (Shared To-Do List)
// ============================================================================

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

export async function getTodos(): Promise<{
  data: Todo[] | null;
  error: string | null;
}> {
  return apiRequest<Todo[]>('/api/v1/todos');
}

export async function createTodo(input: CreateTodoInput): Promise<{
  data: Todo | null;
  error: string | null;
}> {
  return apiRequest<Todo>('/api/v1/todos', {
    method: 'POST',
    body: input,
  });
}

export async function createCoachTodo(input: CreateCoachTodoInput): Promise<{
  data: Todo | null;
  error: string | null;
}> {
  return apiRequest<Todo>('/api/v1/todos/coach', {
    method: 'POST',
    body: input,
  });
}

export async function updateTodoStatus(
  todoId: string,
  status: Todo['status'],
): Promise<{ data: Todo | null; error: string | null }> {
  return apiRequest<Todo>(`/api/v1/todos/${todoId}/status`, {
    method: 'PUT',
    body: { status },
  });
}

export async function updateTodo(
  todoId: string,
  updates: Partial<CreateTodoInput>,
): Promise<{ data: Todo | null; error: string | null }> {
  return apiRequest<Todo>(`/api/v1/todos/${todoId}`, {
    method: 'PUT',
    body: updates,
  });
}

export async function deleteTodo(todoId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const { data, error } = await apiRequest<{ success: boolean; message: string }>(
    `/api/v1/todos/${todoId}`,
    { method: 'DELETE' },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export async function registerDeviceToken(
  pushToken: string,
  platform: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    "/api/v1/notifications/register-device",
    {
      method: "POST",
      body: { push_token: pushToken, platform },
    },
  );
  return { success: data?.success || false, error };
}

export async function unregisterDeviceToken(
  token: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/notifications/devices/token?token=${encodeURIComponent(token)}`,
    { method: 'DELETE' },
  );
  return { success: data?.success || false, error };
}

export interface NotificationPreferences {
  notifications_enabled: boolean;
  task_reminders_enabled: boolean;
  coach_nudges_enabled: boolean;
  insights_enabled: boolean;
  streak_reminders_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_daily_notifications: number;
}

export async function getNotificationPreferences(): Promise<{
  data: NotificationPreferences | null;
  error: string | null;
}> {
  const result = await apiRequest<{ preferences: NotificationPreferences }>(
    '/api/v1/notifications/preferences',
  );
  return {
    data: result.data?.preferences || null,
    error: result.error,
  };
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    '/api/v1/notifications/preferences',
    {
      method: 'PUT',
      body: preferences,
    },
  );
  return { success: data?.success || false, error };
}

export async function sendTestNotification(): Promise<{
  success: boolean;
  error: string | null;
}> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    '/api/v1/notifications/coach-checkin',
    {
      method: 'POST',
      body: {
        message: "Hey! This is a test notification from CoreSense. 🎉",
        priority: "normal",
      },
    },
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// SUBSCRIPTION API (Stripe)
// ============================================================================

export interface SubscriptionStatus {
  is_pro: boolean;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export async function createCheckoutSession(): Promise<{
  data: { url: string; session_id: string } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/subscription/create-checkout", { method: "POST" });
}

export async function getSubscriptionStatus(): Promise<{
  data: SubscriptionStatus | null;
  error: string | null;
}> {
  return apiRequest<SubscriptionStatus>("/api/v1/subscription/status");
}

export async function createPortalSession(): Promise<{
  data: { url: string } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/subscription/portal", { method: "POST" });
}

export async function cancelSubscription(): Promise<{
  data: { status: string; cancel_at_period_end: boolean; current_period_end: string | null } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/subscription/cancel", { method: "POST" });
}

// Account
export async function deleteAccount(): Promise<{
  data: { success: boolean } | null;
  error: string | null;
}> {
  return apiRequest("/api/v1/account", { method: "DELETE" });
}

// Export all functions
export const coresenseApi = {
  // Home
  getHomeData,

  // Insights
  getInsights,
  saveInsight,
  dismissInsight,
  getHealthInsights,
  recordInsightReaction,

  // Engagement
  getDailyPrompt,
  answerPrompt,
  getSuggestedActions,
  completeAction,
  recordDidIt,

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
  syncHealthData,

  // Wellness
  getWellnessScore,
  logManualHealthData,
  getWellnessGoals,
  createWellnessGoal,

  // Streaks
  getStreak,
  recordStreak,
  getStreaksLegacy,

  // Metrics (Personal Analytics)
  getQuickStats,
  getLatestMetrics,
  logMetric,
  logBatchMetrics,

  // Message Limits
  getMessageUsage,
  upgradeToPro,

  // Todos (Shared To-Do List)
  getTodos,
  createTodo,
  createCoachTodo,
  updateTodoStatus,
  updateTodo,
  deleteTodo,

  // Notifications
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendTestNotification,

  // Subscription
  createCheckoutSession,
  getSubscriptionStatus,
  createPortalSession,
  cancelSubscription,

  // Account
  deleteAccount,

  // Auth
  clearAuthTokenCache,
};

export default coresenseApi;

/**
 * CoreSense API Client
 * Connects to the backend API for real-time data.
 * NO mock data - all data comes from authenticated user's database records.
 */

import { supabase } from './supabase';
import type { User } from '../types';

// Get API URL from environment
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

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
  trend: 'up' | 'down' | 'stable';
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
  category: 'focus' | 'wellness' | 'habit' | 'reflection' | 'movement';
  priority: 'high' | 'medium' | 'low';
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
  messagingStyle: 'soft' | 'balanced' | 'firm';
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
  console.log('[coresenseApi] 🔐 Getting auth session...');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || null;
  console.log('[coresenseApi] 🔑 Auth token status:', token ? 'present' : 'missing');
  return token;
}

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
  } = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        data: null, 
        error: errorData.detail || `Request failed: ${response.status}` 
      };
    }
    
    const data = await response.json();
    return { data, error: null };
    
  } catch (error: any) {
    console.error(`API error (${endpoint}):`, error);
    return { data: null, error: error.message || 'Request failed' };
  }
}

// ============================================================================
// HOME SCREEN API
// ============================================================================

/**
 * Get all data needed for the home screen.
 * Returns real user data only - no mock values.
 */
export async function getHomeData(): Promise<{ data: HomeData | null; error: string | null }> {
  return apiRequest<HomeData>('/api/v1/home/data');
}

// ============================================================================
// INSIGHTS API
// ============================================================================

/**
 * Get insights for the insights screen.
 * Returns patterns and summaries generated from real user data.
 */
export async function getInsights(): Promise<{ data: InsightsData | null; error: string | null }> {
  return apiRequest<InsightsData>('/api/v1/insights');
}

/**
 * Save an insight to favorites.
 */
export async function saveInsight(insightId: string): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/insights/${insightId}/save`,
    { method: 'POST' }
  );
  return { success: data?.success || false, error };
}

/**
 * Dismiss an insight.
 */
export async function dismissInsight(insightId: string): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/insights/${insightId}/dismiss`,
    { method: 'POST' }
  );
  return { success: data?.success || false, error };
}

// ============================================================================
// ENGAGEMENT API
// ============================================================================

/**
 * Get today's engagement prompt.
 */
export async function getDailyPrompt(): Promise<{ data: DailyPrompt | null; error: string | null }> {
  return apiRequest<DailyPrompt>('/api/v1/engagement/prompt');
}

/**
 * Answer the daily prompt.
 */
export async function answerPrompt(
  promptId: string, 
  response: string
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    '/api/v1/engagement/prompt/answer',
    { 
      method: 'POST',
      body: { prompt_id: promptId, response }
    }
  );
  return { success: data?.success || false, error };
}

/**
 * Get AI-suggested actions.
 */
export async function getSuggestedActions(): Promise<{ data: SuggestedAction[] | null; error: string | null }> {
  return apiRequest<SuggestedAction[]>('/api/v1/engagement/actions');
}

/**
 * Complete an action.
 */
export async function completeAction(actionId: string): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/engagement/actions/${actionId}/complete`,
    { method: 'POST' }
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
  error: string | null 
}> {
  const { data, error } = await apiRequest<{ success: boolean; newTotal: number; streak: number }>(
    '/api/v1/engagement/did-it',
    { method: 'POST' }
  );
  return { 
    success: data?.success || false, 
    newTotal: data?.newTotal || 0,
    streak: data?.streak || 0,
    error 
  };
}

// ============================================================================
// COMMITMENTS API
// ============================================================================

/**
 * Get active commitments.
 */
export async function getCommitments(): Promise<{ data: Commitment[] | null; error: string | null }> {
  return apiRequest<Commitment[]>('/api/v1/commitments');
}

/**
 * Check in on a commitment.
 */
export async function checkInCommitment(commitmentId: string): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/commitments/${commitmentId}/check-in`,
    { method: 'POST' }
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
  error: string | null 
}> {
  return apiRequest('/api/v1/coach/last-message');
}

/**
 * Get recent coach messages.
 */
export async function getCoachMessages(
  limit: number = 20, 
  offset: number = 0
): Promise<{ 
  data: Array<{ id: string; text: string; direction: string; timestamp: string; read: boolean }> | null;
  error: string | null 
}> {
  return apiRequest(`/api/v1/coach/messages?limit=${limit}&offset=${offset}`);
}

/**
 * Send a chat message to the coach using Custom GPT endpoint.
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  context?: any
): Promise<{ data: { messages: string[]; personality_score: number; context_used: string[]; variation_applied: boolean } | null; error: string | null }> {
  return apiRequest(
    '/api/v1/coach/custom-gpt/chat',
    { 
      method: 'POST',
      body: { 
        message,
        user_id: userId, // Send in body instead of query param
        context: context || {},
        response_type: "coaching"
      }
    }
  );
}

/**
 * Get chat history.
 */
export async function getChatHistory(
  userId: string,
  limit: number = 50, 
  offset: number = 0
): Promise<{ 
  data: { messages: Array<{ id: string; text: string; direction: string; timestamp: string; read: boolean }>; has_more: boolean } | null;
  error: string | null 
}> {
  return apiRequest(`/api/v1/coach/history/${userId}?limit=${limit}&offset=${offset}`);
}

// ============================================================================
// PROFILE API
// ============================================================================

/**
 * Get user profile.
 */
export async function getProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  return apiRequest<UserProfile>('/api/v1/profile');
}

/**
 * Update user profile.
 */
export async function updateProfile(updates: {
  full_name?: string;
  username?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; error: string | null }> {
  console.log('[coresenseApi] 🔄 updateProfile called with updates:', updates);
  
  try {
    const token = await getAuthToken();
    console.log('[coresenseApi] 🔑 Auth token obtained:', token ? 'present' : 'missing');
    
    if (!token) {
      console.log('[coresenseApi] ❌ No auth token available');
      return { success: false, error: 'Not authenticated' };
    }
    
    console.log('[coresenseApi] 🌐 Making API request to /api/v1/profile...');
    const response = await fetch(`${API_URL}/api/v1/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    console.log('[coresenseApi] 📡 API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[coresenseApi] ❌ API request failed:', errorData);
      return { 
        success: false, 
        error: errorData.detail || `Request failed: ${response.status}` 
      };
    }
    
    const data = await response.json();
    console.log('[coresenseApi] ✅ API request successful:', data);
    return { success: true, error: null };
    
  } catch (error: any) {
    console.error('[coresenseApi] 💥 Exception during API request:', error);
    return { success: false, error: error.message || 'Request failed' };
  }
}

/**
 * Get user preferences.
 */
export async function getPreferences(): Promise<{ data: UserPreferences | null; error: string | null }> {
  return apiRequest<UserPreferences>('/api/v1/preferences');
}

/**
 * Update user preferences.
 */
export async function updatePreferences(updates: Partial<{
  messaging_style: string;
  messaging_frequency: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}>): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    '/api/v1/preferences',
    { method: 'PUT', body: updates }
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
  error: string | null 
}> {
  return apiRequest('/api/v1/health/summary');
}

// ============================================================================
// STREAKS API
// ============================================================================

/**
 * Get all user streaks.
 */
export async function getStreaks(): Promise<{ data: Streaks | null; error: string | null }> {
  return apiRequest<Streaks>('/api/v1/streaks');
}

/**
 * Get message usage statistics
 */
export async function getMessageUsage(
  userId: string
): Promise<{ 
  data: { 
    messages_used: number; 
    messages_limit: number; 
    is_pro: boolean; 
    messages_remaining: number;
    usage_percentage: number;
  } | null; 
  error: string | null 
}> {
  return apiRequest(`/api/v1/coach/usage/${userId}`);
}

/**
 * Upgrade to pro plan (for testing)
 */
export async function upgradeToPro(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await apiRequest<{ success: boolean }>(
    `/api/v1/coach/upgrade/${userId}`,
    { method: 'POST' }
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
  
  // Streaks
  getStreaks,
  
  // Message Limits
  getMessageUsage,
  upgradeToPro,
};

export default coresenseApi;



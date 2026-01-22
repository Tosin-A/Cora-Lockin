/**
 * Insights Store - State management for commitment-pattern insights
 * Manages AI coach insights derived from commitment behavior patterns
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { coresenseApi } from '../utils/coresenseApi';
import { InsightsScreenData, InsightData } from '../types/insights';

export interface ChatInsight {
  id: string;
  title: string;
  body: string;
  category: 'sleep' | 'mood' | 'productivity' | 'health' | 'focus';
  source: 'chat' | 'health' | 'engagement';
  sourceChatId?: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  dismissed: boolean;
  saved: boolean;
}

export interface WeeklyInsight {
  week: string;
  summary: string;
  keyPatterns: string[];
  recommendations: string[];
  streakImpact: number;
}

export interface MonthlyInsight {
  month: string;
  theme: string;
  progressAreas: string[];
  focusRecommendations: string[];
  achievements: string[];
}

interface InsightsStore {
  // Legacy state (kept for compatibility)
  insights: ChatInsight[];
  weeklyInsights: WeeklyInsight[];
  monthlyInsights: MonthlyInsight[];

  // New commitment insights state
  commitmentInsights: InsightsScreenData | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchInsights: () => Promise<void>;
  fetchCommitmentInsights: () => Promise<void>;
  generateInsightFromChat: (chatMessage: string, category: string) => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  saveInsight: (insightId: string) => Promise<void>;
  recordReaction: (insightId: string, helpful: boolean) => Promise<void>;
  getInsightsByCategory: (category: string) => ChatInsight[];
  getRecentInsights: (days: number) => ChatInsight[];
  hasNewInsights: () => boolean;
  clearError: () => void;
}

export const useInsightsStore = create<InsightsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      insights: [],
      weeklyInsights: [],
      monthlyInsights: [],
      commitmentInsights: null,
      loading: false,
      error: null,

      // Actions
      fetchInsights: async () => {
        set({ loading: true, error: null });

        try {
          // Get insights from API
          const { data, error } = await coresenseApi.getInsights();

          if (error) {
            throw new Error(error);
          }

          if (data) {
            // Convert API insights to ChatInsight format (legacy)
            const formattedInsights: ChatInsight[] = data.patterns.map((pattern) => ({
              id: pattern.id,
              title: pattern.title,
              body: pattern.interpretation,
              category: pattern.category as any,
              source: 'health',
              actionable: true,
              priority: 'medium',
              createdAt: new Date(),
              dismissed: false,
              saved: false,
            }));

            set({
              insights: formattedInsights,
              weeklyInsights: data.weeklySummary
                ? [
                    {
                      week: new Date().toISOString().split('T')[0].slice(0, 7),
                      summary: data.weeklySummary.summary,
                      keyPatterns: data.weeklySummary.focusAreas,
                      recommendations: [],
                      streakImpact: 0,
                    },
                  ]
                : [],
            });
          }
        } catch (error: any) {
          console.error('Failed to fetch insights:', error);
          set({ error: error.message || 'Failed to load insights' });
        } finally {
          set({ loading: false });
        }
      },

      fetchCommitmentInsights: async () => {
        set({ loading: true, error: null });

        try {
          const { data, error } = await coresenseApi.getCommitmentInsights();

          if (error) {
            console.warn('Failed to fetch commitment insights:', error);
            set({ error: error });
          } else if (data) {
            set({ commitmentInsights: data as InsightsScreenData });
          }
        } catch (error: any) {
          console.error('Failed to fetch commitment insights:', error);
          set({ error: error.message || 'Failed to load insights' });
        } finally {
          set({ loading: false });
        }
      },

      generateInsightFromChat: async (chatMessage: string, category: string) => {
        // This would normally call an AI service to analyze chat and generate insights
        // For now, we'll create a simple heuristic-based insight

        const insightKeywords = {
          sleep: ['sleep', 'tired', 'insomnia', 'bedtime', 'nap', 'rested'],
          mood: ['feel', 'mood', 'happy', 'sad', 'stressed', 'anxious', 'excited'],
          productivity: ['focus', 'productive', 'work', 'task', 'goal', 'progress'],
          health: ['exercise', 'workout', 'eat', 'healthy', 'doctor', 'pain'],
          focus: ['concentrate', 'distracted', 'attention', 'meditate', 'mindful'],
        };

        const keywords = insightKeywords[category as keyof typeof insightKeywords] || [];
        const hasRelevantKeywords = keywords.some((keyword) =>
          chatMessage.toLowerCase().includes(keyword)
        );

        if (hasRelevantKeywords) {
          const newInsight: ChatInsight = {
            id: `chat-insight-${Date.now()}`,
            title: `Chat-based ${category} insight`,
            body: `Based on your recent message: "${chatMessage.substring(0, 100)}...", I noticed patterns that suggest opportunities for improvement in your ${category} routine.`,
            category: category as any,
            source: 'chat',
            actionable: true,
            priority: 'medium',
            createdAt: new Date(),
            dismissed: false,
            saved: false,
          };

          set((state) => ({
            insights: [newInsight, ...state.insights],
          }));
        }
      },

      dismissInsight: async (insightId: string) => {
        try {
          const { success } = await coresenseApi.dismissInsight(insightId);

          if (success) {
            // Update legacy insights
            set((state) => ({
              insights: state.insights.map((insight) =>
                insight.id === insightId ? { ...insight, dismissed: true } : insight
              ),
            }));

            // Update commitment insights - remove from patterns
            set((state) => {
              if (!state.commitmentInsights) return state;
              return {
                commitmentInsights: {
                  ...state.commitmentInsights,
                  patterns: state.commitmentInsights.patterns.filter(
                    (p) => p.id !== insightId
                  ),
                },
              };
            });
          }
        } catch (error: any) {
          console.error('Failed to dismiss insight:', error);
          set({ error: error.message || 'Failed to dismiss insight' });
        }
      },

      saveInsight: async (insightId: string) => {
        try {
          const { success } = await coresenseApi.saveInsight(insightId);

          if (success) {
            set((state) => ({
              insights: state.insights.map((insight) =>
                insight.id === insightId ? { ...insight, saved: true } : insight
              ),
            }));
          }
        } catch (error: any) {
          console.error('Failed to save insight:', error);
          set({ error: error.message || 'Failed to save insight' });
        }
      },

      recordReaction: async (insightId: string, helpful: boolean) => {
        try {
          await coresenseApi.recordInsightReaction(insightId, helpful);

          // Mark as no longer new
          set((state) => {
            if (!state.commitmentInsights) return state;
            return {
              commitmentInsights: {
                ...state.commitmentInsights,
                patterns: state.commitmentInsights.patterns.map((p) =>
                  p.id === insightId ? { ...p, is_new: false } : p
                ),
              },
            };
          });
        } catch (error: any) {
          console.error('Failed to record reaction:', error);
        }
      },

      getInsightsByCategory: (category: string) => {
        const { insights } = get();
        return insights.filter(
          (insight) => insight.category === category && !insight.dismissed
        );
      },

      getRecentInsights: (days: number) => {
        const { insights } = get();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return insights.filter(
          (insight) => insight.createdAt >= cutoffDate && !insight.dismissed
        );
      },

      hasNewInsights: () => {
        const { commitmentInsights } = get();
        if (!commitmentInsights?.patterns) return false;
        return commitmentInsights.patterns.some((p) => p.is_new);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'insights-store',
      partialize: (state) => ({
        insights: state.insights.filter((i) => !i.dismissed).slice(-20), // Keep last 20 non-dismissed insights
        weeklyInsights: state.weeklyInsights.slice(-4), // Keep last 4 weeks
        monthlyInsights: state.monthlyInsights.slice(-6), // Keep last 6 months
        // Don't persist commitmentInsights - always fetch fresh
      }),
    }
  )
);

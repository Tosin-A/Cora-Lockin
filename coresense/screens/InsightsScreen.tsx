/**
 * Insights Screen
 * Commitment-pattern-focused insights with AI coach interpretation.
 * Shows meaningful patterns from commitment data, not just raw stats.
 *
 * Design Principles:
 * - Coach commentary is the LARGEST text on screen
 * - Cards feel physical (shadows, padding, rounded corners)
 * - Color-coded by type: behavioral (blue), progress (green), risk (amber)
 * - Max 5 active insights at a time
 * - Fail gracefully, never crash
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from '../components';
import { CoachCommentary, PatternCard } from '../components/insights';
import { QuickLogModal } from '../components/metrics';
import { useAuthStore } from '../stores/authStore';
import { useInsightsStore } from '../stores/insightsStore';
import { useMetricsStore } from '../stores/metricsStore';
import { useHealthStore } from '../stores/healthStore';
import {
  InsightType,
  PatternType,
  InsightsScreenData,
  InsightData,
} from '../types/insights';
import type { MetricInput } from '../types/metrics';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  // Insights store
  const {
    healthInsights,
    loading,
    error,
    fetchHealthInsights,
    dismissInsight,
    recordReaction,
  } = useInsightsStore();

  // Metrics store
  const { logBatchMetrics } = useMetricsStore();

  // Health store - for syncing HealthKit data on refresh
  const { syncToSupabase, permissionsGranted } = useHealthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);

  // Sync HealthKit data and fetch insights on focus
  useFocusEffect(
    useCallback(() => {
      const syncAndFetch = async () => {
        console.log('[InsightsScreen] Focus effect - syncing health data and fetching insights');
        if (permissionsGranted && user?.id) {
          await syncToSupabase(user.id);
        }
        await fetchHealthInsights();
      };
      syncAndFetch();
    }, [fetchHealthInsights, syncToSupabase, permissionsGranted, user?.id])
  );

  // Pull to refresh - sync HealthKit first, then fetch insights
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (permissionsGranted && user?.id) {
        await syncToSupabase(user.id);
      }
      await fetchHealthInsights();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle quick log submission
  const handleQuickLogSubmit = async (metrics: MetricInput[]): Promise<boolean> => {
    return await logBatchMetrics(metrics);
  };

  // Handle asking coach about an insight
  const handleAskCoach = (insight: InsightData) => {
    // Navigate to coach chat with context about the insight
    navigation.navigate('Coach', {
      context: {
        type: 'insight',
        insightId: insight.id,
        title: insight.title,
        commentary: insight.coach_commentary,
        patternType: insight.evidence?.type,
        actionSteps: insight.action_steps,
      },
    });
  };

  // Handle marking insight as helpful
  const handleHelpful = async (insightId: string) => {
    await recordReaction(insightId, true);
  };

  // Handle dismissing insight
  const handleDismiss = async (insightId: string) => {
    await dismissInsight(insightId);
  };

  // Loading state
  if (loading && !healthInsights) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing your health data...</Text>
      </View>
    );
  }

  // Error state
  if (error && !healthInsights) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + 100,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header with Quick Log Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>Pull down to retry</Text>
          </View>
          <TouchableOpacity
            style={styles.quickLogButton}
            onPress={() => setShowQuickLog(true)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>

        {/* Quick Log Modal */}
        <QuickLogModal
          visible={showQuickLog}
          onClose={() => setShowQuickLog(false)}
          onSubmit={handleQuickLogSubmit}
        />
      </ScrollView>
    );
  }

  // Empty state - not enough data for patterns
  if (!healthInsights?.has_enough_data) {
    const daysRemaining = healthInsights?.days_until_enough_data || 3;
    const hasNoHealthData = daysRemaining >= 6;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + 100,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header with Quick Log Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>Health-first insights</Text>
          </View>
          <TouchableOpacity
            style={styles.quickLogButton}
            onPress={() => setShowQuickLog(true)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Patterns Empty State */}
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons
              name={hasNoHealthData ? 'leaf-outline' : 'pulse-outline'}
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>
              {hasNoHealthData ? 'Waiting for health data' : 'Analyzing your health data...'}
            </Text>
            <Text style={styles.emptyText}>
              {hasNoHealthData
                ? "Sync your Health data to get sleep and activity insights."
                : "Give me a few seconds. I'm looking at your sleep and activity from the last week."}
            </Text>
            <View style={styles.emptyProgress}>
              <View style={styles.emptyProgressBar}>
                <View
                  style={[
                    styles.emptyProgressFill,
                    { width: `${Math.max(20, 100 - daysRemaining * 20)}%` },
                  ]}
                />
              </View>
              <Text style={styles.emptyProgressText}>
                {hasNoHealthData ? 'Open Health tab to sync' : '— Coach'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Log Modal */}
        <QuickLogModal
          visible={showQuickLog}
          onClose={() => setShowQuickLog(false)}
          onSubmit={handleQuickLogSubmit}
        />
      </ScrollView>
    );
  }

  // Data state - show insights
  const patterns = healthInsights.patterns || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
          paddingBottom: Math.max(insets.bottom, Spacing.lg) + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your health patterns</Text>
        </View>
        <TouchableOpacity
          style={styles.quickLogButton}
          onPress={() => setShowQuickLog(true)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="add-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Coach Summary */}
      {healthInsights.coach_summary && (
        <CoachCommentary
          commentary={healthInsights.coach_summary}
        />
      )}

      {/* Pattern Cards */}
      {patterns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What I Noticed</Text>

          {patterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              id={pattern.id}
              type={pattern.type as InsightType}
              title={pattern.title}
              coachCommentary={pattern.coach_commentary}
              evidence={{
                type: pattern.evidence.type as PatternType,
                labels: pattern.evidence.labels,
                values: pattern.evidence.values,
                highlight_index: pattern.evidence.highlight_index,
                trend_direction: pattern.evidence.trend_direction,
                trend_value: pattern.evidence.trend_value,
              }}
              actionText={pattern.action_text}
              actionSteps={pattern.action_steps}
              isNew={pattern.is_new}
              onAskCoach={() => handleAskCoach(pattern as InsightData)}
              onHelpful={() => handleHelpful(pattern.id)}
              onDismiss={() => handleDismiss(pattern.id)}
            />
          ))}
        </View>
      )}

      {/* No patterns but has enough data */}
      {patterns.length === 0 && healthInsights.has_enough_data && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptyText}>
              No new patterns to report right now. I'll keep scanning your health data.
            </Text>
          </View>
        </Card>
      )}

      {/* Swipe Tip */}
      {patterns.length > 0 && (
        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.tipText}>
            Swipe cards: right = helpful, left = dismiss
          </Text>
        </View>
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        visible={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSubmit={handleQuickLogSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  quickLogButton: {
    padding: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  // Error state
  errorCard: {
    padding: Spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Empty state
  emptyCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyProgress: {
    width: '100%',
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  emptyProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.glassBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  emptyProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  emptyProgressText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  // Tip
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  tipText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});

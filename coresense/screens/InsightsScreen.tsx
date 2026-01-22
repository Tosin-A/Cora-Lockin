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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from '../components';
import { CoachCommentary, PatternCard } from '../components/insights';
import { useAuthStore } from '../stores/authStore';
import { useInsightsStore } from '../stores/insightsStore';
import {
  InsightType,
  PatternType,
  InsightsScreenData,
  InsightData,
} from '../types/insights';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  // Insights store
  const {
    commitmentInsights,
    loading,
    error,
    fetchCommitmentInsights,
    dismissInsight,
    recordReaction,
  } = useInsightsStore();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch insights on focus
  useFocusEffect(
    useCallback(() => {
      console.log('[InsightsScreen] Focus effect - fetching insights');
      fetchCommitmentInsights();
    }, [fetchCommitmentInsights])
  );

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCommitmentInsights();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
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

  // Determine coach expression based on insights
  const getCoachExpression = (): 'happy' | 'thoughtful' | 'encouraging' | 'concerned' => {
    if (!commitmentInsights?.patterns?.length) return 'thoughtful';

    const hasRisk = commitmentInsights.patterns.some(
      (p) => p.type === InsightType.PROGRESS || p.type === 'progress'
    );
    const hasProgress = commitmentInsights.patterns.some(
      (p) => p.type === InsightType.PROGRESS || p.type === 'progress'
    );

    if (hasProgress && !hasRisk) return 'happy';
    if (hasRisk) return 'concerned';
    return 'encouraging';
  };

  // Loading state
  if (loading && !commitmentInsights) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing your patterns...</Text>
      </View>
    );
  }

  // Error state
  if (error && !commitmentInsights) {
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
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Pull down to retry</Text>
        </View>
        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Empty state - not enough data
  if (!commitmentInsights?.has_enough_data) {
    const daysRemaining = commitmentInsights?.days_until_enough_data || 3;

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
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your commitment patterns</Text>
        </View>
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="analytics-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Building Your Patterns</Text>
            <Text style={styles.emptyText}>
              I need a bit more data to spot meaningful patterns in your commitments.
              Check back in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
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
                Keep completing commitments!
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Data state - show insights
  const patterns = commitmentInsights.patterns || [];

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
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Your commitment patterns</Text>
      </View>

      {/* Coach Summary */}
      {commitmentInsights.coach_summary && (
        <CoachCommentary
          commentary={commitmentInsights.coach_summary}
          expression={getCoachExpression()}
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
              isNew={pattern.is_new}
              onAskCoach={() => handleAskCoach(pattern as InsightData)}
              onHelpful={() => handleHelpful(pattern.id)}
              onDismiss={() => handleDismiss(pattern.id)}
            />
          ))}
        </View>
      )}

      {/* No patterns but has enough data */}
      {patterns.length === 0 && commitmentInsights.has_enough_data && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptyText}>
              No new patterns to report right now. Keep completing your commitments
              and I'll surface any meaningful insights.
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

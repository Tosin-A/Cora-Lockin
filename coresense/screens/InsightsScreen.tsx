/**
 * Insights Screen
 * Premium dark SaaS aesthetic - unified purple accent system
 *
 * Design Principles:
 * - Sticky header with subtle blur
 * - Cards with purple borders and soft glows
 * - Touch targets minimum 44pt
 * - Clean, minimal, modern design
 */

import React, { useState, useCallback } from 'react';
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
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Shadows,
  Layout,
  TouchTarget,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components';
import { CoachCommentary, PatternCard } from '../components/insights';
import { useAuthStore } from '../stores/authStore';
import { useInsightsStore } from '../stores/insightsStore';
import { useHealthStore } from '../stores/healthStore';
import {
  InsightType,
  PatternType,
  InsightData,
} from '../types/insights';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
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

  // Health store - for syncing HealthKit data on refresh
  const { syncToSupabase, permissionsGranted } = useHealthStore();

  const [refreshing, setRefreshing] = useState(false);

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

  // Handle asking coach about an insight
  const handleAskCoach = (insight: InsightData) => {
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

  // Sticky Header Component
  const StickyHeader = ({ subtitle }: { subtitle: string }) => (
    <View style={[styles.stickyHeader, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.background }]}>
      <View style={[StyleSheet.absoluteFill, styles.headerBg, { backgroundColor: colors.background }]} />
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );

  // Loading state
  if (loading && !healthInsights) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing your health data...</Text>
      </View>
    );
  }

  // Error state
  if (error && !healthInsights) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StickyHeader subtitle="Pull to retry" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              progressViewOffset={insets.top + 80}
            />
          }
        >
          <Card variant="elevated" style={styles.stateCard}>
            <View style={styles.stateContent}>
              <View style={[styles.stateIconContainer, styles.errorIconBg]}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
              </View>
              <Text style={styles.stateTitle}>Something went wrong</Text>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Empty state - not enough data for patterns
  if (!healthInsights?.has_enough_data) {
    const daysRemaining = healthInsights?.days_until_enough_data || 3;
    const hasNoHealthData = daysRemaining >= 6;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StickyHeader subtitle="Health-first insights" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              progressViewOffset={insets.top + 80}
            />
          }
        >
          <Card variant="elevated" style={styles.stateCard}>
            <View style={styles.stateContent}>
              <View style={[styles.stateIconContainer, styles.emptyIconBg, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons
                  name={hasNoHealthData ? 'leaf-outline' : 'pulse-outline'}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.stateTitle}>
                {hasNoHealthData ? 'Waiting for health data' : 'Analyzing your patterns'}
              </Text>
              <Text style={styles.stateText}>
                {hasNoHealthData
                  ? "Sync your Health data to unlock sleep and activity insights."
                  : "I'm looking at your sleep and activity from the last week. This usually takes a moment."}
              </Text>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(20, 100 - daysRemaining * 20)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {hasNoHealthData ? 'Open Health tab to sync' : 'Almost ready...'}
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Data state - show insights
  const patterns = healthInsights.patterns || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StickyHeader subtitle="Your health patterns" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            paddingBottom: Math.max(insets.bottom, 16) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            progressViewOffset={insets.top + 80}
          />
        }
      >
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
                  highlight_index: pattern.evidence.highlight_index ?? undefined,
                  trend_direction: (pattern.evidence.trend_direction as 'up' | 'down' | 'stable') || 'stable',
                  trend_value: pattern.evidence.trend_value ?? undefined,
                }}
                actionText={pattern.action_text ?? undefined}
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
          <Card variant="elevated" style={styles.stateCard}>
            <View style={styles.stateContent}>
              <View style={[styles.stateIconContainer, styles.successIconBg]}>
                <Ionicons name="checkmark-circle-outline" size={32} color={Colors.success} />
              </View>
              <Text style={styles.stateTitle}>All Caught Up</Text>
              <Text style={styles.stateText}>
                No new patterns to report right now. I'll keep scanning your health data.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Layout.screenPadding,
  },

  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerBg: {
    backgroundColor: 'rgba(248, 248, 250, 0.97)',
  },
  headerContent: {
    zIndex: 1,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: Layout.sectionGap,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  // Loading
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },

  // State Cards (Error, Empty, Success)
  stateCard: {
    padding: Spacing.xxl,
  },
  stateContent: {
    alignItems: 'center',
  },
  stateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIconBg: {
    backgroundColor: Colors.primaryMuted,
  },
  errorIconBg: {
    backgroundColor: Colors.errorTint,
  },
  successIconBg: {
    backgroundColor: Colors.successTint,
  },
  stateTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stateText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },

  // Progress
  progressContainer: {
    width: '100%',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
});

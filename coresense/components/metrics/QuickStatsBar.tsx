/**
 * QuickStatsBar - Horizontal scrolling stats bar for the insights dashboard
 * Displays energy, sleep, mood, and streak cards
 */

import React from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { MetricCard } from './MetricCard';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { QuickStats, MoodLabel, TrendDirection } from '../../types/metrics';

interface QuickStatsBarProps {
  stats: QuickStats | null;
  loading?: boolean;
  onMetricPress?: (metricType: string) => void;
}

export function QuickStatsBar({ stats, loading, onMetricPress }: QuickStatsBarProps) {
  // Format trend value for display
  const formatTrend = (current: number | null, previous: number | null): string => {
    if (current === null || previous === null) return '';
    const diff = current - previous;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  // Format sleep hours for display
  const formatSleepHours = (hours: number | null): string => {
    if (hours === null) return '\u2014';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Get emoji for mood
  const getMoodEmoji = (mood: MoodLabel | null): string => {
    switch (mood) {
      case 'very_happy': return '\u{1F604}'; // grinning face
      case 'happy': return '\u{1F60A}'; // smiling face
      case 'neutral': return '\u{1F610}'; // neutral face
      case 'sad': return '\u{1F614}'; // pensive face
      case 'very_sad': return '\u{1F622}'; // crying face
      default: return '\u{1F610}'; // neutral
    }
  };

  // Format mood label for display
  const formatMoodLabel = (mood: MoodLabel | null): string => {
    if (!mood) return '\u2014';
    return mood.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Log your first check-in to see stats
        </Text>
      </View>
    );
  }

  // Calculate trend value for energy
  const energyTrendValue = formatTrend(
    stats.energy.avg_this_week,
    stats.energy.avg_last_week
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Energy Card */}
        <MetricCard
          icon="\u26A1" // lightning
          label="Energy"
          value={stats.energy.current !== null ? `${stats.energy.current}/5` : null}
          subtitle={
            stats.energy.best_time
              ? `Best: ${stats.energy.best_time}`
              : stats.energy.avg_this_week !== null
              ? `Avg: ${stats.energy.avg_this_week.toFixed(1)}/5`
              : undefined
          }
          trend={stats.energy.trend}
          trendValue={energyTrendValue || undefined}
          color={Colors.neonBlue}
          onPress={() => onMetricPress?.('energy')}
        />

        {/* Sleep Card */}
        <MetricCard
          icon="\u{1F4A4}" // zzz
          label="Sleep"
          value={formatSleepHours(stats.sleep.last_night)}
          subtitle={
            stats.sleep.avg_this_week !== null
              ? `Avg: ${formatSleepHours(stats.sleep.avg_this_week)}`
              : undefined
          }
          trend={stats.sleep.trend}
          trendValue={
            stats.sleep.consistency_score !== null
              ? `${stats.sleep.consistency_score}%`
              : undefined
          }
          color={Colors.primary}
          onPress={() => onMetricPress?.('sleep')}
        />

        {/* Streak Card */}
        <MetricCard
          icon="\u{1F525}" // fire
          label="Streak"
          value={stats.streak.current}
          subtitle={`${Math.round(stats.streak.completion_rate_this_week * 100)}% this week`}
          color={Colors.neonAmber}
          onPress={() => onMetricPress?.('streak')}
        />

        {/* Mood Card */}
        <MetricCard
          icon={getMoodEmoji(stats.mood.dominant)}
          label="Mood"
          value={formatMoodLabel(stats.mood.dominant)}
          subtitle={stats.mood.consistency === 'stable' ? 'Steady' : 'Variable'}
          color={Colors.neonGreen}
          onPress={() => onMetricPress?.('mood')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});

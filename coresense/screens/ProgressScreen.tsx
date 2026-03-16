/**
 * Progress Screen
 * Trend charts for mood, energy, sleep, steps, and habit completions.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { coresenseApi, WeeklyRecap } from '../utils/coresenseApi';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - Spacing.lg * 2;

function ChartSection({
  title,
  data,
  suffix,
  colors,
}: {
  title: string;
  data: Array<{ date: string; value: number }>;
  suffix?: string;
  colors: ReturnType<typeof import('../contexts/ThemeContext').useTheme>['colors'];
}) {
  if (!data || data.length === 0) return null;

  const labels = data.map((d) => {
    const parts = d.date.split('-');
    return `${parts[1]}/${parts[2]}`;
  });
  const values = data.map((d) => d.value);

  // Limit labels shown to avoid crowding
  const displayLabels = labels.map((l, i) =>
    labels.length <= 7 || i % Math.ceil(labels.length / 7) === 0 ? l : ''
  );

  return (
    <View style={styles.chartSection}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</Text>
      <LineChart
        data={{
          labels: displayLabels,
          datasets: [{ data: values.length > 0 ? values : [0] }],
        }}
        width={chartWidth}
        height={180}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: () => colors.primary,
          labelColor: () => colors.textTertiary,
          propsForDots: {
            r: '3',
            strokeWidth: '1',
            stroke: colors.primary,
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: colors.border,
            strokeWidth: StyleSheet.hairlineWidth,
          },
        }}
        bezier
        withInnerLines={false}
        withOuterLines={false}
        style={styles.chart}
        formatYLabel={(val) => `${val}${suffix || ''}`}
      />
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecap = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await coresenseApi.getWeeklyRecap(7);
      if (data) setRecap(data);
    } catch (e) {
      console.error('Failed to fetch recap:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecap(false);
  }, [fetchRecap]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasAnyData =
    recap &&
    ((recap.mood_trend?.length ?? 0) > 0 ||
      (recap.energy_trend?.length ?? 0) > 0 ||
      (recap.sleep_trend?.length ?? 0) > 0 ||
      (recap.steps_trend?.length ?? 0) > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Last 7 Days</Text>

      {recap?.coach_summary && (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>{recap.coach_summary}</Text>
      )}

      {!hasAnyData ? (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Check in daily and sync health data to see trends
          </Text>
        </View>
      ) : (
        <>
          <ChartSection title="Mood" data={recap?.mood_trend ?? []} suffix="" colors={colors} />
          <ChartSection title="Energy" data={recap?.energy_trend ?? []} suffix="" colors={colors} />
          <ChartSection title="Sleep" data={recap?.sleep_trend ?? []} suffix="h" colors={colors} />
          <ChartSection title="Steps" data={recap?.steps_trend ?? []} suffix="" colors={colors} />

          {(recap?.tasks_completed_by_day?.length ?? 0) > 0 && (
            <ChartSection
              title="Tasks Completed"
              data={(recap?.tasks_completed_by_day ?? []).map((d) => ({
                date: d.date,
                value: d.count,
              }))}
              colors={colors}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  summary: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  chartSection: {
    marginBottom: Spacing.xl,
  },
  chartTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: BorderRadius.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    fontWeight: '500',
  },
  emptySubtext: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});

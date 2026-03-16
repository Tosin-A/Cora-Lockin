/**
 * Health Analytics Screen
 * Displays steps, sleep, heart rate, and active energy with charts
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { useAuthStore } from '../stores/authStore';
import { useHealthStore } from '../stores/healthStore';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - Spacing.lg * 2;

// Skeleton placeholder for a single block
function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  opacity,
  backgroundColor,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: Animated.Value;
  backgroundColor: string;
}) {
  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor,
        opacity,
      }}
    />
  );
}

// Full skeleton layout for the main content
function HealthSkeleton({ opacity, backgroundColor }: { opacity: Animated.Value; backgroundColor: string }) {
  return (
    <View style={{ gap: Spacing.xl }}>
      {/* Header skeleton */}
      <View style={{ gap: Spacing.sm }}>
        <SkeletonBlock width={180} height={28} borderRadius={6} opacity={opacity} backgroundColor={backgroundColor} />
        <SkeletonBlock width={140} height={14} borderRadius={4} opacity={opacity} backgroundColor={backgroundColor} />
      </View>

      {/* Today section skeleton */}
      <View style={{ gap: Spacing.md }}>
        <SkeletonBlock width={60} height={16} borderRadius={4} opacity={opacity} backgroundColor={backgroundColor} />
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={80} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={80} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={80} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={80} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
        </View>
      </View>

      {/* Weekly averages skeleton */}
      <View style={{ gap: Spacing.md }}>
        <SkeletonBlock width={120} height={16} borderRadius={4} opacity={opacity} backgroundColor={backgroundColor} />
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={88} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="100%" height={88} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
          </View>
        </View>
      </View>

      {/* Chart skeleton */}
      <View style={{ gap: Spacing.md }}>
        <SkeletonBlock width={160} height={16} borderRadius={4} opacity={opacity} backgroundColor={backgroundColor} />
        <SkeletonBlock width="100%" height={220} borderRadius={BorderRadius.medium} opacity={opacity} backgroundColor={backgroundColor} />
      </View>
    </View>
  );
}

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const {
    isAvailable,
    permissionsGranted,
    isInitializing,
    todayData,
    weeklySteps,
    weeklySleep,
    weeklyHeartRate,
    weeklyActiveEnergy,
    isLoadingWeeklyData,
    isSyncing,
    lastSyncedAt,
    initialize,
    requestPermissions,
    refreshTodayData,
    refreshWeeklyData,
    syncToSupabase,
    loadFromSupabase,
  } = useHealthStore();

  const [refreshing, setRefreshing] = useState(false);

  // Animated value for skeleton pulse
  const skeletonOpacity = useMemo(() => new Animated.Value(0.4), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [skeletonOpacity]);

  useEffect(() => {
    if (user) {
      initialize();
      loadFromSupabase(user.id);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshTodayData(),
        refreshWeeklyData(),
        user ? syncToSupabase(user.id, true) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'HealthKit permissions are required to view your health data. Please enable them in Settings > Health > Data Access & Devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {} },
        ]
      );
    } else {
      await handleRefresh();
    }
  };

  const calculateWeeklyAverage = (
    data: Array<{ date: Date; steps?: number; hours?: number }>,
    key: 'steps' | 'hours'
  ): number => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (item[key] || 0), 0);
    return Math.round(sum / data.length);
  };

  const avgHeartRate = useMemo(() => {
    if (weeklyHeartRate.length === 0) return null;
    const sum = weeklyHeartRate.reduce((acc, item) => acc + item.bpm, 0);
    return Math.round(sum / weeklyHeartRate.length);
  }, [weeklyHeartRate]);

  const avgActiveEnergy = useMemo(() => {
    if (weeklyActiveEnergy.length === 0) return null;
    const sum = weeklyActiveEnergy.reduce((acc, item) => acc + item.calories, 0);
    return Math.round(sum / weeklyActiveEnergy.length);
  }, [weeklyActiveEnergy]);

  // Prepare chart data for steps
  const stepsChartData = useMemo(() => {
    const items = weeklySteps.slice(-7);
    const data = items.map((item) => Number(item.steps) || 0);
    const hasData = data.some((v) => v > 0);
    return {
      labels: items.length > 0 ? items.map((item) => format(item.date, 'EEE')) : [''],
      datasets: [
        {
          data: hasData ? data : [0, 1],
          color: (opacity = 1) => colors.primary,
          strokeWidth: 2,
        },
      ],
    };
  }, [weeklySteps, colors.primary]);

  // Prepare chart data for sleep
  const sleepChartData = useMemo(() => {
    const items = weeklySleep.slice(-7);
    const data = items.map((item) => Number(item.hours) || 0);
    const hasData = data.some((v) => v > 0);
    return {
      labels: items.length > 0 ? items.map((item) => format(item.date, 'EEE')) : [''],
      datasets: [
        {
          data: hasData ? data : [0, 1],
          color: (opacity = 1) => colors.accent,
          strokeWidth: 2,
        },
      ],
    };
  }, [weeklySleep, colors.accent]);

  // Check if charts have real data to display
  const hasStepsData = weeklySteps.length > 0 && weeklySteps.some((item) => Number(item.steps) > 0);
  const hasSleepData = weeklySleep.length > 0 && weeklySleep.some((item) => Number(item.hours) > 0);

  // Theme-aware chart config
  const chartConfig = useMemo(() => {
    const labelRgb = isDark ? '229, 229, 229' : '71, 85, 105';
    return {
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(${labelRgb}, ${opacity * 0.3})`,
      labelColor: (opacity = 1) => `rgba(${labelRgb}, ${opacity})`,
      style: {
        borderRadius: BorderRadius.medium,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
    };
  }, [colors, isDark]);

  const skeletonBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  if (Platform.OS !== 'ios') {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + Spacing.md }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          HealthKit is only available on iOS devices.
        </Text>
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + Spacing.md }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          HealthKit is not available on this device.
        </Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <View style={styles.permissionContainer}>
          <Ionicons name="heart-outline" size={56} color={colors.primary} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Health Data Access
          </Text>
          <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
            CoreSense needs access to your health data to provide personalized coaching insights.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary, minHeight: 44 }]}
            onPress={handleRequestPermissions}
            disabled={isInitializing}
          >
            <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>
              {isInitializing ? 'Initializing...' : 'Grant Permissions'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const isLoading = isInitializing || isLoadingWeeklyData;
  const weeklyStepsAvg = calculateWeeklyAverage(weeklySteps, 'steps');
  const weeklySleepAvg = calculateWeeklyAverage(weeklySleep, 'hours');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {isLoading ? (
        <HealthSkeleton opacity={skeletonOpacity} backgroundColor={skeletonBg} />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Health Analytics</Text>
            {lastSyncedAt && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Last synced: {format(lastSyncedAt, 'MMM d, h:mm a')}
              </Text>
            )}
          </View>

          {/* Today's Stats — 2x2 grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statTileWrapper}>
                <StatTile
                  icon="footsteps"
                  label="Steps"
                  value={todayData?.steps?.toLocaleString() || '0'}
                  subtitle="Today"
                />
              </View>
              <View style={styles.statTileWrapper}>
                <StatTile
                  icon="moon"
                  label="Sleep"
                  value={todayData?.sleepHours ? `${todayData.sleepHours.toFixed(1)}h` : '0h'}
                  subtitle="Last night"
                />
              </View>
            </View>
            <View style={[styles.statsGrid, { marginTop: Spacing.md }]}>
              <View style={styles.statTileWrapper}>
                <StatTile
                  icon="heart"
                  label="Heart Rate"
                  value={
                    todayData?.heartRate
                      ? `${Math.round(todayData.heartRate)} bpm`
                      : avgHeartRate
                      ? `${avgHeartRate} bpm`
                      : '—'
                  }
                  subtitle={todayData?.heartRate ? 'Latest' : avgHeartRate ? 'Avg this week' : 'No data'}
                />
              </View>
              <View style={styles.statTileWrapper}>
                <StatTile
                  icon="flame"
                  label="Active Energy"
                  value={
                    todayData?.activeEnergy
                      ? `${Math.round(todayData.activeEnergy)} kcal`
                      : avgActiveEnergy
                      ? `${avgActiveEnergy} kcal`
                      : '—'
                  }
                  subtitle={todayData?.activeEnergy ? 'Today' : avgActiveEnergy ? 'Avg this week' : 'No data'}
                />
              </View>
            </View>
          </View>

          {/* Weekly Averages */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Weekly Averages</Text>
            <View style={styles.statsGrid}>
              <Card style={styles.averageCard}>
                <Ionicons name="trending-up" size={22} color={colors.textSecondary} />
                <Text style={[styles.averageValue, { color: colors.textPrimary }]}>
                  {weeklyStepsAvg.toLocaleString()}
                </Text>
                <Text style={[styles.averageLabel, { color: colors.textSecondary }]}>Steps/day</Text>
              </Card>
              <Card style={styles.averageCard}>
                <Ionicons name="moon" size={22} color={colors.textSecondary} />
                <Text style={[styles.averageValue, { color: colors.textPrimary }]}>
                  {weeklySleepAvg.toFixed(1)}h
                </Text>
                <Text style={[styles.averageLabel, { color: colors.textSecondary }]}>Sleep/night</Text>
              </Card>
            </View>
          </View>

          {/* Steps Chart */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Steps (Last 7 Days)</Text>
            {hasStepsData ? (
              <Card style={styles.chartCard}>
                <LineChart
                  data={stepsChartData}
                  width={chartWidth - Spacing.md * 2}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  fromZero
                  style={styles.chart}
                  yAxisSuffix=""
                  yAxisInterval={1}
                />
              </Card>
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Ionicons name="footsteps-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No steps data yet
                </Text>
                <Text style={[styles.emptyStateBody, { color: colors.textSecondary }]}>
                  Open the Health app or go for a walk to start tracking your steps.
                </Text>
              </View>
            )}
          </View>

          {/* Sleep Chart */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sleep (Last 7 Days)</Text>
            {hasSleepData ? (
              <Card style={styles.chartCard}>
                <LineChart
                  data={sleepChartData}
                  width={chartWidth - Spacing.md * 2}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  fromZero
                  style={styles.chart}
                  yAxisSuffix="h"
                  yAxisInterval={1}
                />
              </Card>
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Ionicons name="moon-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No sleep data yet
                </Text>
                <Text style={[styles.emptyStateBody, { color: colors.textSecondary }]}>
                  Sleep data appears here once your device records a sleep session.
                </Text>
              </View>
            )}
          </View>

          {/* Sync Button */}
          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isSyncing && styles.syncButtonDisabled,
            ]}
            onPress={() => user && syncToSupabase(user.id)}
            disabled={isSyncing || !user}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSyncing ? 'sync' : 'cloud-upload-outline'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.syncButtonText, { color: colors.textSecondary }]}>
              {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statTileWrapper: {
    flex: 1,
  },
  averageCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  averageValue: {
    ...Typography.h2,
    marginTop: Spacing.sm,
  },
  averageLabel: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  chartCard: {
    padding: Spacing.md,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.medium,
    gap: Spacing.sm,
  },
  emptyStateTitle: {
    ...Typography.h3,
    textAlign: 'center',
  },
  emptyStateBody: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    minHeight: 44,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    ...Typography.body,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  permissionTitle: {
    ...Typography.h2,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  permissionDescription: {
    ...Typography.body,
    textAlign: 'center',
  },
  permissionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    ...Typography.button,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
    padding: Spacing.xl,
  },
});

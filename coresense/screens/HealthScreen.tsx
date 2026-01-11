/**
 * Health Analytics Screen
 * Displays steps, sleep, and health metrics with charts
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { useAuthStore } from '../stores/authStore';
import { useHealthStore } from '../stores/healthStore';
import { format, subDays } from 'date-fns';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - Spacing.lg * 2;

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    isAvailable,
    permissionsGranted,
    isInitializing,
    todayData,
    weeklySteps,
    weeklySleep,
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

  useEffect(() => {
    if (user) {
      initialize();
      loadFromSupabase(user.id);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTodayData();
      await refreshWeeklyData();
      if (user) {
        await syncToSupabase(user.id);
      }
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
          { text: 'Open Settings', onPress: () => {
            // Could use Linking.openSettings() here if needed
          }},
        ]
      );
    } else {
      await handleRefresh();
    }
  };

  const calculateWeeklyAverage = (data: Array<{ date: Date; steps?: number; hours?: number }>, key: 'steps' | 'hours'): number => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (item[key] || 0), 0);
    return Math.round(sum / data.length);
  };

  // Prepare chart data for steps
  const stepsChartData = {
    labels: weeklySteps
      .slice(-7)
      .map((item) => format(item.date, 'EEE'))
      .slice(-7),
    datasets: [
      {
        data: weeklySteps.slice(-7).map((item) => item.steps),
        color: (opacity = 1) => Colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  // Prepare chart data for sleep
  const sleepChartData = {
    labels: weeklySleep
      .slice(-7)
      .map((item) => format(item.date, 'EEE'))
      .slice(-7),
    datasets: [
      {
        data: weeklySleep.slice(-7).map((item) => item.hours),
        color: (opacity = 1) => Colors.accent,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: BorderRadius.medium,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.errorText}>HealthKit is only available on iOS devices.</Text>
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.errorText}>HealthKit is not available on this device.</Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <View style={styles.permissionContainer}>
          <Ionicons name="heart-outline" size={64} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Health Data Access</Text>
          <Text style={styles.permissionDescription}>
            CoreSense needs access to your health data to provide personalized coaching insights.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
            disabled={isInitializing}
          >
            <Text style={styles.permissionButtonText}>
              {isInitializing ? 'Initializing...' : 'Grant Permissions'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const weeklyStepsAvg = calculateWeeklyAverage(weeklySteps, 'steps');
  const weeklySleepAvg = calculateWeeklyAverage(weeklySleep, 'hours');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Health Analytics</Text>
        {lastSyncedAt && (
          <Text style={styles.subtitle}>
            Last synced: {format(lastSyncedAt, 'MMM d, h:mm a')}
          </Text>
        )}
      </View>

      {/* Today's Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.statsGrid}>
          <StatTile
            icon="footsteps"
            label="Steps"
            value={todayData?.steps?.toLocaleString() || '0'}
            subtitle="Today"
          />
          <StatTile
            icon="moon"
            label="Sleep"
            value={todayData?.sleepHours ? `${todayData.sleepHours.toFixed(1)}h` : '0h'}
            subtitle="Last night"
          />
        </View>
      </View>

      {/* Weekly Averages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Averages</Text>
        <View style={styles.statsGrid}>
          <Card variant="purple" style={styles.averageCard}>
            <Ionicons name="trending-up" size={24} color={Colors.textPrimary} />
            <Text style={styles.averageValue}>{weeklyStepsAvg.toLocaleString()}</Text>
            <Text style={styles.averageLabel}>Steps/day</Text>
          </Card>
          <Card variant="purple" style={styles.averageCard}>
            <Ionicons name="moon" size={24} color={Colors.textPrimary} />
            <Text style={styles.averageValue}>{weeklySleepAvg.toFixed(1)}h</Text>
            <Text style={styles.averageLabel}>Sleep/night</Text>
          </Card>
        </View>
      </View>

      {/* Steps Chart */}
      {weeklySteps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps (Last 7 Days)</Text>
          <Card variant="purple" style={styles.chartCard}>
            <LineChart
              data={stepsChartData}
              width={chartWidth - Spacing.md * 2}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix=""
              yAxisInterval={1}
            />
          </Card>
        </View>
      )}

      {/* Sleep Chart */}
      {weeklySleep.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Duration (Last 7 Days)</Text>
          <Card variant="purple" style={styles.chartCard}>
            <LineChart
              data={sleepChartData}
              width={chartWidth - Spacing.md * 2}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisSuffix="h"
              yAxisInterval={1}
            />
          </Card>
        </View>
      )}

      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={() => user && syncToSupabase(user.id)}
        disabled={isSyncing || !user}
      >
        <Ionicons
          name={isSyncing ? 'sync' : 'cloud-upload-outline'}
          size={20}
          color={Colors.textPrimary}
        />
        <Text style={styles.syncButtonText}>
          {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  averageCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  averageValue: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  averageLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  chartCard: {
    padding: Spacing.md,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  permissionDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.medium,
  },
  permissionButtonText: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    padding: Spacing.xl,
  },
});





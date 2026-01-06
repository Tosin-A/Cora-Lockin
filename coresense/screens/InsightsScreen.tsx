/**
 * Insights Screen
 * Transform raw data into meaningful, bite-sized takeaways.
 * Includes health analytics, AI insights, and pattern recognition.
 * All data comes from real user records - no mock or placeholder data.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { WeeklySummaryCard, PatternCard, Card, StatTile } from '../components';
import { useAuthStore } from '../stores/authStore';
import { useHealthStore } from '../stores/healthStore';
import { coresenseApi, InsightsData, Pattern } from '../utils/coresenseApi';
import { format, subDays } from 'date-fns';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - Spacing.lg * 2;

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  // Health store
  const {
    isAvailable: healthAvailable,
    permissionsGranted: healthPermissionsGranted,
    isInitializing: healthInitializing,
    todayData: healthTodayData,
    weeklySteps,
    weeklySleep,
    isSyncing: healthSyncing,
    lastSyncedAt,
    initialize: initializeHealth,
    requestPermissions: requestHealthPermissions,
    refreshTodayData: refreshHealthTodayData,
    refreshWeeklyData: refreshHealthWeeklyData,
    syncToSupabase: syncHealthToSupabase,
    loadFromSupabase: loadHealthFromSupabase,
  } = useHealthStore();
  
  // Real data state
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedInsights, setSavedInsights] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [healthRefreshing, setHealthRefreshing] = useState(false);

  // Fetch real data from API (gracefully handles offline/no backend)
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      const { data, error: apiError } = await coresenseApi.getInsights();
      
      if (apiError) {
        // Silently handle API errors - app works offline
        console.log('API not available, working offline');
      } else if (data) {
        setInsightsData(data);
      }
    } catch (err: any) {
      // Silently handle network errors - app works offline
      console.log('Network error, working offline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
      if (user) {
        initializeHealth();
        loadHealthFromSupabase(user.id);
      }
    }, [fetchData, user])
  );

  // Initialize health on mount
  useEffect(() => {
    if (user) {
      initializeHealth();
      loadHealthFromSupabase(user.id);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setHealthRefreshing(true);
    try {
      await fetchData(false);
      await refreshHealthTodayData();
      await refreshHealthWeeklyData();
      if (user) {
        await syncHealthToSupabase(user.id);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
      setHealthRefreshing(false);
    }
  };

  const handleRequestHealthPermissions = async () => {
    const granted = await requestHealthPermissions();
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

  const handleSaveInsight = async (insightId: string) => {
    if (savedInsights.includes(insightId)) {
      setSavedInsights(savedInsights.filter((id) => id !== insightId));
    } else {
      setSavedInsights([...savedInsights, insightId]);
      // Call API to save
      const { success, error } = await coresenseApi.saveInsight(insightId);
      if (!success) {
        console.warn('Failed to save insight:', error);
        // Revert if failed
        setSavedInsights((prev) => prev.filter((id) => id !== insightId));
      }
    }
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sleep':
        return 'moon';
      case 'mood':
        return 'heart';
      case 'productivity':
        return 'flash';
      case 'health':
        return 'fitness';
      case 'habits':
        return 'repeat';
      default:
        return 'analytics';
    }
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

  const weeklyStepsAvg = calculateWeeklyAverage(weeklySteps, 'steps');
  const weeklySleepAvg = calculateWeeklyAverage(weeklySleep, 'hours');

  // HealthKit checks
  if (Platform.OS !== 'ios') {
    // Show insights without health data on non-iOS devices
  } else if (!healthAvailable) {
    // Show insights without health data if HealthKit not available
  } else if (!healthPermissionsGranted) {
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
            CoreSense needs access to your health data to provide personalized coaching insights and health analytics.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestHealthPermissions}
            disabled={healthInitializing}
          >
            <Text style={styles.permissionButtonText}>
              {healthInitializing ? 'Initializing...' : 'Grant Permissions'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Loading state
  if (loading && !insightsData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const hasNoData = !insightsData?.weeklySummary && 
                    (!insightsData?.patterns || insightsData.patterns.length === 0);

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
        <Text style={styles.subtitle}>Your patterns, simplified</Text>
        {lastSyncedAt && (
          <Text style={styles.subtitle}>
            Health last synced: {format(lastSyncedAt, 'MMM d, h:mm a')}
          </Text>
        )}
      </View>

      {/* Health Analytics Section - Only show if on iOS and permissions granted */}
      {Platform.OS === 'ios' && healthAvailable && healthPermissionsGranted && (
        <>
          {/* Health Header */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Analytics</Text>
            <Text style={styles.sectionSubtitle}>Your activity and sleep patterns</Text>
          </View>

          {/* Today's Health Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.statsGrid}>
              <StatTile
                icon="footsteps"
                label="Steps"
                value={healthTodayData?.steps?.toLocaleString() || '0'}
              />
              <StatTile
                icon="moon"
                label="Sleep"
                value={healthTodayData?.sleepHours ? `${healthTodayData.sleepHours.toFixed(1)}h` : '0h'}
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

          {/* Health Sync Button */}
          <TouchableOpacity
            style={[styles.syncButton, healthSyncing && styles.syncButtonDisabled]}
            onPress={() => user && syncHealthToSupabase(user.id)}
            disabled={healthSyncing || !user}
          >
            <Ionicons
              name={healthSyncing ? 'sync' : 'cloud-upload-outline'}
              size={20}
              color={Colors.textPrimary}
            />
            <Text style={styles.syncButtonText}>
              {healthSyncing ? 'Syncing...' : 'Sync Health to Cloud'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {hasNoData && !error && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyCardContent}>
            <Ionicons name="analytics-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyCardTitle}>No Insights Yet</Text>
            <Text style={styles.emptyCardText}>
              Keep using the app and chatting with your coach to unlock personalized insights.
            </Text>
          </View>
        </Card>
      )}

      {/* Weekly Summary - Real Data */}
      {insightsData?.weeklySummary && (
        <WeeklySummaryCard
          summary={insightsData.weeklySummary.summary}
          focusAreas={insightsData.weeklySummary.focusAreas}
          trend={insightsData.weeklySummary.trend as 'improving' | 'declining' | 'stable'}
          onPress={() => {}}
        />
      )}

      {/* Pattern Cards - Real Data */}
      {insightsData?.patterns && insightsData.patterns.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week's Patterns</Text>
            <TouchableOpacity>
              <Ionicons name="options-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {insightsData.patterns.map((pattern: Pattern) => (
            <PatternCard
              key={pattern.id}
              title={pattern.title}
              category={pattern.category as 'sleep' | 'mood' | 'productivity' | 'habits'}
              interpretation={pattern.interpretation}
              expandedContent={pattern.expandedContent}
              trend={pattern.trend}
              trendValue={pattern.trendValue}
              dataPoints={pattern.dataPoints || []}
              onSave={() => handleSaveInsight(pattern.id)}
            />
          ))}
        </View>
      )}

      {/* Actionable Insight - Real Data */}
      {insightsData?.actionable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What This Means for You</Text>
          <Card style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIcon}>
                <Ionicons name="bulb" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.actionLabel}>RECOMMENDATION</Text>
            </View>
            <Text style={styles.actionBody}>{insightsData.actionable.body}</Text>
            {insightsData.actionable.actionText && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>{insightsData.actionable.actionText}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            )}
          </Card>
        </View>
      )}

      {/* Saved Insights Count - Real Data */}
      {(insightsData?.savedCount || 0) > 0 && (
        <View style={styles.section}>
          <View style={styles.savedBadge}>
            <Ionicons name="bookmark" size={16} color={Colors.primary} />
            <Text style={styles.savedBadgeText}>
              {insightsData?.savedCount} insight{(insightsData?.savedCount || 0) > 1 ? 's' : ''} saved
            </Text>
          </View>
        </View>
      )}

      {/* Tip */}
      <View style={styles.tip}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
        <Text style={styles.tipText}>Hold any card to save it to your favorites</Text>
      </View>
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
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  actionLabel: {
    ...Typography.label,
    color: Colors.warning,
  },
  actionBody: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
  },
  savedBadgeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  tipText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  retryText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  emptyCardContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyCardTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  emptyCardText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Permission styles
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
  // Health section styles
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
});

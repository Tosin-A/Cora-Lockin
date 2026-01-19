 /**
 * Home Screen
 * A daily ritual landing page that reflects the coach's last communication
 * and nudges the user into meaningful interaction.
 * 
 * All data comes from real user records - no mock or placeholder data.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import {
  StatusBanner,
  LastCoachMessageCard,
  TodayInsightCard,
  Card,
} from '../components';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useHealthStore } from '../stores/healthStore';
import { coresenseApi, HomeData } from '../utils/coresenseApi';


// Key for tracking first message sent
const FIRST_MESSAGE_SENT_KEY = '@coresense_first_message_sent';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();
  const { todayData, initialize: initializeHealth, permissionsGranted } = useHealthStore();
  
  // Real data state
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Fetch real data from API with proper error handling
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const result = await coresenseApi.getHomeData();

      if (result.error) {
        // Log detailed error info for debugging
        console.log('[HomeScreen] API error:', {
          error: result.error,
          category: (result as any).errorCategory,
          isRetryable: (result as any).isRetryable,
        });

        // Only show error to user for non-network errors
        // Network errors are common during development, don't alarm user
        const errorCategory = (result as any).errorCategory;
        if (errorCategory === 'network' || errorCategory === 'timeout') {
          // Network unreachable - this is expected when backend isn't running
          console.log('[HomeScreen] Backend unavailable, app will work with cached/local data');
        } else if (errorCategory === 'auth') {
          // Auth error - might need to re-login
          console.log('[HomeScreen] Authentication error');
          setError('Please sign in again');
        } else {
          // Server error - something went wrong on the backend
          console.log('[HomeScreen] Server error');
          // Don't set error state to avoid alarming user for transient issues
        }
      } else if (result.data) {
        setHomeData(result.data);
      }
    } catch (err: any) {
      // Unexpected error (shouldn't happen with proper error handling in apiRequest)
      console.error('[HomeScreen] Unexpected error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
      initializeHealth(); // Initialize HealthKit
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(false);
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Whats good';
    if (hour < 18) return 'Long morning ahlie';
    return 'End of the day';
  };

  const firstName = profile?.username || 'there';

  const handleGoToCoachChat = () => {
    navigation.navigate('Coach' as never);
  };



  // Format timestamp for display
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Loading state
  if (loading && !homeData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Get current sleep hours from HealthKit or API
  const currentSleepHours = todayData?.sleepHours ?? homeData?.sleepHours ?? null;
  const currentSteps = todayData?.steps ?? 0;

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
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Greeting Section - Fixed sun icon positioning */}
      <Animated.View
        style={[
          styles.greetingSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greeting}>
              {getGreeting()},
            </Text>
            <Text style={styles.greeting}>
              {firstName}
            </Text>
          </View>
          <View style={styles.streakContainer}>
            <Text style={styles.streakNumber}>{homeData?.streak || 0}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
      </Animated.View>





      {/* Health Stats Row - Show HealthKit data */}
      {permissionsGranted && (currentSteps > 0 || currentSleepHours) && (
        <View style={styles.healthStatsRow}>
          {currentSteps > 0 && (
            <View style={styles.healthStat}>
              <Ionicons name="footsteps" size={18} color={Colors.primary} />
              <Text style={styles.healthStatValue}>{currentSteps.toLocaleString()}</Text>
              <Text style={styles.healthStatLabel}>steps</Text>
            </View>
          )}
          {currentSleepHours !== null && currentSleepHours > 0 && (
            <View style={styles.healthStat}>
              <Ionicons name="moon" size={18} color={Colors.accent} />
              <Text style={styles.healthStatValue}>{currentSleepHours.toFixed(1)}h</Text>
              <Text style={styles.healthStatLabel}>sleep</Text>
            </View>
          )}
        </View>
      )}

      {/* Open Messages Button - Primary CTA - NOW AT TOP */}
      <TouchableOpacity
        style={styles.messagesButton}
        onPress={handleGoToCoachChat}
        activeOpacity={0.9}
      >
        <View style={styles.messagesButtonContent}>
          <View style={styles.messagesIconContainer}>
            <Ionicons name="chatbubble" size={20} color="white" />
          </View>
          <Text style={styles.messagesButtonText}>Go to Coach Chat</Text>
        </View>
      </TouchableOpacity>

      {/* Recent Coach Messages - Make this section more enticing */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FROM YOUR COACH</Text>
        {homeData?.lastCoachMessage ? (
          <TouchableOpacity onPress={handleGoToCoachChat} activeOpacity={0.9}>
            <Card style={styles.coachMessageCard}>
              <View style={styles.coachMessageHeader}>
                <View style={styles.coachAvatar}>
                  <Ionicons name="person" size={20} color={Colors.primary} />
                </View>
                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>Cora</Text>
                  <Text style={styles.messageTime}>{formatMessageTime(homeData.lastCoachMessage.timestamp)}</Text>
                </View>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>Reply</Text>
                </View>
              </View>
              <Text style={styles.coachMessageText}>{homeData.lastCoachMessage.text}</Text>
              <View style={styles.messageHint}>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                <Text style={styles.messageHintText}>Continue conversation</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleGoToCoachChat} activeOpacity={0.9}>
            <Card style={styles.emptyCard}>
              <View style={styles.emptyCardContent}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.primary} />
                <Text style={styles.emptyCardText}>Ready to start?</Text>
                <Text style={styles.emptyCardSubtext}>Message your coach to begin your accountability journey</Text>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start Conversation</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      </View>



      {/* Today's Insight Card - Real Data */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TODAY'S INSIGHT</Text>
        {homeData?.todayInsight ? (
          <TodayInsightCard
            insight={{
              title: homeData.todayInsight.title,
              body: homeData.todayInsight.body,
              category: homeData.todayInsight.category as 'sleep' | 'mood' | 'productivity' | 'health',
              actionable: homeData.todayInsight.actionable,
            }}
            onExpand={() => {
              navigation.navigate('Insights' as never);
            }}
          />
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyCardContent}>
              <Ionicons name="bulb-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyCardText}>No insights yet</Text>
              <Text style={styles.emptyCardSubtext}>Keep using the app to unlock personalized insights</Text>
            </View>
          </Card>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
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
  greetingSection: {
    marginBottom: Spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greeting: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  streakContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  streakNumber: {
    ...Typography.h1,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 32,
  },
  streakLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  // Health stats row
  healthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
  },
  healthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  healthStatValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  healthStatLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  messagesButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Spacing.xl,
  },
  messagesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  messagesIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesButtonText: {
    ...Typography.h2,
    color: '#1C1C1E',
    fontWeight: '700',
    fontSize: 18,
  },
  emptyCard: {
    padding: Spacing.xl,
  },
  emptyCardContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCardText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyCardSubtext: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
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
  // Coach message card styles
  coachMessageCard: {
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  coachMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  messageTime: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    ...Typography.bodySmall,
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  coachMessageText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  messageHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  messageHintText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
  },
  startButtonText: {
    ...Typography.body,
    color: 'white',
    fontWeight: '600',
  },
  // Quick actions styles
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  // Coach status styles
  coachStatusSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  coachStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachAvatarStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachStatusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  coachStatusInfo: {
    flex: 1,
  },
  coachStatusName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  coachStatusText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  lastInteraction: {
    alignItems: 'flex-end',
  },
  lastInteractionText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
});

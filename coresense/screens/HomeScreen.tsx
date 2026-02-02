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
  Animated,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import {
  TodayInsightCard,
  Card,
} from '../components';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useHealthStore } from '../stores/healthStore';
import { useTodosStore } from '../stores/todosStore';
import { useInsightsStore } from '../stores/insightsStore';
import { coresenseApi, HomeData } from '../utils/coresenseApi';
import type { Todo } from '../types/todos';
import { InsightType } from '../types/insights';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();
  const { initialize: initializeHealth, syncToSupabase } = useHealthStore();
  const { fetchTodos, updateTodoStatus, getPendingTodos, createTodo } = useTodosStore();
  const { healthInsights, fetchHealthInsights } = useInsightsStore();

  // Real data state
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streak modal state
  const [streakModalVisible, setStreakModalVisible] = useState(false);

  // Add task modal state
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [streakData, setStreakData] = useState<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  }>({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });

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

  // Record daily streak
  const recordDailyStreak = useCallback(async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const result = await coresenseApi.recordStreak(timezone);
      if (result.data) {
        setStreakData({
          currentStreak: result.data.currentStreak,
          longestStreak: result.data.longestStreak,
          lastActivityDate: result.data.lastActivityDate || null,
        });
      }
    } catch (e) {
      console.log('[HomeScreen] Failed to record streak:', e);
    }
  }, []);

  // Fetch on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      // Sync HealthKit data then fetch home data
      const syncAndFetch = async () => {
        if (user) {
          try {
            await syncToSupabase(user.id);
          } catch (e) {
            console.log('[HomeScreen] HealthKit sync on focus failed:', e);
          }
          // Record daily streak (will only increment once per day)
          recordDailyStreak();
        }
        fetchData();
        fetchTodos();
        fetchHealthInsights(); // Fetch insights for Today's Insight card
      };
      syncAndFetch();
    }, [fetchData, fetchTodos, fetchHealthInsights, syncToSupabase, user, recordDailyStreak])
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Sync HealthKit data to backend first, then fetch updated home data
    if (user) {
      try {
        await syncToSupabase(user.id);
      } catch (e) {
        console.log('[HomeScreen] HealthKit sync failed:', e);
      }
    }
    fetchData(false);
  }, [fetchData, syncToSupabase, user]);

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

  // Handle adding a new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    await createTodo({
      title: newTaskTitle.trim(),
      priority: 'medium',
    });

    setNewTaskTitle('');
    setAddTaskModalVisible(false);
    fetchTodos(); // Refresh the list
  };

  // Derive today's insight from health insights if backend doesn't provide one
  const getTodayInsight = () => {
    // Use backend-provided insight if available
    if (homeData?.todayInsight) {
      return homeData.todayInsight;
    }

    // Fall back to health insights from the store
    if (!healthInsights?.has_enough_data || !healthInsights?.patterns?.length) {
      return null;
    }

    const patterns = healthInsights.patterns;

    // Dynamic selection: rotate through patterns based on day + hour
    // This ensures variety throughout the day and across days
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const hourBlock = Math.floor(now.getHours() / 6); // Changes every 6 hours (4x per day)

    // Prioritize new insights first, then rotate through all
    const newPatterns = patterns.filter(p => p.is_new);
    const seenPatterns = patterns.filter(p => !p.is_new);

    let selectedPattern;

    if (newPatterns.length > 0) {
      // Show new patterns first, rotating through them
      const newIndex = (dayOfYear + hourBlock) % newPatterns.length;
      selectedPattern = newPatterns[newIndex];
    } else if (seenPatterns.length > 0) {
      // Rotate through seen patterns
      const seenIndex = (dayOfYear + hourBlock) % seenPatterns.length;
      selectedPattern = seenPatterns[seenIndex];
    } else {
      selectedPattern = patterns[0];
    }

    if (!selectedPattern) return null;

    // Map insight type to category
    const typeToCategory: Record<string, 'sleep' | 'health' | 'productivity' | 'mood'> = {
      [InsightType.BEHAVIORAL]: 'health',
      [InsightType.PROGRESS]: 'productivity',
      [InsightType.RISK]: 'health',
    };

    // Determine category based on pattern evidence type or insight type
    let category: 'sleep' | 'health' | 'productivity' | 'mood' = 'health';
    const evidenceType = selectedPattern.evidence?.type?.toLowerCase() || '';

    if (evidenceType.includes('sleep')) {
      category = 'sleep';
    } else if (evidenceType.includes('activity') || evidenceType.includes('steps')) {
      category = 'health';
    } else if (evidenceType.includes('energy') || evidenceType.includes('productivity')) {
      category = 'productivity';
    } else {
      category = typeToCategory[selectedPattern.type as string] || 'health';
    }

    return {
      id: selectedPattern.id,
      title: selectedPattern.title,
      body: selectedPattern.coach_commentary,
      category,
      actionable: !!selectedPattern.action_steps?.length,
    };
  };

  const todayInsight = getTodayInsight();



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
      {/* Greeting Section */}
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
          <TouchableOpacity
            style={styles.streakContainer}
            onPress={() => setStreakModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.streakNumber}>
              {streakData.currentStreak || homeData?.streak || 0}
            </Text>
            <Text style={styles.streakLabel}>Streaks</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.textTertiary} style={styles.streakChevron} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* From Your Coach - Primary entry point to chat */}
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
        {todayInsight ? (
          <TodayInsightCard
            insight={{
              title: todayInsight.title,
              body: todayInsight.body,
              category: todayInsight.category as 'sleep' | 'mood' | 'productivity' | 'health',
              actionable: todayInsight.actionable,
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

      {/* Tasks Section - Always visible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>YOUR TASKS</Text>
          {getPendingTodos().length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Tasks' as never)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {getPendingTodos().length > 0 ? (
          // Show pending tasks
          getPendingTodos().slice(0, 3).map((todo: Todo) => (
            <TouchableOpacity
              key={todo.id}
              style={styles.taskCard}
              onPress={() => {
                updateTodoStatus(todo.id, 'completed');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.taskCheckbox}>
                <Ionicons name="ellipse-outline" size={22} color={Colors.textTertiary} />
              </View>
              <View style={styles.taskContent}>
                <View style={styles.taskTitleRow}>
                  <Text style={styles.taskTitle}>{todo.title}</Text>
                  {todo.created_by === 'coach' && (
                    <View style={styles.coachBadge}>
                      <Text style={styles.coachBadgeText}>Coach</Text>
                    </View>
                  )}
                </View>
                {todo.due_date && (
                  <Text style={styles.taskDueDate}>
                    Due: {new Date(todo.due_date).toLocaleDateString()}
                  </Text>
                )}
                {todo.created_by === 'coach' && todo.coach_reasoning && (
                  <Text style={styles.taskReasoning} numberOfLines={2}>
                    {todo.coach_reasoning}
                  </Text>
                )}
              </View>
              <View style={[
                styles.priorityDot,
                todo.priority === 'high' && styles.priorityHigh,
                todo.priority === 'urgent' && styles.priorityUrgent,
              ]} />
            </TouchableOpacity>
          ))
        ) : (
          // Empty state - encourage adding tasks
          <Card style={styles.emptyTasksCard}>
            <View style={styles.emptyTasksContent}>
              <Ionicons name="checkbox-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyTasksText}>No tasks yet</Text>
              <Text style={styles.emptyTasksSubtext}>Add tasks to stay on track with your goals</Text>
              <TouchableOpacity
                style={styles.addFirstTaskButton}
                onPress={() => setAddTaskModalVisible(true)}
              >
                <Ionicons name="add" size={20} color={Colors.textPrimary} />
                <Text style={styles.addFirstTaskText}>Add Your First Task</Text>
              </TouchableOpacity>
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

      {/* Add Task Modal */}
      <Modal
        visible={addTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTaskModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.addTaskModalOverlay}
        >
          <TouchableOpacity
            style={styles.addTaskModalBackdrop}
            activeOpacity={1}
            onPress={() => setAddTaskModalVisible(false)}
          />
          <View style={styles.addTaskModalContent}>
            <View style={styles.addTaskModalHeader}>
              <Text style={styles.addTaskModalTitle}>Add New Task</Text>
              <TouchableOpacity onPress={() => setAddTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.addTaskInput}
              placeholder="What do you need to do?"
              placeholderTextColor={Colors.textTertiary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddTask}
            />

            <View style={styles.addTaskModalButtons}>
              <TouchableOpacity
                style={styles.addTaskCancelButton}
                onPress={() => {
                  setNewTaskTitle('');
                  setAddTaskModalVisible(false);
                }}
              >
                <Text style={styles.addTaskCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addTaskSubmitButton,
                  !newTaskTitle.trim() && styles.addTaskSubmitButtonDisabled,
                ]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Ionicons name="add" size={20} color={Colors.textPrimary} />
                <Text style={styles.addTaskSubmitText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Streak Modal */}
      <Modal
        visible={streakModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStreakModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStreakModalVisible(false)}
        >
          <View style={styles.streakModalContent}>
            <View style={styles.streakModalHeader}>
              <Ionicons name="flame" size={32} color={Colors.primary} />
              <Text style={styles.streakModalTitle}>Your Streak</Text>
            </View>

            <View style={styles.streakStatsRow}>
              <View style={styles.streakStatItem}>
                <Text style={styles.streakStatNumber}>
                  {streakData.currentStreak || homeData?.streak || 0}
                </Text>
                <Text style={styles.streakStatLabel}>Current</Text>
              </View>
              <View style={styles.streakStatDivider} />
              <View style={styles.streakStatItem}>
                <Text style={styles.streakStatNumber}>
                  {streakData.longestStreak || 0}
                </Text>
                <Text style={styles.streakStatLabel}>Longest</Text>
              </View>
            </View>

            {streakData.lastActivityDate && (
              <View style={styles.streakLastActivity}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.streakLastActivityText}>
                  Last check-in: {new Date(streakData.lastActivityDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            <Text style={styles.streakModalDescription}>
              Open the app daily to maintain your streak. Your streak resets if you miss a day.
            </Text>

            <TouchableOpacity
              style={styles.streakModalButton}
              onPress={() => setStreakModalVisible(false)}
            >
              <Text style={styles.streakModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  streakChevron: {
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
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
  // Tasks section styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.sm,
  },
  taskCheckbox: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  taskTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  coachBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coachBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  taskDueDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  taskReasoning: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
    marginLeft: Spacing.sm,
    marginTop: 6,
  },
  priorityHigh: {
    backgroundColor: '#FFB800',
  },
  priorityUrgent: {
    backgroundColor: '#FF4444',
  },
  // Empty tasks state
  emptyTasksCard: {
    padding: Spacing.lg,
  },
  emptyTasksContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTasksText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyTasksSubtext: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  addFirstTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  addFirstTaskText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  // Add Task Modal Styles
  addTaskModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addTaskModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  addTaskModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  addTaskModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addTaskModalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  addTaskInput: {
    ...Typography.body,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  addTaskModalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  addTaskCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  addTaskCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addTaskSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  addTaskSubmitButtonDisabled: {
    backgroundColor: Colors.surfaceMedium,
  },
  addTaskSubmitText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  // Streak Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  streakModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  streakModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakModalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  streakStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    width: '100%',
  },
  streakStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakStatNumber: {
    ...Typography.h1,
    color: Colors.primary,
    fontSize: 40,
    fontWeight: '800',
  },
  streakStatLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  streakStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: Spacing.md,
  },
  streakLastActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  streakLastActivityText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  streakModalDescription: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  streakModalButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
  },
  streakModalButtonText: {
    ...Typography.body,
    color: 'white',
    fontWeight: '600',
  },
});

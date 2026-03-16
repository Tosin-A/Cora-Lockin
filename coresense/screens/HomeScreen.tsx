 /**
 * Home Screen
 * A daily ritual landing page that reflects the coach's last communication
 * and nudges the user into meaningful interaction.
 *
 * All data comes from real user records - no mock or placeholder data.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { Colors, Spacing, Typography, BorderRadius, Shadows, TouchTarget } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  TodayInsightCard,
  Card,
} from '../components';
import { QuickLogModal } from '../components/metrics';
import type { MetricInput } from '../types/metrics';
import { useMetricsStore } from '../stores/metricsStore';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useHealthStore } from '../stores/healthStore';
import { useTodosStore } from '../stores/todosStore';
import { useInsightsStore } from '../stores/insightsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coresenseApi, HomeData, WeeklyRecap } from '../utils/coresenseApi';

import WeeklyRecapCard from '../components/WeeklyRecapCard';
import type { Todo } from '../types/todos';
import { InsightType } from '../types/insights';

// Constant map - moved outside component to avoid recreation on every render
const TYPE_TO_CATEGORY: Record<string, 'sleep' | 'health' | 'productivity' | 'mood'> = {
  [InsightType.BEHAVIORAL]: 'health',
  [InsightType.PROGRESS]: 'productivity',
  [InsightType.RISK]: 'health',
};

// Greeting arrays - moved outside component to avoid recreation
const MORNING_GREETINGS = [
  "Rise and grind",
  "Morning, we move",
  "Up already? Respect",
  "Let's get after it",
];
const AFTERNOON_GREETINGS = [
  "What's good",
  "Long morning ahlie",
  "Afternoon, we locked in",
  "Energy still there",
];
const EVENING_GREETINGS = [
  "We survived the day",
  "Still focused",
  "Night grind activated",
  "Calm finish, yeah",
];

// TaskCard component for individual task items
interface TaskCardProps {
  todo: Todo;
  onComplete: (todoId: string) => void;
  onPress: (todo: Todo) => void;
  isCompleting?: boolean;
  colors: ReturnType<typeof import('../contexts/ThemeContext').useTheme>['colors'];
}

const TaskCard = ({ todo, onComplete, onPress, isCompleting = false, colors }: TaskCardProps) => {
  const isCompleted = todo.status === 'completed' || isCompleting;

  const handleComplete = useCallback(() => {
    if (!isCompleted && !isCompleting) {
      onComplete(todo.id);
    }
  }, [isCompleted, isCompleting, onComplete, todo.id]);

  const handlePress = useCallback(() => {
    if (!isCompleted && !isCompleting) {
      onPress(todo);
    }
  }, [isCompleted, isCompleting, onPress, todo]);

  return (
    <TouchableOpacity
      style={[
        taskCardStyles.taskCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isCompleted && [taskCardStyles.taskCardCompleted, { backgroundColor: colors.surfaceMedium }],
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isCompleting || isCompleted}
    >
      {/* Checkbox - completes the task */}
      <TouchableOpacity
        style={taskCardStyles.checkboxTouchArea}
        onPress={handleComplete}
        activeOpacity={0.6}
        disabled={isCompleting || isCompleted}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}
      >
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isCompleted ? colors.success : colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Task content - tapping opens detail */}
      <View style={taskCardStyles.taskContent}>
        <View style={taskCardStyles.taskTitleRow}>
          <Text
            style={[
              taskCardStyles.taskTitle,
              { color: colors.textPrimary },
              isCompleted && [taskCardStyles.taskTitleCompleted, { color: colors.textTertiary }],
            ]}
          >
            {todo.title}
          </Text>
          {todo.created_by === 'coach' && (
            <View style={[taskCardStyles.coachBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[taskCardStyles.coachBadgeText, { color: colors.primary }]}>Coach</Text>
            </View>
          )}
        </View>
        {todo.due_date && todo.created_by !== 'coach' && (
          <Text style={[taskCardStyles.taskDueDate, { color: colors.textTertiary }]}>
            Due: {new Date(todo.due_date).toLocaleDateString()}
          </Text>
        )}
        {todo.created_by === 'coach' && todo.coach_reasoning && !isCompleted && (
          <Text style={[taskCardStyles.taskReasoning, { color: colors.textSecondary }]} numberOfLines={2}>
            {todo.coach_reasoning}
          </Text>
        )}
      </View>

      <View
        style={[
          taskCardStyles.priorityDot,
          { backgroundColor: colors.textTertiary },
          todo.priority === 'high' && taskCardStyles.priorityHigh,
          todo.priority === 'urgent' && taskCardStyles.priorityUrgent,
          isCompleted && { backgroundColor: colors.success },
        ]}
      />
    </TouchableOpacity>
  );
};

// Styles for TaskCard component
const taskCardStyles = StyleSheet.create({
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
  taskCardCompleted: {
    opacity: 0.7,
    backgroundColor: Colors.surfaceMedium || Colors.surface,
  },
  checkboxTouchArea: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
    marginLeft: -Spacing.xs,
    marginTop: -Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
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
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
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
    backgroundColor: '#A78BFA', // Light purple
  },
  priorityUrgent: {
    backgroundColor: '#FF4444',
  },
  priorityDotCompleted: {
    backgroundColor: Colors.success,
  },
});

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useUserStore((s) => s.profile);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const initializeHealth = useHealthStore((s) => s.initialize);
  const syncToSupabase = useHealthStore((s) => s.syncToSupabase);
  const fetchTodos = useTodosStore((s) => s.fetchTodos);
  const updateTodoStatus = useTodosStore((s) => s.updateTodoStatus);
  const getPendingTodos = useTodosStore((s) => s.getPendingTodos);
  const getCompletedTodos = useTodosStore((s) => s.getCompletedTodos);
  const createTodo = useTodosStore((s) => s.createTodo);
  const healthInsights = useInsightsStore((s) => s.healthInsights);
  const fetchHealthInsights = useInsightsStore((s) => s.fetchHealthInsights);
  const logBatchMetrics = useMetricsStore((s) => s.logBatchMetrics);
  const hasCheckedInToday = useMetricsStore((s) => s.hasCheckedInToday);
  const loadLastCheckInDate = useMetricsStore((s) => s.loadLastCheckInDate);
  const recurringTodos = useTodosStore((s) => s.recurringTodos);
  const fetchRecurringToday = useTodosStore((s) => s.fetchRecurringToday);
  const toggleRecurringTodo = useTodosStore((s) => s.toggleRecurringTodo);
  const getRecurringIncomplete = useTodosStore((s) => s.getRecurringIncomplete);
  const getRecurringComplete = useTodosStore((s) => s.getRecurringComplete);
  const streakCelebration = useTodosStore((s) => s.streakCelebration);
  const dismissStreakCelebration = useTodosStore((s) => s.dismissStreakCelebration);

  // Weekly recap state (shown on Mondays)
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(true);

  // Real data state
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streak modal state
  const [streakModalVisible, setStreakModalVisible] = useState(false);

  // Greeting popup state - only show once per day (persisted in AsyncStorage)
  const [greetingPopupMessage, setGreetingPopupMessage] = useState<string | null>(null);
  const greetingShownRef = useRef(false);

  // Add task modal state
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);
  const [newTaskDueTime, setNewTaskDueTime] = useState<string | undefined>(undefined);

  // Quick check-in modal state
  const [showQuickLog, setShowQuickLog] = useState(false);

  // Task detail modal state
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Todo | null>(null);

  // Task completion state - track tasks being completed for visual feedback
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [streakData, setStreakData] = useState<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  }>({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Greeting text - picks a random greeting based on time of day
  const pickGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    return hour < 12 ? pick(MORNING_GREETINGS) : hour < 18 ? pick(AFTERNOON_GREETINGS) : pick(EVENING_GREETINGS);
  }, []);

  const [greeting, setGreeting] = useState(pickGreeting);

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
          category: result.errorCategory,
          isRetryable: result.isRetryable,
        });

        // Only show error to user for non-network errors
        // Network errors are common during development, don't alarm user
        const errorCategory = result.errorCategory;
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
        // Cache for instant display on next cold start
        AsyncStorage.setItem('home_data_cache', JSON.stringify(result.data)).catch(() => {});
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
      console.log('[HomeScreen] Focus effect triggered, user:', user?.id);
      if (user) {
        recordDailyStreak();
      }

      // Pick a fresh greeting each time the screen gains focus
      setGreeting(pickGreeting());

      // Greeting popup logic - only show once per day (persisted via AsyncStorage)
      if (!greetingShownRef.current) {
        greetingShownRef.current = true;
        const today = new Date().toISOString().split('T')[0];

        AsyncStorage.getItem('greeting_popup_last_shown').then((lastShown) => {
          if (lastShown === today) return; // Already shown today

          AsyncStorage.setItem('greeting_popup_last_shown', today);

          const hour = new Date().getHours();
          const streak = streakData.currentStreak || 0;

          // First ever entry (no streak + no last activity)
          if (!streakData.lastActivityDate && streak === 0) {
            setGreetingPopupMessage("Welcome in, time to Lock In.");
          }
          // Afternoon check-in nudge
          else if (!hasCheckedInToday() && hour >= 12 && hour < 20) {
            setGreetingPopupMessage("You haven't checked in yet today, sort that out yeah");
          }
          // Strong streak
          else if (streak >= 7) {
            setGreetingPopupMessage(`${streak} days on the grinf, proper consistency that.`);
          }
          // Active streak
          else if (streak > 0 && streak < 7) {
            setGreetingPopupMessage("Streak's still going, keep it moving.");
          }
        });
      }

      // Fire all data fetches in parallel — they are independent
      fetchData();
      fetchTodos();
      fetchRecurringToday();
      if (user) {
        syncToSupabase(user.id);
      }
      fetchHealthInsights();

      // Load weekly recap on Mondays
      const today = new Date();
      if (today.getDay() === 1) {
        const weekKey = `recap_dismissed_${today.getFullYear()}_${Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
        AsyncStorage.getItem(weekKey).then((val) => {
          if (!val) {
            setRecapDismissed(false);
            coresenseApi.getWeeklyRecap(7).then(({ data }) => {
              if (data) setWeeklyRecap(data);
            });
          }
        });
      }
    }, [fetchData, fetchTodos, fetchRecurringToday, fetchHealthInsights, syncToSupabase, user, recordDailyStreak, pickGreeting])
  );

  useEffect(() => {
    // Load cached home data for instant display during server cold starts
    AsyncStorage.getItem('home_data_cache').then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setHomeData((current) => current || parsed);
        } catch {}
      }
    });

    // Load check-in status on mount
    loadLastCheckInDate();

    if (user) {
      fetchProfile(user.id);
      console.log('[HomeScreen] Calling initializeHealth...');
      initializeHealth(); // Initialize HealthKit
    } else {
      console.log('[HomeScreen] No user, skipping initializeHealth');
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
  }, [user, loadLastCheckInDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setGreeting(pickGreeting());
    try {
      // Fire all refreshes in parallel
      await Promise.all([
        fetchData(false),
        user ? syncToSupabase(user.id, true) : Promise.resolve(),
        fetchHealthInsights(true),
      ]);
    } catch (e) {
      console.log('[HomeScreen] Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, fetchHealthInsights, syncToSupabase, user, pickGreeting]);

  const firstName = profile?.username || 'there';

  const handleGoToCoachChat = () => {
    navigation.navigate('Coach' as any);
  };

  // Helper functions for date options
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getNextWeekDate = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Time options for picker
  const timeOptions = [
    { label: 'Morning (9 AM)', value: '09:00' },
    { label: 'Late Morning (11 AM)', value: '11:00' },
    { label: 'Noon (12 PM)', value: '12:00' },
    { label: 'Afternoon (2 PM)', value: '14:00' },
    { label: 'Late Afternoon (4 PM)', value: '16:00' },
    { label: 'Evening (6 PM)', value: '18:00' },
    { label: 'Night (8 PM)', value: '20:00' },
  ];

  // Handle adding a new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    await createTodo({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      priority: 'medium',
      due_date: newTaskDueDate,
      due_time: newTaskDueTime,
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate(undefined);
    setNewTaskDueTime(undefined);
    setAddTaskModalVisible(false);
    navigation.navigate('Tasks' as any);
  };

  // Handle completing a task with visual feedback
  const completionTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clean up timers on unmount
  useEffect(() => {
    const timers = completionTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const handleCompleteTask = useCallback((todoId: string) => {
    setCompletingTasks(prev => new Set(prev).add(todoId));

    updateTodoStatus(todoId, 'completed').finally(() => {
      const timer = setTimeout(() => {
        setCompletingTasks(prev => {
          const next = new Set(prev);
          next.delete(todoId);
          return next;
        });
        completionTimers.current.delete(timer);
      }, 300);
      completionTimers.current.add(timer);
    });
  }, [updateTodoStatus]);

  // Handle quick log submission
  const handleQuickLogSubmit = async (metrics: MetricInput[]): Promise<boolean> => {
    return await logBatchMetrics(metrics);
  };

  // Derive today's insight from health insights - memoized to avoid recalculating every render
  const todayInsight = useMemo(() => {
    if (homeData?.todayInsight) {
      return homeData.todayInsight;
    }

    if (!healthInsights?.has_enough_data || !healthInsights?.patterns?.length) {
      return null;
    }

    const patterns = healthInsights.patterns;
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const hourBlock = Math.floor(now.getHours() / 6);

    const newPatterns = patterns.filter(p => p.is_new);
    const seenPatterns = patterns.filter(p => !p.is_new);

    let selectedPattern;
    if (newPatterns.length > 0) {
      selectedPattern = newPatterns[(dayOfYear + hourBlock) % newPatterns.length];
    } else if (seenPatterns.length > 0) {
      selectedPattern = seenPatterns[(dayOfYear + hourBlock) % seenPatterns.length];
    } else {
      selectedPattern = patterns[0];
    }

    if (!selectedPattern) return null;

    let category: 'sleep' | 'health' | 'productivity' | 'mood' = 'health';
    const evidenceType = selectedPattern.evidence?.type?.toLowerCase() || '';

    if (evidenceType.includes('sleep')) {
      category = 'sleep';
    } else if (evidenceType.includes('activity') || evidenceType.includes('steps')) {
      category = 'health';
    } else if (evidenceType.includes('energy') || evidenceType.includes('productivity')) {
      category = 'productivity';
    } else {
      category = TYPE_TO_CATEGORY[selectedPattern.type as string] || 'health';
    }

    return {
      id: selectedPattern.id,
      title: selectedPattern.title,
      body: selectedPattern.coach_commentary,
      category,
      actionable: !!selectedPattern.action_steps?.length,
    };
  }, [homeData?.todayInsight, healthInsights]);



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
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            title="Pull down to refresh"
            titleColor={colors.textTertiary}
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
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>
              {greeting} {firstName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.streakContainer}
            onPress={() => setStreakModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.streakNumber, { color: colors.primary }]}>
              {streakData.currentStreak || homeData?.streak || 0}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Streaks</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} style={styles.streakChevron} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Weekly Recap Card - Mondays only */}
      {!recapDismissed && weeklyRecap && (
        <View style={styles.section}>
          <WeeklyRecapCard
            recap={weeklyRecap}
            onPress={() => navigation.navigate('Progress' as any)}
            onDismiss={() => {
              setRecapDismissed(true);
              const today = new Date();
              const weekKey = `recap_dismissed_${today.getFullYear()}_${Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
              AsyncStorage.setItem(weekKey, 'true');
            }}
          />
        </View>
      )}

      {/* From Your Coach - Primary entry point to chat */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FROM YOUR COACH</Text>
        {homeData?.lastCoachMessage ? (
          <TouchableOpacity onPress={handleGoToCoachChat} activeOpacity={0.9}>
            <Card style={styles.coachMessageCard}>
              <View style={styles.coachMessageHeader}>
                <View style={styles.coachInfo}>
                  <Text style={[styles.coachName, { color: colors.textPrimary }]}>Cora</Text>
                  <Text style={[styles.messageTime, { color: colors.textTertiary }]}>{formatMessageTime(homeData.lastCoachMessage.timestamp)}</Text>
                </View>
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>Reply</Text>
                </View>
              </View>
              <Text style={[styles.coachMessageText, { color: colors.textPrimary }]}>{homeData.lastCoachMessage.text}</Text>
              <View style={styles.messageHint}>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                <Text style={[styles.messageHintText, { color: colors.primary }]}>Continue conversation</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleGoToCoachChat} activeOpacity={0.9}>
            <Card style={styles.emptyCard}>
              <View style={styles.emptyCardContent}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>Ready to start?</Text>
                <Text style={[styles.emptyCardSubtext, { color: colors.textTertiary }]}>Message your coach to begin your accountability journey</Text>
                <View style={[styles.startButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.startButtonText}>Start Conversation</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      </View>



      {/* Daily Check-In Card */}
      {!hasCheckedInToday() && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.checkInCard, { backgroundColor: colors.primaryMuted, borderColor: colors.borderPurple }]}
            onPress={() => setShowQuickLog(true)}
            activeOpacity={0.8}
          >
            <View style={styles.checkInCardContent}>
              <Ionicons name="pulse-outline" size={24} color={colors.primary} />
              <View style={styles.checkInCardText}>
                <Text style={[styles.checkInCardTitle, { color: colors.textPrimary }]}>Daily Check-In</Text>
                <Text style={[styles.checkInCardSubtitle, { color: colors.textSecondary }]}>
                  Log your mood, energy, and sleep
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Today's Insight Card - Real Data */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>TODAY'S INSIGHT</Text>
        {todayInsight ? (
          <TodayInsightCard
            insight={{
              title: todayInsight.title,
              body: todayInsight.body,
              category: todayInsight.category as 'sleep' | 'mood' | 'productivity' | 'health',
              actionable: todayInsight.actionable,
            }}
            onExpand={() => {
              navigation.navigate('Insights' as any);
            }}
          />
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyCardContent}>
              <Ionicons name="bulb-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No insights yet</Text>
              <Text style={[styles.emptyCardSubtext, { color: colors.textTertiary }]}>Keep using the app to unlock personalized insights</Text>
            </View>
          </Card>
        )}
      </View>

      {/* Daily Recurring Tasks Section - Always visible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DAILY HABITS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks' as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Manage</Text>
          </TouchableOpacity>
        </View>

        {recurringTodos.length > 0 ? (
          <>
            {getRecurringIncomplete().slice(0, 4).map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.habitRowHome, { borderBottomColor: colors.border }]}
                onPress={() => toggleRecurringTodo(todo.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={todo.completed_today ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={todo.completed_today ? colors.success : colors.textTertiary}
                />
                {todo.icon && (
                  <Ionicons
                    name={todo.icon as any}
                    size={18}
                    color={colors.textSecondary}
                  />
                )}
                <Text style={[styles.habitRowTitle, { color: colors.textPrimary }]}>{todo.title}</Text>
                {todo.frequency === 'weekly' && todo.weekly_completed != null ? (
                  <Text style={[styles.habitRowStreak, { color: colors.primary }]}>{todo.weekly_completed}/{todo.weekly_target ?? 7}</Text>
                ) : (todo.streak_count ?? 0) > 0 ? (
                  <Text style={[styles.habitRowStreak, { color: colors.primary }]}>{todo.streak_count}d</Text>
                ) : null}
              </TouchableOpacity>
            ))}

            {getRecurringComplete().length > 0 && getRecurringIncomplete().length === 0 && (
              <View style={styles.allHabitsDone}>
                <Ionicons name="checkmark-done" size={18} color={colors.success} />
                <Text style={[styles.allHabitsDoneText, { color: colors.success }]}>
                  All {getRecurringComplete().length} done for today
                </Text>
              </View>
            )}

            {getRecurringComplete().length > 0 && getRecurringIncomplete().length > 0 && (
              <Text style={[styles.habitCompletedCount, { color: colors.textTertiary }]}>
                {getRecurringComplete().length} completed
              </Text>
            )}
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Tasks' as any)}
            activeOpacity={0.8}
          >
            <Card style={styles.emptyCard}>
              <View style={styles.emptyCardContent}>
                <Ionicons name="repeat-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No daily habits yet</Text>
                <Text style={[styles.emptyCardSubtext, { color: colors.textTertiary }]}>Tap to go to Tasks and create a recurring habit</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      </View>

      {/* Tasks Section - Always visible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>YOUR TASKS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks' as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {getPendingTodos().length > 0 ? (
          // Show pending tasks using TaskCard component
          <>
            {getPendingTodos().slice(0, 3).map((todo: Todo) => (
              <TaskCard
                key={todo.id}
                todo={todo}
                onComplete={handleCompleteTask}
                onPress={setSelectedTaskDetail}
                isCompleting={completingTasks.has(todo.id)}
                colors={colors}
              />
            ))}
            {/* Add Task button when tasks exist */}
            <TouchableOpacity
              style={[styles.addTaskButton, { borderColor: colors.border }]}
              onPress={() => setAddTaskModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addTaskButtonText, { color: colors.primary }]}>Add Task</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Empty state - encourage adding tasks
          <Card style={styles.emptyTasksCard}>
            <View style={styles.emptyTasksContent}>
              <Ionicons name="checkbox-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyTasksText, { color: colors.textSecondary }]}>No tasks yet</Text>
              <Text style={[styles.emptyTasksSubtext, { color: colors.textTertiary }]}>Add tasks to stay on track with your goals</Text>
              <TouchableOpacity
                style={[styles.addFirstTaskButton, { backgroundColor: colors.primary }]}
                onPress={() => setAddTaskModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.addFirstTaskText, { color: '#FFFFFF' }]}>Add Your First Task</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Today's Completed Tasks Section */}
        {(() => {
          const today = new Date().toDateString();
          const todayCompleted = getCompletedTodos().filter((todo: Todo) => {
            if (!todo.completed_at) return false;
            return new Date(todo.completed_at).toDateString() === today;
          });
          const previousCompleted = getCompletedTodos().filter((todo: Todo) => {
            if (!todo.completed_at) return true; // Show if no date
            return new Date(todo.completed_at).toDateString() !== today;
          });

          return (
            <>
              {/* Today's completed */}
              {todayCompleted.length > 0 && (
                <View style={styles.completedSection}>
                  <TouchableOpacity
                    style={styles.completedHeader}
                    onPress={() => setShowCompleted(!showCompleted)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.completedHeaderLeft}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                      />
                      <Text style={[styles.completedHeaderText, { color: colors.textSecondary }]}>
                        Completed Today ({todayCompleted.length})
                      </Text>
                    </View>
                    <Ionicons
                      name={showCompleted ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>

                  {showCompleted && (
                    <View style={styles.completedList}>
                      {todayCompleted.map((todo: Todo) => (
                        <View key={todo.id} style={styles.completedTaskItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.success}
                          />
                          <Text style={[styles.completedTaskTitle, { color: colors.textTertiary }]}>{todo.title}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Link to see previous completed tasks */}
              {previousCompleted.length > 0 && (
                <TouchableOpacity
                  style={styles.viewPreviousButton}
                  onPress={() => navigation.navigate('Tasks' as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                  <Text style={[styles.viewPreviousText, { color: colors.textTertiary }]}>
                    {previousCompleted.length} completed from previous days
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </>
          );
        })()}
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData()}>
            <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Access Row */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>EXPLORE</Text>
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={[styles.quickAccessItem, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Tasks' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickAccessLabel, { color: colors.textPrimary }]}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAccessItem, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Progress' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickAccessLabel, { color: colors.textPrimary }]}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAccessItem, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Health' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickAccessLabel, { color: colors.textPrimary }]}>Health</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTaskDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTaskDetail(null)}
      >
        <TouchableOpacity
          style={styles.taskDetailBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedTaskDetail(null)}
        />
        <View style={[styles.taskDetailContent, { backgroundColor: colors.surface }]}>
          {selectedTaskDetail && (
            <>
              <View style={styles.taskDetailHeader}>
                <Text style={[styles.taskDetailHeaderTitle, { color: colors.textPrimary }]}>Task Details</Text>
                <TouchableOpacity onPress={() => setSelectedTaskDetail(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.taskDetailTitle, { color: colors.textPrimary }]}>{selectedTaskDetail.title}</Text>

              {/* Priority + Created by */}
              <View style={styles.taskDetailMeta}>
                <View style={[styles.taskDetailMetaItem, { backgroundColor: colors.surfaceMedium }]}>
                  <View style={[
                    styles.taskDetailPriorityDot,
                    selectedTaskDetail.priority === 'urgent' && { backgroundColor: '#FF4444' },
                    selectedTaskDetail.priority === 'high' && { backgroundColor: '#A78BFA' },
                    selectedTaskDetail.priority === 'medium' && { backgroundColor: colors.textTertiary },
                    selectedTaskDetail.priority === 'low' && { backgroundColor: colors.textTertiary },
                  ]} />
                  <Text style={[styles.taskDetailMetaText, { color: colors.textPrimary }]}>
                    {selectedTaskDetail.priority.charAt(0).toUpperCase() + selectedTaskDetail.priority.slice(1)} priority
                  </Text>
                </View>
                {selectedTaskDetail.created_by === 'coach' && (
                  <View style={[styles.taskDetailMetaItem, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={[styles.taskDetailMetaText, { color: colors.primary }]}>Coach suggested</Text>
                  </View>
                )}
              </View>

              {/* Due date + time */}
              {(selectedTaskDetail.due_date || selectedTaskDetail.due_time) && (
                <View style={styles.taskDetailMeta}>
                  {selectedTaskDetail.due_date && (
                    <View style={[styles.taskDetailMetaItem, { backgroundColor: colors.surfaceMedium }]}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.taskDetailMetaText, { color: colors.textPrimary }]}>
                        {new Date(selectedTaskDetail.due_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                  {selectedTaskDetail.due_time && (
                    <View style={[styles.taskDetailMetaItem, { backgroundColor: colors.surfaceMedium }]}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={[styles.taskDetailMetaText, { color: colors.textPrimary }]}>
                        {(() => {
                          const [h, m] = selectedTaskDetail.due_time!.split(':').map(Number);
                          const period = h >= 12 ? 'PM' : 'AM';
                          return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
                        })()}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Description */}
              {selectedTaskDetail.description && (
                <View style={styles.taskDetailDescSection}>
                  <Text style={[styles.taskDetailDescLabel, { color: colors.textTertiary }]}>Description</Text>
                  <Text style={[styles.taskDetailDesc, { color: colors.textSecondary }]}>
                    {selectedTaskDetail.description}
                  </Text>
                </View>
              )}

              {/* Coach reasoning */}
              {selectedTaskDetail.coach_reasoning && (
                <View style={styles.taskDetailDescSection}>
                  <Text style={[styles.taskDetailDescLabel, { color: colors.textTertiary }]}>Why this was suggested</Text>
                  <Text style={[styles.taskDetailDesc, { color: colors.textSecondary }]}>
                    {selectedTaskDetail.coach_reasoning}
                  </Text>
                </View>
              )}

              {/* Complete button */}
              {selectedTaskDetail.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.taskDetailCompleteBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleCompleteTask(selectedTaskDetail.id);
                    setSelectedTaskDetail(null);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.taskDetailCompleteBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

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
          <ScrollView style={[styles.addTaskModalContent, { backgroundColor: colors.surface }]} bounces={false}>
            <View style={styles.addTaskModalHeader}>
              <Text style={[styles.addTaskModalTitle, { color: colors.textPrimary }]}>Add New Task</Text>
              <TouchableOpacity onPress={() => setAddTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Task Title */}
            <Text style={[styles.addTaskInputLabel, { color: colors.textSecondary }]}>Task</Text>
            <TextInput
              style={[styles.addTaskInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.textTertiary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            {/* Description (optional) */}
            <Text style={[styles.addTaskInputLabel, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.addTaskInput, styles.addTaskInputMultiline, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Add more details..."
              placeholderTextColor={colors.textTertiary}
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Due Date */}
            <Text style={[styles.addTaskInputLabel, { color: colors.textSecondary }]}>When should this be done?</Text>
            <View style={styles.dateOptionsRow}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  newTaskDueDate === new Date().toISOString().split('T')[0] && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setNewTaskDueDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  newTaskDueDate === getTomorrowDate() && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setNewTaskDueDate(getTomorrowDate())}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  newTaskDueDate === getNextWeekDate() && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setNewTaskDueDate(getNextWeekDate())}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>Next Week</Text>
              </TouchableOpacity>
              {newTaskDueDate && (
                <TouchableOpacity
                  style={[styles.dateOption, { borderColor: colors.error + '50' }]}
                  onPress={() => {
                    setNewTaskDueDate(undefined);
                    setNewTaskDueTime(undefined);
                  }}
                >
                  <Ionicons name="close" size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            {/* Time Picker (only show if date is selected) */}
            {newTaskDueDate && (
              <>
                <Text style={[styles.addTaskInputLabel, { color: colors.textSecondary }]}>At what time?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeOptionsScroll}>
                  <View style={styles.timeOptionsRow}>
                    {timeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.timeOption,
                          { borderColor: colors.border },
                          newTaskDueTime === option.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                        ]}
                        onPress={() => setNewTaskDueTime(option.value)}
                      >
                        <Text style={[styles.timeOptionText, { color: colors.textPrimary }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <View style={styles.addTaskModalButtons}>
              <TouchableOpacity
                style={[styles.addTaskCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                  setNewTaskDueDate(undefined);
                  setNewTaskDueTime(undefined);
                  setAddTaskModalVisible(false);
                }}
              >
                <Text style={[styles.addTaskCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addTaskSubmitButton,
                  { backgroundColor: colors.primary },
                  !newTaskTitle.trim() && [styles.addTaskSubmitButtonDisabled, { backgroundColor: colors.surfaceMedium }],
                ]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.addTaskSubmitText, { color: '#FFFFFF' }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Greeting Popup Modal */}
      <Modal
        visible={!!greetingPopupMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setGreetingPopupMessage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setGreetingPopupMessage(null)}
        >
          <View style={[styles.streakModalContent, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.streakModalTitle, { color: colors.textPrimary }]}>Heads up</Text>
            <Text style={[styles.streakModalDescription, { color: colors.textSecondary, marginTop: 8 }]}> 
              {greetingPopupMessage}
            </Text>
            <TouchableOpacity
              style={[styles.streakModalButton, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => setGreetingPopupMessage(null)}
            >
              <Text style={styles.streakModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
          <View style={[styles.streakModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.streakModalHeader}>
              <Ionicons name="flame" size={32} color={colors.primary} />
              <Text style={[styles.streakModalTitle, { color: colors.textPrimary }]}>Your Streak</Text>
            </View>

            <View style={styles.streakStatsRow}>
              <View style={styles.streakStatItem}>
                <Text style={[styles.streakStatNumber, { color: colors.primary }]}>
                  {streakData.currentStreak || homeData?.streak || 0}
                </Text>
                <Text style={[styles.streakStatLabel, { color: colors.textSecondary }]}>Current</Text>
              </View>
              <View style={[styles.streakStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.streakStatItem}>
                <Text style={[styles.streakStatNumber, { color: colors.primary }]}>
                  {streakData.longestStreak || 0}
                </Text>
                <Text style={[styles.streakStatLabel, { color: colors.textSecondary }]}>Longest</Text>
              </View>
            </View>

            {streakData.lastActivityDate && (
              <View style={styles.streakLastActivity}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.streakLastActivityText, { color: colors.textSecondary }]}>
                  Last check-in: {new Date(streakData.lastActivityDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            <Text style={[styles.streakModalDescription, { color: colors.textTertiary }]}>
              Open the app daily to maintain your streak. Your streak resets if you miss a day.
            </Text>

            <TouchableOpacity
              style={[styles.streakModalButton, { backgroundColor: colors.primary }]}
              onPress={() => setStreakModalVisible(false)}
            >
              <Text style={styles.streakModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </ScrollView>

      {/* Quick Log Modal */}
      <QuickLogModal
        visible={showQuickLog}
        onClose={() => setShowQuickLog(false)}
        onSubmit={handleQuickLogSubmit}
      />

      {/* Streak Celebration Modal */}
      <Modal
        visible={!!streakCelebration}
        transparent
        animationType="fade"
        onRequestClose={dismissStreakCelebration}
      >
        <TouchableOpacity
          style={streakModalStyles.backdrop}
          activeOpacity={1}
          onPress={dismissStreakCelebration}
        >
          <View style={[streakModalStyles.card, { backgroundColor: colors.surface }]}>
            <Text style={streakModalStyles.emoji}>
              {(streakCelebration?.streak ?? 0) >= 30 ? '🏆' : (streakCelebration?.streak ?? 0) >= 7 ? '🔥' : '⭐'}
            </Text>
            <Text style={[streakModalStyles.title, { color: colors.textPrimary }]}>
              {streakCelebration?.streak}-Day Streak!
            </Text>
            <Text style={[streakModalStyles.subtitle, { color: colors.textSecondary }]}>
              {streakCelebration?.title}
            </Text>
            <Text style={[streakModalStyles.message, { color: colors.textTertiary }]}>
              {(streakCelebration?.streak ?? 0) >= 30
                ? 'Incredible consistency. You\'re unstoppable.'
                : (streakCelebration?.streak ?? 0) >= 14
                  ? 'Two weeks strong. This is becoming a real habit.'
                  : (streakCelebration?.streak ?? 0) >= 7
                    ? 'A full week! You\'re building momentum.'
                    : 'Great start! Keep it going.'}
            </Text>
            <TouchableOpacity
              style={[streakModalStyles.button, { backgroundColor: colors.primary }]}
              onPress={dismissStreakCelebration}
            >
              <Text style={streakModalStyles.buttonText}>Nice</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const streakModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  // Floating Action Button
  checkInContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    minHeight: TouchTarget.minimum,
    ...Shadows.fab,
  },
  fabText: {
    ...Typography.button,
    color: '#FFFFFF',
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
  },
  coachMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  // Completed tasks section styles
  completedSection: {
    marginTop: Spacing.md,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedHeaderText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  completedList: {
    marginTop: Spacing.xs,
  },
  completedTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  completedTaskTitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  // View previous completed tasks
  viewPreviousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  viewPreviousText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  // Add task button (when tasks exist)
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
  },
  addTaskButtonText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '500',
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
  // Task Detail Modal Styles
  taskDetailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  taskDetailContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  taskDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  taskDetailHeaderTitle: {
    ...Typography.h3,
    fontWeight: '600',
  },
  taskDetailTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  taskDetailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  taskDetailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  taskDetailMetaText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  taskDetailPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskDetailDescSection: {
    marginBottom: Spacing.md,
  },
  taskDetailDescLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  taskDetailDesc: {
    ...Typography.body,
    lineHeight: 22,
  },
  taskDetailCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },
  taskDetailCompleteBtnText: {
    ...Typography.button,
    color: '#FFFFFF',
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
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
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
  addTaskInputLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  addTaskInput: {
    ...Typography.body,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  addTaskInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  dateOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dateOptionText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  timeOptionsScroll: {
    marginBottom: Spacing.lg,
  },
  timeOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  timeOptionText: {
    ...Typography.caption,
    fontWeight: '500',
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
    lineHeight: 48,
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
  // Check-in card styles
  checkInCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  checkInCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInCardText: {
    flex: 1,
  },
  checkInCardTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  checkInCardSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  // Habits home section styles
  habitRowHome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    gap: Spacing.md,
  },
  habitRowTitle: {
    ...Typography.body,
    flex: 1,
    fontWeight: '500',
  },
  habitRowStreak: {
    ...Typography.caption,
    fontWeight: '600',
  },
  allHabitsDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  allHabitsDoneText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  habitCompletedCount: {
    ...Typography.caption,
    textAlign: 'center',
    paddingTop: Spacing.sm,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickAccessItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  quickAccessLabel: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});

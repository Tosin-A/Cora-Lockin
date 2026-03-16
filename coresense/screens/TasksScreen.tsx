/**
 * Tasks Screen
 * Two-tab view: Tasks (one-off) and Habits (recurring tasks)
 * Tasks tab: pending tasks, completed, coach suggestions
 * Habits tab: recurring tasks with toggle, streaks, icon, swipe-to-archive
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { useAuthStore } from '../stores/authStore';
import { useTodosStore } from '../stores/todosStore';
import { useChatStore } from '../stores/chatStore';
import type { Todo } from '../types/todos';
import { scheduleWithSmartGap } from '../utils/calendarService';

interface CoachSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'focus' | 'wellness' | 'habit' | 'reflection' | 'movement';
  duration?: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

// Available icons for habits
const HABIT_ICONS = [
  'checkmark-circle-outline',
  'sunny-outline',
  'moon-outline',
  'water-outline',
  'walk-outline',
  'barbell-outline',
  'book-outline',
  'document-text-outline',
  'timer-outline',
  'hourglass-outline',
  'desktop-outline',
  'notifications-off-outline',
  'nutrition-outline',
  'heart-outline',
  'body-outline',
  'list-outline',
  'flash-outline',
  'leaf-outline',
  'musical-notes-outline',
  'medkit-outline',
  'phone-portrait-outline',
  'bed-outline',
  'cafe-outline',
  'bicycle-outline',
];

type TabType = 'tasks' | 'habits';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { messages } = useChatStore();
  const {
    fetchTodos,
    fetchRecurringToday,
    updateTodoStatus,
    createTodo,
    toggleRecurringTodo,
    archiveRecurringTodo,
    getPendingTodos,
    getCompletedTodos,
    recurringTodos,
    getRecurringIncomplete,
    getRecurringComplete,
    streakCelebration,
    dismissStreakCelebration,
  } = useTodosStore();

  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [refreshing, setRefreshing] = useState(false);
  const [coachSuggestions, setCoachSuggestions] = useState<CoachSuggestion[]>([]);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [addingSuggestions, setAddingSuggestions] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addHabitModalVisible, setAddHabitModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);
  const [newTaskDueTime, setNewTaskDueTime] = useState<string | undefined>(undefined);
  const [newTaskReminderEnabled, setNewTaskReminderEnabled] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Todo | null>(null);
  const [calendaringTasks, setCalendaringTasks] = useState<Set<string>>(new Set());
  const [calendarPickerTask, setCalendarPickerTask] = useState<Todo | null>(null);
  const [calendarPickerDate, setCalendarPickerDate] = useState<string>('');

  // Add habit modal state
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('checkmark-circle-outline');
  const [newHabitFrequency, setNewHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newHabitWeeklyTarget, setNewHabitWeeklyTarget] = useState(3);

  const pendingTodos = getPendingTodos();
  const completedTodos = getCompletedTodos();

  useEffect(() => {
    if (user) {
      fetchTodos();
      fetchRecurringToday();
      generateCoachSuggestions();
    }
  }, [user]);

  const generateCoachSuggestions = useCallback(() => {
    const recentMessages = messages.slice(-10);
    const suggestions: CoachSuggestion[] = [];

    const sleepMessages = recentMessages.filter(msg =>
      msg.text.toLowerCase().includes('sleep') ||
      msg.text.toLowerCase().includes('tired') ||
      msg.text.toLowerCase().includes('rest')
    );
    if (sleepMessages.length > 0) {
      suggestions.push({
        id: 'sleep-routine',
        title: 'Evening Wind-Down Routine',
        description: 'Create a 15-minute relaxing routine before bed',
        category: 'wellness',
        duration: '15 min',
        priority: 'high',
        reason: 'Based on your recent sleep-related messages'
      });
    }

    const focusMessages = recentMessages.filter(msg =>
      msg.text.toLowerCase().includes('focus') ||
      msg.text.toLowerCase().includes('work') ||
      msg.text.toLowerCase().includes('productive')
    );
    if (focusMessages.length > 0) {
      suggestions.push({
        id: 'focus-session',
        title: 'Mini Focus Session',
        description: '25-minute focused work session with breaks',
        category: 'focus',
        duration: '25 min',
        priority: 'medium',
        reason: 'Based on your focus and productivity goals'
      });
    }

    const moodMessages = recentMessages.filter(msg =>
      msg.text.toLowerCase().includes('mood') ||
      msg.text.toLowerCase().includes('feel') ||
      msg.text.toLowerCase().includes('emotion')
    );
    if (moodMessages.length > 0) {
      suggestions.push({
        id: 'mood-check',
        title: 'Mindful Mood Check-in',
        description: 'Reflect on your current emotional state',
        category: 'reflection',
        duration: '5 min',
        priority: 'medium',
        reason: 'Helpful for emotional awareness'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push(
        {
          id: 'daily-gratitude',
          title: 'Daily Gratitude Practice',
          description: "Write down 3 things you're grateful for",
          category: 'reflection',
          duration: '5 min',
          priority: 'medium',
          reason: 'Great for overall wellbeing'
        },
        {
          id: 'hydration-reminder',
          title: 'Hydration Break',
          description: 'Drink a glass of water and stretch',
          category: 'wellness',
          duration: '2 min',
          priority: 'low',
          reason: 'Essential for daily health'
        },
        {
          id: 'movement-break',
          title: 'Quick Movement Break',
          description: 'Take a 5-minute walk or do some stretches',
          category: 'movement',
          duration: '5 min',
          priority: 'medium',
          reason: 'Keeps your body active throughout the day'
        }
      );
    }

    setCoachSuggestions(suggestions);
  }, [messages]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'tasks') {
      await fetchTodos();
      generateCoachSuggestions();
    } else {
      await fetchRecurringToday();
    }
    setRefreshing(false);
  }, [activeTab, fetchTodos, fetchRecurringToday, generateCoachSuggestions]);

  const handleCompleteTask = useCallback((todoId: string) => {
    setCompletingTasks(prev => new Set(prev).add(todoId));
    updateTodoStatus(todoId, 'completed').finally(() => {
      setTimeout(() => {
        setCompletingTasks(prev => {
          const next = new Set(prev);
          next.delete(todoId);
          return next;
        });
      }, 300);
    });
  }, [updateTodoStatus]);

  const handleAddSuggestion = useCallback(async (suggestion: CoachSuggestion) => {
    setAddingSuggestions(prev => new Set(prev).add(suggestion.id));
    await createTodo({
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
    });
    setCoachSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setAddingSuggestions(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  }, [createTodo]);

  const handleAddTaskToCalendar = useCallback(async (todo: Todo, dateOverride?: string) => {
    const targetDateStr = dateOverride || todo.due_date;
    if (!targetDateStr) {
      setCalendarPickerDate(new Date().toISOString().split('T')[0]);
      setCalendarPickerTask(todo);
      return;
    }

    setCalendaringTasks(prev => new Set(prev).add(todo.id));
    try {
      const [y, mo, d] = targetDateStr.split('-').map(Number);
      const targetDate = new Date(y, mo - 1, d);
      let durationMinutes = 60;
      const durationMatch = todo.description?.match(/(\d+)\s*min/i);
      if (durationMatch) {
        const parsed = parseInt(durationMatch[1], 10);
        if (parsed > 0 && parsed <= 480) durationMinutes = parsed;
      }
      const result = await scheduleWithSmartGap(
        todo.title,
        targetDate,
        durationMinutes,
        todo.due_time || undefined,
        todo.description || undefined
      );
      if (result.success && result.slotUsed) {
        const timeStr = result.slotUsed.start.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        Alert.alert('Added to Calendar', `"${todo.title}" scheduled for ${timeStr}`);
      } else {
        Alert.alert('Calendar Error', result.error || 'Could not add event to calendar.');
      }
    } catch {
      Alert.alert('Calendar Error', 'Something went wrong. Please try again.');
    } finally {
      setCalendaringTasks(prev => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
    }
  }, []);

  const handleCalendarPickerConfirm = useCallback(async () => {
    if (!calendarPickerTask || !calendarPickerDate) return;
    const task = calendarPickerTask;
    const date = calendarPickerDate;
    setCalendarPickerTask(null);
    await handleAddTaskToCalendar(task, date);
  }, [calendarPickerTask, calendarPickerDate, handleAddTaskToCalendar]);

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;
    await createTodo({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      priority: 'medium',
      due_date: newTaskDueDate,
      due_time: newTaskDueTime,
      reminder_enabled: newTaskReminderEnabled && !!newTaskDueDate,
      reminder_minutes_before: 30,
    });
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate(undefined);
    setNewTaskDueTime(undefined);
    setNewTaskReminderEnabled(false);
    setAddTaskModalVisible(false);
  }, [newTaskTitle, newTaskDescription, newTaskDueDate, newTaskDueTime, newTaskReminderEnabled, createTodo]);

  const handleAddHabit = useCallback(async () => {
    if (!newHabitTitle.trim()) return;
    await createTodo({
      title: newHabitTitle.trim(),
      is_recurring: true,
      frequency: newHabitFrequency,
      icon: newHabitIcon,
      priority: 'medium',
      weekly_target: newHabitFrequency === 'weekly' ? newHabitWeeklyTarget : undefined,
    });
    setNewHabitTitle('');
    setNewHabitIcon('checkmark-circle-outline');
    setNewHabitFrequency('daily');
    setNewHabitWeeklyTarget(3);
    setAddHabitModalVisible(false);
    // Refresh recurring list
    fetchRecurringToday();
  }, [newHabitTitle, newHabitIcon, newHabitFrequency, newHabitWeeklyTarget, createTodo, fetchRecurringToday]);

  const handleArchiveHabit = useCallback((todoId: string, title: string) => {
    Alert.alert(
      'Archive Habit',
      `Remove "${title}" from your daily habits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => archiveRecurringTodo(todoId),
        },
      ],
    );
  }, [archiveRecurringTodo]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const timeOptions = [
    { label: 'Morning (9:00 AM)', value: '09:00' },
    { label: 'Late Morning (11:00 AM)', value: '11:00' },
    { label: 'Noon (12:00 PM)', value: '12:00' },
    { label: 'Afternoon (2:00 PM)', value: '14:00' },
    { label: 'Late Afternoon (4:00 PM)', value: '16:00' },
    { label: 'Evening (6:00 PM)', value: '18:00' },
    { label: 'Night (8:00 PM)', value: '20:00' },
  ];

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'focus': return 'flash';
      case 'wellness': return 'heart';
      case 'habit': return 'repeat';
      case 'reflection': return 'bulb';
      case 'movement': return 'walk';
      default: return 'star';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const renderTaskItem = (todo: Todo) => {
    const isCompleting = completingTasks.has(todo.id);
    const isCompleted = todo.status === 'completed' || isCompleting;
    const isCalendaring = calendaringTasks.has(todo.id);

    return (
      <View
        key={todo.id}
        style={[
          styles.taskCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isCompleted && [styles.taskCardCompleted, { backgroundColor: colors.surfaceMedium }],
        ]}
      >
        <TouchableOpacity
          style={styles.checkboxTouchArea}
          onPress={() => !isCompleted && handleCompleteTask(todo.id)}
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

        <TouchableOpacity
          style={styles.taskContent}
          onPress={() => setSelectedTaskDetail(todo)}
          activeOpacity={0.8}
        >
          <View style={styles.taskTitleRow}>
            <Text
              style={[
                styles.taskTitle,
                { color: colors.textPrimary },
                isCompleted && [styles.taskTitleCompleted, { color: colors.textTertiary }],
              ]}
            >
              {todo.title}
            </Text>
            {todo.created_by === 'coach' && (
              <View style={[styles.coachBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.coachBadgeText, { color: colors.primary }]}>Coach</Text>
              </View>
            )}
          </View>
          {((todo.due_date && todo.created_by !== 'coach') || todo.due_time) && (
            <View style={styles.taskMetaRow}>
              {todo.due_date && todo.created_by !== 'coach' && (
                <View style={styles.taskMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                  <Text style={[styles.taskMetaText, { color: colors.textTertiary }]}>
                    {new Date(todo.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {todo.due_time && (
                <View style={styles.taskMetaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.primary} />
                  <Text style={[styles.taskMetaText, { color: colors.primary }]}>
                    {formatTime(todo.due_time)}
                  </Text>
                </View>
              )}
            </View>
          )}
          {todo.description && !isCompleted && (
            <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={1}>
              {todo.description}
            </Text>
          )}
        </TouchableOpacity>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => handleAddTaskToCalendar(todo)}
            disabled={isCalendaring}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
            activeOpacity={0.7}
          >
            {isCalendaring ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.priorityDot,
            { backgroundColor: colors.textTertiary },
            todo.priority === 'high' && styles.priorityHigh,
            todo.priority === 'urgent' && styles.priorityUrgent,
            isCompleted && { backgroundColor: colors.success },
          ]}
        />
      </View>
    );
  };

  const renderHabitItem = (todo: Todo) => {
    const isWeekly = todo.frequency === 'weekly';

    return (
      <View
        key={todo.id}
        style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={styles.checkboxTouchArea}
          onPress={() => toggleRecurringTodo(todo.id)}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}
        >
          <Ionicons
            name={todo.completed_today ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={todo.completed_today ? colors.success : colors.textTertiary}
          />
        </TouchableOpacity>

        {todo.icon && (
          <Ionicons name={todo.icon as any} size={20} color={colors.textSecondary} style={{ marginRight: Spacing.sm }} />
        )}

        <View style={styles.habitContent}>
          <Text style={[styles.habitTitle, { color: colors.textPrimary }]}>{todo.title}</Text>
          <View style={styles.habitMeta}>
            {isWeekly ? (
              <Text style={[styles.habitStreakText, { color: colors.primary }]}>
                {todo.weekly_completed ?? 0}/{todo.weekly_target ?? 7} this week
              </Text>
            ) : (todo.streak_count ?? 0) > 0 ? (
              <Text style={[styles.habitStreakText, { color: colors.primary }]}>
                {todo.streak_count}d streak
              </Text>
            ) : null}
            {(todo.longest_streak ?? 0) > 0 && (
              <Text style={[styles.habitLongestStreak, { color: colors.textTertiary }]}>
                Best: {todo.longest_streak}d
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.archiveButton}
          onPress={() => handleArchiveHabit(todo.id, todo.title)}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="archive-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSuggestionItem = (suggestion: CoachSuggestion) => {
    const isAdding = addingSuggestions.has(suggestion.id);

    return (
      <Card key={suggestion.id} style={styles.suggestionCard}>
        <View style={styles.suggestionContent}>
          <View style={[styles.suggestionIcon, { backgroundColor: colors.surfaceMedium }]}>
            <Ionicons
              name={getCategoryIcon(suggestion.category) as any}
              size={20}
              color={getPriorityColor(suggestion.priority)}
            />
          </View>

          <View style={styles.suggestionText}>
            <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>{suggestion.title}</Text>
            <Text style={[styles.suggestionDescription, { color: colors.textSecondary }]}>{suggestion.description}</Text>
            <View style={styles.suggestionMeta}>
              {suggestion.duration && (
                <View style={[styles.durationBadge, { backgroundColor: colors.surfaceMedium }]}>
                  <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                  <Text style={[styles.durationText, { color: colors.textTertiary }]}>{suggestion.duration}</Text>
                </View>
              )}
              <Text style={[styles.reasonText, { color: colors.textTertiary }]}>{suggestion.reason}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary + '15' }, isAdding && styles.addButtonDisabled]}
            onPress={() => handleAddSuggestion(suggestion)}
            disabled={isAdding}
            activeOpacity={0.7}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'habits') {
      const incomplete = getRecurringIncomplete();
      const complete = getRecurringComplete();

      return (
        <>
          {/* Active Habits */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Habits</Text>
              <Text style={[styles.taskCount, { color: colors.textTertiary }]}>
                {complete.length}/{recurringTodos.length} done
              </Text>
            </View>

            {recurringTodos.length > 0 ? (
              <>
                {incomplete.map(renderHabitItem)}
                {complete.map(renderHabitItem)}
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="repeat-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No habits yet</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textTertiary }]}>
                  Create recurring tasks to build daily habits
                </Text>
                <TouchableOpacity
                  style={[styles.addFirstTaskButton, { backgroundColor: colors.primary }]}
                  onPress={() => setAddHabitModalVisible(true)}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={[styles.addFirstTaskText, { color: '#FFFFFF' }]}>Add Habit</Text>
                </TouchableOpacity>
              </View>
            )}

            {recurringTodos.length > 0 && (
              <TouchableOpacity
                style={[styles.addTaskButton, { borderColor: colors.border }]}
                onPress={() => setAddHabitModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addTaskButtonText, { color: colors.primary }]}>Add Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      );
    }

    // Tasks tab
    return (
      <>
        {/* Pending Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Tasks</Text>
            <Text style={[styles.taskCount, { color: colors.textTertiary }]}>{pendingTodos.length} pending</Text>
          </View>

          {pendingTodos.length > 0 ? (
            <>
              {pendingTodos.map(renderTaskItem)}
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
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="checkbox-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No pending tasks</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textTertiary }]}>
                Add a task or pick from coach suggestions below
              </Text>
              <TouchableOpacity
                style={[styles.addFirstTaskButton, { backgroundColor: colors.primary }]}
                onPress={() => setAddTaskModalVisible(true)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.addFirstTaskText, { color: '#FFFFFF' }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Completed Tasks Section */}
        {completedTodos.length > 0 && (() => {
          const today = new Date().toDateString();
          const todayCompleted = completedTodos.filter((todo) => {
            if (!todo.completed_at) return false;
            return new Date(todo.completed_at).toDateString() === today;
          });
          const previousCompleted = completedTodos.filter((todo) => {
            if (!todo.completed_at) return true;
            return new Date(todo.completed_at).toDateString() !== today;
          });
          const groupedPrevious: { [date: string]: Todo[] } = {};
          previousCompleted.forEach((todo) => {
            const dateKey = todo.completed_at
              ? new Date(todo.completed_at).toLocaleDateString()
              : 'Unknown';
            if (!groupedPrevious[dateKey]) groupedPrevious[dateKey] = [];
            groupedPrevious[dateKey].push(todo);
          });

          return (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.completedHeader}
                onPress={() => setShowCompleted(!showCompleted)}
                activeOpacity={0.7}
              >
                <View style={styles.completedHeaderLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[styles.completedHeaderText, { color: colors.textSecondary }]}>
                    Completed ({completedTodos.length})
                  </Text>
                </View>
                <Ionicons
                  name={showCompleted ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {showCompleted && (
                <View style={styles.completedList}>
                  {todayCompleted.length > 0 && (
                    <View style={styles.completedGroup}>
                      <Text style={[styles.completedGroupTitle, { color: colors.textPrimary }]}>Today</Text>
                      {todayCompleted.map((todo) => (
                        <View key={todo.id} style={styles.completedTaskItem}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                          <Text style={[styles.completedTaskTitle, { color: colors.textTertiary }]}>{todo.title}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {Object.entries(groupedPrevious).map(([date, todos]) => (
                    <View key={date} style={styles.completedGroup}>
                      <Text style={[styles.completedGroupTitle, { color: colors.textPrimary }]}>{date}</Text>
                      {todos.map((todo) => (
                        <View key={todo.id} style={styles.completedTaskItem}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                          <Text style={[styles.completedTaskTitle, { color: colors.textTertiary }]}>{todo.title}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        {/* Coach Suggestions */}
        {coachSuggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Coach Suggestions</Text>
              <View style={[styles.coachBadgeLarge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.coachBadgeLargeText, { color: colors.primary }]}>AI Powered</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              Personalized tasks based on your conversations
            </Text>
            {coachSuggestions.map(renderSuggestionItem)}
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Segmented Tab */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceMedium }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && [styles.tabActive, { backgroundColor: colors.surface }]]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'tasks' ? 'list' : 'list-outline'}
            size={16}
            color={activeTab === 'tasks' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'tasks' ? colors.primary : colors.textTertiary }]}>
            Tasks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habits' && [styles.tabActive, { backgroundColor: colors.surface }]]}
          onPress={() => setActiveTab('habits')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'habits' ? 'repeat' : 'repeat-outline'}
            size={16}
            color={activeTab === 'habits' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'habits' ? colors.primary : colors.textTertiary }]}>
            Habits
          </Text>
          {recurringTodos.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tabBadgeText, { color: colors.primary }]}>{recurringTodos.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) + 80 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={addTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTaskModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddTaskModalVisible(false)}
          />
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.surface }]} bounces={false}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Task</Text>
              <TouchableOpacity onPress={() => setAddTaskModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.textTertiary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Add more details..."
              placeholderTextColor={colors.textTertiary}
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>When should this be done?</Text>
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

            {newTaskDueDate && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>At what time?</Text>
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                  setNewTaskDueDate(undefined);
                  setNewTaskDueTime(undefined);
                  setAddTaskModalVisible(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: colors.primary },
                  !newTaskTitle.trim() && [styles.modalSubmitButtonDisabled, { backgroundColor: colors.surfaceMedium }],
                ]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.modalSubmitText, { color: '#FFFFFF' }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Habit Modal */}
      <Modal
        visible={addHabitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddHabitModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddHabitModalVisible(false)}
          />
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.surface }]} bounces={false}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Habit</Text>
              <TouchableOpacity onPress={() => setAddHabitModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>What habit do you want to build?</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Read for 15 minutes"
              placeholderTextColor={colors.textTertiary}
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
              autoFocus
            />

            {/* Frequency */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Frequency</Text>
            <View style={styles.dateOptionsRow}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  newHabitFrequency === 'daily' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setNewHabitFrequency('daily')}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  newHabitFrequency === 'weekly' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setNewHabitFrequency('weekly')}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>Weekly</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly target */}
            {newHabitFrequency === 'weekly' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Times per week</Text>
                <View style={styles.dateOptionsRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.weeklyTargetOption,
                        { borderColor: colors.border },
                        newHabitWeeklyTarget === n && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                      ]}
                      onPress={() => setNewHabitWeeklyTarget(n)}
                    >
                      <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Icon picker */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Icon</Text>
            <View style={styles.iconGrid}>
              {HABIT_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    { borderColor: colors.border },
                    newHabitIcon === icon && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => setNewHabitIcon(icon)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon as any}
                    size={22}
                    color={newHabitIcon === icon ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setNewHabitTitle('');
                  setNewHabitIcon('checkmark-circle-outline');
                  setNewHabitFrequency('daily');
                  setAddHabitModalVisible(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: colors.primary },
                  !newHabitTitle.trim() && [styles.modalSubmitButtonDisabled, { backgroundColor: colors.surfaceMedium }],
                ]}
                onPress={handleAddHabit}
                disabled={!newHabitTitle.trim()}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.modalSubmitText, { color: '#FFFFFF' }]}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal
        visible={!!calendarPickerTask}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarPickerTask(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCalendarPickerTask(null)}
        />
        <View style={[styles.detailModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pick a Date</Text>
            <TouchableOpacity onPress={() => setCalendarPickerTask(null)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.detailSectionLabel, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
            When should "{calendarPickerTask?.title}" be scheduled?
          </Text>
          <View style={styles.dateOptionsRow}>
            {[
              { label: 'Today', value: new Date().toISOString().split('T')[0] },
              { label: 'Tomorrow', value: getTomorrowDate() },
              { label: 'Next Week', value: getNextWeekDate() },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dateOption,
                  { borderColor: colors.border },
                  calendarPickerDate === opt.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setCalendarPickerDate(opt.value)}
              >
                <Text style={[styles.dateOptionText, { color: colors.textPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.modalButtons, { marginTop: Spacing.lg }]}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={() => setCalendarPickerTask(null)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                { backgroundColor: colors.primary },
                !calendarPickerDate && [styles.modalSubmitButtonDisabled, { backgroundColor: colors.surfaceMedium }],
              ]}
              onPress={handleCalendarPickerConfirm}
              disabled={!calendarPickerDate}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.modalSubmitText, { color: '#FFFFFF' }]}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTaskDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTaskDetail(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedTaskDetail(null)}
        />
        <View style={[styles.detailModalContent, { backgroundColor: colors.surface }]}>
          {selectedTaskDetail && (
            <>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Task Details</Text>
                <TouchableOpacity onPress={() => setSelectedTaskDetail(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{selectedTaskDetail.title}</Text>

              {((selectedTaskDetail.due_date && selectedTaskDetail.created_by !== 'coach') || selectedTaskDetail.due_time) && (
                <View style={styles.detailMetaSection}>
                  {selectedTaskDetail.due_date && selectedTaskDetail.created_by !== 'coach' && (
                    <View style={[styles.detailMetaItem, { backgroundColor: colors.surfaceMedium }]}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.detailMetaText, { color: colors.textPrimary }]}>
                        {new Date(selectedTaskDetail.due_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                  {selectedTaskDetail.due_time && (
                    <View style={[styles.detailMetaItem, { backgroundColor: colors.surfaceMedium }]}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={[styles.detailMetaText, { color: colors.textPrimary }]}>
                        {formatTime(selectedTaskDetail.due_time)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedTaskDetail.description && (
                <View style={styles.detailDescriptionSection}>
                  <Text style={[styles.detailSectionLabel, { color: colors.textTertiary }]}>Description</Text>
                  <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                    {selectedTaskDetail.description}
                  </Text>
                </View>
              )}

              {selectedTaskDetail.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.completeTaskButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleCompleteTask(selectedTaskDetail.id);
                    setSelectedTaskDetail(null);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.completeTaskButtonText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Streak Celebration Modal */}
      <Modal
        visible={!!streakCelebration}
        transparent
        animationType="fade"
        onRequestClose={dismissStreakCelebration}
      >
        <TouchableOpacity
          style={streakStyles.backdrop}
          activeOpacity={1}
          onPress={dismissStreakCelebration}
        >
          <View style={[streakStyles.card, { backgroundColor: colors.surface }]}>
            <Text style={streakStyles.emoji}>
              {(streakCelebration?.streak ?? 0) >= 30 ? '🏆' : (streakCelebration?.streak ?? 0) >= 7 ? '🔥' : '⭐'}
            </Text>
            <Text style={[streakStyles.title, { color: colors.textPrimary }]}>
              {streakCelebration?.streak}-Day Streak!
            </Text>
            <Text style={[streakStyles.subtitle, { color: colors.textSecondary }]}>
              {streakCelebration?.title}
            </Text>
            <TouchableOpacity
              style={[streakStyles.button, { backgroundColor: colors.primary }]}
              onPress={dismissStreakCelebration}
            >
              <Text style={streakStyles.buttonText}>Nice</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const streakStyles = StyleSheet.create({
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
    marginBottom: Spacing.lg,
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  taskCount: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  // Task card
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
    backgroundColor: Colors.surfaceMedium,
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
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    ...Typography.caption,
    fontSize: 11,
  },
  taskDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  calendarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
    backgroundColor: '#A78BFA',
  },
  priorityUrgent: {
    backgroundColor: '#FF4444',
  },
  // Habit card
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.sm,
    minHeight: 56,
  },
  habitContent: {
    flex: 1,
  },
  habitTitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 2,
  },
  habitStreakText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  habitLongestStreak: {
    ...Typography.caption,
  },
  archiveButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add task button
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
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
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
  // Completed section
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedHeaderText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  completedList: {
    marginTop: Spacing.sm,
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
  completedGroup: {
    marginBottom: Spacing.md,
  },
  completedGroupTitle: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  // Coach suggestions
  coachBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
  },
  coachBadgeLargeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  suggestionCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 4,
  },
  suggestionDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  durationText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  reasonText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  // Icon picker
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyTargetOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  inputLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalInput: {
    ...Typography.body,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalInputMultiline: {
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
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: Colors.surfaceMedium,
  },
  modalSubmitText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  // Task Detail Modal
  detailModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  detailTitle: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  detailMetaSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  detailMetaText: {
    ...Typography.body,
    fontWeight: '500',
  },
  detailDescriptionSection: {
    marginBottom: Spacing.lg,
  },
  detailSectionLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  detailDescription: {
    ...Typography.body,
    lineHeight: 22,
  },
  completeTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
  },
  completeTaskButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
});

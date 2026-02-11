/**
 * Tasks Screen
 * Shows user's pending tasks, completed tasks, and coach suggestions
 * Users can manage their tasks and add coach suggestions to their to-do list
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

interface CoachSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'focus' | 'wellness' | 'habit' | 'reflection' | 'movement';
  duration?: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { messages } = useChatStore();
  const {
    fetchTodos,
    updateTodoStatus,
    createTodo,
    getPendingTodos,
    getCompletedTodos,
  } = useTodosStore();

  const [refreshing, setRefreshing] = useState(false);
  const [coachSuggestions, setCoachSuggestions] = useState<CoachSuggestion[]>([]);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [addingSuggestions, setAddingSuggestions] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>(undefined);
  const [newTaskDueTime, setNewTaskDueTime] = useState<string | undefined>(undefined);
  const [newTaskReminderEnabled, setNewTaskReminderEnabled] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Todo | null>(null);

  const pendingTodos = getPendingTodos();
  const completedTodos = getCompletedTodos();

  useEffect(() => {
    if (user) {
      fetchTodos();
      generateCoachSuggestions();
    }
  }, [user]);

  const generateCoachSuggestions = useCallback(() => {
    const recentMessages = messages.slice(-10);
    const suggestions: CoachSuggestion[] = [];

    // Check for sleep-related messages
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

    // Check for focus/productivity messages
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

    // Check for mood/emotion messages
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

    // Add default suggestions if no specific patterns
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
    await fetchTodos();
    generateCoachSuggestions();
    setRefreshing(false);
  }, [fetchTodos, generateCoachSuggestions]);

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

    // Remove the suggestion from the list after adding
    setCoachSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setAddingSuggestions(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  }, [createTodo]);

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

  // Format time for display (e.g., "09:00" -> "9:00 AM")
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Generate time options for picker
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
          {(todo.due_date || todo.due_time) && (
            <View style={styles.taskMetaRow}>
              {todo.due_date && (
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        {/* Completed Tasks Section - Separated by day */}
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

          // Group previous completed by date
          const groupedPrevious: { [date: string]: Todo[] } = {};
          previousCompleted.forEach((todo) => {
            const dateKey = todo.completed_at
              ? new Date(todo.completed_at).toLocaleDateString()
              : 'Unknown';
            if (!groupedPrevious[dateKey]) {
              groupedPrevious[dateKey] = [];
            }
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
                  {/* Today's completed tasks */}
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

                  {/* Previous days' completed tasks */}
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

        {/* Coach Suggestions Section */}
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

            {/* Task Title */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Task</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.textTertiary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            {/* Description (optional) */}
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

            {/* Due Date */}
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

            {/* Time Picker (only show if date is selected) */}
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

              {(selectedTaskDetail.due_date || selectedTaskDetail.due_time) && (
                <View style={styles.detailMetaSection}>
                  {selectedTaskDetail.due_date && (
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
    </View>
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
  // Task card styles
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
  taskDueDate: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  taskDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  completedDate: {
    ...Typography.caption,
    color: Colors.textPrimary,
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

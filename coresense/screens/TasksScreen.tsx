/**
 * Coach Tasks Screen
 * Coach-suggested micro-tasks based on user patterns and history
 * Users can mark them as done - no manual task creation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { coresenseApi } from '../utils/coresenseApi';

interface CoachTask {
  id: string;
  title: string;
  description: string;
  category: 'focus' | 'wellness' | 'habit' | 'reflection' | 'movement';
  duration?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
  reason: string; // Why coach suggested this
}

export default function TasksScreen() {
  const { user } = useAuthStore();
  const { messages } = useChatStore();
  
  const [coachTasks, setCoachTasks] = useState<CoachTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadCoachTasks();
    }
  }, [user]);

  const loadCoachTasks = async () => {
    try {
      setLoading(true);
      
      // Generate coach tasks based on chat history and user patterns
      const generatedTasks = await generateCoachTasks();
      setCoachTasks(generatedTasks);
    } catch (error) {
      console.error('Error loading coach tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateCoachTasks = async (): Promise<CoachTask[]> => {
    // Analyze recent chat messages to suggest relevant tasks
    const recentMessages = messages.slice(-10); // Last 10 messages
    const tasks: CoachTask[] = [];

    // Check for sleep-related messages
    const sleepMessages = recentMessages.filter(msg =>
      msg.text.toLowerCase().includes('sleep') ||
      msg.text.toLowerCase().includes('tired') ||
      msg.text.toLowerCase().includes('rest')
    );

    if (sleepMessages.length > 0) {
      tasks.push({
        id: 'sleep-routine',
        title: 'Evening Wind-Down Routine',
        description: 'Create a 15-minute relaxing routine before bed',
        category: 'wellness',
        duration: '15 min',
        priority: 'high',
        completed: false,
        createdAt: new Date().toISOString(),
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
      tasks.push({
        id: 'focus-session',
        title: 'Mini Focus Session',
        description: '25-minute focused work session with breaks',
        category: 'focus',
        duration: '25 min',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
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
      tasks.push({
        id: 'mood-check',
        title: 'Mindful Mood Check-in',
        description: 'Reflect on your current emotional state',
        category: 'reflection',
        duration: '5 min',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        reason: 'Helpful for emotional awareness'
      });
    }

    // Add some default coach suggestions if no specific patterns found
    if (tasks.length === 0) {
      tasks.push(
        {
          id: 'daily-gratitude',
          title: 'Daily Gratitude Practice',
          description: 'Write down 3 things you\'re grateful for',
          category: 'reflection',
          duration: '5 min',
          priority: 'medium',
          completed: false,
          createdAt: new Date().toISOString(),
          reason: 'Great for overall wellbeing'
        },
        {
          id: 'hydration-reminder',
          title: 'Hydration Break',
          description: 'Drink a glass of water and stretch',
          category: 'wellness',
          duration: '2 min',
          priority: 'low',
          completed: false,
          createdAt: new Date().toISOString(),
          reason: 'Essential for daily health'
        }
      );
    }

    return tasks;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCoachTasks();
  };

  const toggleTaskCompletion = (taskId: string) => {
    setCoachTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'focus':
        return 'flash';
      case 'wellness':
        return 'heart';
      case 'habit':
        return 'repeat';
      case 'reflection':
        return 'bulb';
      case 'movement':
        return 'walk';
      default:
        return 'star';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.success;
      default:
        return Colors.textSecondary;
    }
  };

  const renderTaskItem = ({ item }: { item: CoachTask }) => (
    <Card style={styles.taskItem}>
      <View style={styles.taskContent}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleTaskCompletion(item.id)}
        >
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={item.completed ? Colors.success : Colors.textSecondary}
          />
        </TouchableOpacity>
        
        <View style={styles.taskText}>
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleRow}>
              <Ionicons
                name={getCategoryIcon(item.category) as any}
                size={16}
                color={getPriorityColor(item.priority)}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.taskTitle,
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.title}
              </Text>
            </View>
            
            {item.duration && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.taskDescription}>{item.description}</Text>
          
          <View style={styles.taskFooter}>
            <View style={styles.reasonContainer}>
              <Ionicons name="information-circle-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
            
            <View style={[
              styles.priorityBadge,
              { backgroundColor: `${getPriorityColor(item.priority)}20` }
            ]}>
              <Text style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority) }
              ]}>
                {item.priority}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  const activeTasks = coachTasks.filter(task => !task.completed);
  const completedTasks = coachTasks.filter(task => task.completed);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading coach suggestions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
          <Text style={styles.title}>Coach Suggestions</Text>
          <Text style={styles.subtitle}>
            Personalized micro-tasks based on your conversations
          </Text>
        </View>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Suggestions</Text>
            <FlatList
              data={activeTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.completedTitle}>
              Completed ({completedTasks.length})
            </Text>
            {completedTasks.slice(0, 3).map((task) => (
              <View key={task.id} style={styles.completedItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.completedItemText}>{task.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {coachTasks.length === 0 && (
          <EmptyState
            icon={<Ionicons name="bulb-outline" size={64} color={Colors.textTertiary} />}
            title="No suggestions yet"
            message="Chat with your coach to get personalized task suggestions"
            actionLabel="Chat with Coach"
            onAction={() => {
              // Navigate to chat
            }}
          />
        )}
      </ScrollView>
    </View>
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
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
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
  completedTitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  completedItemText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskItem: {
    marginBottom: Spacing.md,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: Spacing.md,
  },
  taskText: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: Spacing.sm,
  },
  taskTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  taskDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  reasonText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  durationBadge: {
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  durationText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  priorityText: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});






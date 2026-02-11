/**
 * Engagement Screen
 * AI-suggested engagement actions - personalized, compact, and dynamic.
 * All data comes from real user records - no mock or placeholder data.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import {
  ActionSuggestionCard,
  CommitmentTracker,
  DidItButton,
  Card,
} from '../components';
import { useAuthStore } from '../stores/authStore';
import {
  coresenseApi,
  DailyPrompt,
  SuggestedAction,
  Commitment,
} from '../utils/coresenseApi';

export default function EngagementScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Real data state
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [totalCompletedToday, setTotalCompletedToday] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt response state
  const [promptResponse, setPromptResponse] = useState('');
  const [submittingPrompt, setSubmittingPrompt] = useState(false);

  // Fetch all data (gracefully handles offline/no backend)
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const [promptRes, actionsRes, commitmentsRes, streakRes] = await Promise.all([
        coresenseApi.getDailyPrompt(),
        coresenseApi.getSuggestedActions(),
        coresenseApi.getCommitments(),
        coresenseApi.getStreak(),
      ]);

      if (promptRes.data) {
        setDailyPrompt(promptRes.data);
        if (promptRes.data.response) {
          setPromptResponse(promptRes.data.response);
        }
      }

      if (actionsRes.data) {
        setSuggestedActions(actionsRes.data);
        // Count completed today
        const completed = actionsRes.data.filter((a) => a.completed).length;
        setTotalCompletedToday(completed);
      }

      if (commitmentsRes.data) {
        setCommitments(commitmentsRes.data);
      }

      if (streakRes.data) {
        setCurrentStreak(streakRes.data.currentStreak || 0);
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
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
  };

  const handleActionPress = (actionId: string) => {
    const action = suggestedActions.find((a) => a.id === actionId);
    Alert.alert(
      'Why this matters',
      `This ${action?.category || 'action'} is personalized based on your patterns and goals. Completing it will help build momentum.`,
      [
        { text: 'Got it', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => handleCompleteAction(actionId),
        },
      ]
    );
  };

  const handleCompleteAction = async (actionId: string) => {
    const { success, error } = await coresenseApi.completeAction(actionId);
    if (success) {
      // Update local state
      setSuggestedActions((prev) =>
        prev.map((a) =>
          a.id === actionId ? { ...a, completed: true } : a
        )
      );
      setTotalCompletedToday((prev) => prev + 1);
    } else {
      Alert.alert('Error', error || 'Failed to complete action');
    }
  };

  const handlePromptSubmit = async () => {
    if (!dailyPrompt || !promptResponse.trim()) return;

    setSubmittingPrompt(true);
    const { success, error } = await coresenseApi.answerPrompt(
      dailyPrompt.id,
      promptResponse
    );

    if (success) {
      setDailyPrompt((prev) =>
        prev
          ? { ...prev, response: promptResponse, answeredAt: new Date().toISOString() }
          : null
      );
    } else {
      Alert.alert('Error', error || 'Failed to submit response');
    }
    setSubmittingPrompt(false);
  };

  const handleDidIt = async () => {
    const { success, newTotal, streak, error } = await coresenseApi.recordDidIt();
    if (success) {
      setTotalCompletedToday(newTotal);
      setCurrentStreak(streak);
    } else {
      console.warn('Did It error:', error);
    }
  };

  const handleCommitmentCheckIn = async (commitmentId: string) => {
    Alert.alert('Check In', 'Did you complete your commitment today?', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, I did it!',
        onPress: async () => {
          const { success } = await coresenseApi.checkInCommitment(commitmentId);
          if (success) {
            setCommitments((prev) =>
              prev.filter((c) => c.id !== commitmentId)
            );
          }
        },
      },
    ]);
  };

  // Get icon for category
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

  const activeActions = suggestedActions.filter((a) => !a.completed);
  const completedActions = suggestedActions.filter((a) => a.completed);

  // Loading state
  if (loading) {
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
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Today's Focus</Text>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={16} color={Colors.warning} />
          <Text style={styles.streakText}>{currentStreak} day streak</Text>
        </View>
      </View>

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

      {/* Today's Engagement Prompt */}
      {dailyPrompt && (
        <Card style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <View style={styles.promptIcon}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.accent} />
            </View>
            <Text style={styles.promptLabel}>DAILY CHECK-IN</Text>
          </View>
          <Text style={styles.promptQuestion}>{dailyPrompt.question}</Text>
          
          {dailyPrompt.answeredAt ? (
            <View style={styles.promptAnswered}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.promptAnsweredText}>
                You answered: "{dailyPrompt.response}"
              </Text>
            </View>
          ) : (
            <View style={styles.promptInputContainer}>
              <TextInput
                style={styles.promptInput}
                placeholder="Your response..."
                placeholderTextColor={Colors.textTertiary}
                value={promptResponse}
                onChangeText={setPromptResponse}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.promptSubmitButton,
                  !promptResponse.trim() && styles.promptSubmitDisabled,
                ]}
                onPress={handlePromptSubmit}
                disabled={!promptResponse.trim() || submittingPrompt}
              >
                {submittingPrompt ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.textPrimary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      {/* Action Suggestions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested Actions</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {activeActions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsRow}
          >
            {activeActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleActionPress(action.id)}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons
                    name={getCategoryIcon(action.category) as any}
                    size={24}
                    color={Colors.accent}
                  />
                </View>
                <Text style={styles.actionTitle} numberOfLines={2}>
                  {action.title}
                </Text>
                {action.subtitle && (
                  <Text style={styles.actionSubtitle} numberOfLines={1}>
                    {action.subtitle}
                  </Text>
                )}
                {action.duration && (
                  <View style={styles.actionDuration}>
                    <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.actionDurationText}>{action.duration}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.actionCompleteButton}
                  onPress={() => handleCompleteAction(action.id)}
                >
                  <Text style={styles.actionCompleteText}>Complete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All done for now!</Text>
            <Text style={styles.emptySubtitle}>Check back later for new suggestions</Text>
          </Card>
        )}
      </View>

      {/* Commitment Tracker */}
      {commitments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Commitments</Text>
          {commitments.map((commitment) => (
            <TouchableOpacity
              key={commitment.id}
              style={styles.commitmentItem}
              onPress={() => handleCommitmentCheckIn(commitment.id)}
            >
              <View style={styles.commitmentCheckbox}>
                <Ionicons name="square-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.commitmentContent}>
                <Text style={styles.commitmentText}>{commitment.text}</Text>
                {commitment.dueDate && (
                  <Text style={styles.commitmentDue}>
                    Due: {new Date(commitment.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* "I Did It" Button */}
      <DidItButton onPress={handleDidIt} completedToday={totalCompletedToday} />

      {/* Completed Actions */}
      {completedActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.completedTitle}>
            Completed ({completedActions.length})
          </Text>
          {completedActions.slice(0, 3).map((action) => (
            <View key={action.id} style={styles.completedItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.completedItemText}>{action.title}</Text>
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  streakText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
    fontWeight: '600',
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
  refreshButton: {
    padding: Spacing.xs,
  },
  // Prompt styles
  promptCard: {
    marginBottom: Spacing.xl,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  promptLabel: {
    ...Typography.label,
    color: Colors.accent,
  },
  promptQuestion: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  promptInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  promptInput: {
    flex: 1,
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.body,
    minHeight: 44,
    maxHeight: 100,
  },
  promptSubmitButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSubmitDisabled: {
    opacity: 0.5,
  },
  promptAnswered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMedium,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
  },
  promptAnsweredText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  // Action card styles
  actionsRow: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  actionCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  actionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  actionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  actionDurationText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  actionCompleteButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    alignItems: 'center',
  },
  actionCompleteText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Commitment styles
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
  },
  commitmentCheckbox: {
    marginRight: Spacing.md,
  },
  commitmentContent: {
    flex: 1,
  },
  commitmentText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  commitmentDue: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  // Completed styles
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
  // Error and loading
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
});

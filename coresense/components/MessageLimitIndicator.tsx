/**
 * Message Limit Indicator Component
 * Shows user's message usage with visual progress bar and upgrade prompts
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useMessageLimit } from '../stores/messageLimitStore';

interface MessageLimitIndicatorProps {
  showUpgradeButton?: boolean;
  onUpgradePress?: () => void;
  compact?: boolean;
}

export const MessageLimitIndicator: React.FC<MessageLimitIndicatorProps> = ({
  showUpgradeButton = true,
  onUpgradePress,
  compact = false,
}) => {
  const {
    messagesUsed,
    messagesLimit,
    isPro,
    messagesRemaining,
    usagePercentage,
    isNearLimit,
    isAtLimit,
    progressColor,
    showUpgradePrompt,
    loading,
  } = useMessageLimit();

  // Don't show anything for Pro users in compact mode
  if (isPro && compact) {
    return null;
  }

  if (isPro) {
    return (
      <View style={[styles.proContainer, compact && styles.compactPro]}>
        <View style={styles.proContent}>
          <Ionicons name="diamond" size={16} color={Colors.primary} />
          <Text style={styles.proText}>Pro Plan - Unlimited Messages</Text>
        </View>
      </View>
    );
  }

  const getProgressBarColor = () => {
    if (isAtLimit) return Colors.error;
    if (isNearLimit) return Colors.warning;
    return progressColor;
  };

  const getStatusText = () => {
    if (isAtLimit) return 'Limit Reached';
    if (isNearLimit) return 'Near Limit';
    return 'Messages';
  };

  const getStatusColor = () => {
    if (isAtLimit) return Colors.error;
    if (isNearLimit) return Colors.warning;
    return Colors.textSecondary;
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, { borderColor: getProgressBarColor() }]}
        onPress={showUpgradeButton ? showUpgradePrompt : undefined}
        disabled={!showUpgradeButton}
      >
        <View style={styles.compactContent}>
          <Text style={[styles.compactText, { color: getStatusColor() }]}>
            {messagesUsed}/{messagesLimit}
          </Text>
          {showUpgradeButton && (
            <Ionicons 
              name={isAtLimit ? "warning" : "chevron-up"} 
              size={14} 
              color={getProgressBarColor()} 
            />
          )}
        </View>
        <View style={styles.compactProgressBar}>
          <View 
            style={[
              styles.compactProgress, 
              { 
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: getProgressBarColor()
              }
            ]} 
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, isNearLimit && styles.nearLimitContainer]}>
      <View style={styles.header}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        <Text style={styles.usageText}>
          {messagesUsed} of {messagesLimit} messages used
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progress, 
              { 
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: getProgressBarColor()
              }
            ]} 
          />
        </View>
        
        {messagesRemaining > 0 && (
          <Text style={styles.remainingText}>
            {messagesRemaining} remaining
          </Text>
        )}
      </View>

      {isNearLimit && showUpgradeButton && (
        <TouchableOpacity 
          style={[styles.upgradeButton, { borderColor: getProgressBarColor() }]}
          onPress={onUpgradePress || showUpgradePrompt}
          disabled={loading}
        >
          <Ionicons name="diamond-outline" size={16} color={getProgressBarColor()} />
          <Text style={[styles.upgradeText, { color: getProgressBarColor() }]}>
            {isAtLimit ? 'Upgrade to Continue' : 'Upgrade for Unlimited'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={getProgressBarColor()} />
        </TouchableOpacity>
      )}

      {isAtLimit && (
        <View style={styles.limitReachedContainer}>
          <Ionicons name="warning" size={16} color={Colors.error} />
          <Text style={styles.limitReachedText}>
            You've reached your free message limit. Upgrade to Pro for unlimited messages!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  nearLimitContainer: {
    backgroundColor: `${Colors.warning}10`,
    borderColor: Colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  usageText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progress: {
    height: '100%',
    borderRadius: 3,
  },
  remainingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  upgradeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: `${Colors.error}15`,
    borderRadius: BorderRadius.small,
    gap: Spacing.xs,
  },
  limitReachedText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
  // Compact styles
  compactContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  compactPro: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  compactText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  compactProgressBar: {
    height: 3,
    backgroundColor: Colors.background,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  compactProgress: {
    height: '100%',
    borderRadius: 1.5,
  },
  proContainer: {
    backgroundColor: `${Colors.primary}15`,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  compactProContainer: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  proContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  proText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});

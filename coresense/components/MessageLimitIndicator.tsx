/**
 * Message Limit Indicator Component
 * Shows user's message usage with visual progress bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useMessageLimit } from '../stores/messageLimitStore';

interface MessageLimitIndicatorProps {
  compact?: boolean;
}

export const MessageLimitIndicator: React.FC<MessageLimitIndicatorProps> = ({
  compact = false,
}) => {
  const {
    messagesUsed,
    messagesLimit,
    messagesRemaining,
    usagePercentage,
    isNearLimit,
    isAtLimit,
    progressColor,
  } = useMessageLimit();

  const getProgressBarColor = () => {
    if (isAtLimit) return Colors.error;
    if (isNearLimit) return Colors.warning;
    return progressColor;
  };

  const getStatusText = () => {
    if (isAtLimit) return 'Daily limit reached';
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
      <View style={[styles.compactContainer, { borderColor: getProgressBarColor() }]}>
        <View style={styles.compactContent}>
          <Text style={[styles.compactText, { color: getStatusColor() }]}>
            {messagesUsed}/{messagesLimit}
          </Text>
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
      </View>
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
  // Compact styles
  compactContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
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
});

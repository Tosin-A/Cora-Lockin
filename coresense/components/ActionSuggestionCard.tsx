/**
 * Action Suggestion Card
 * Individual action card with purple accent and tappable CTA
 * Uses icons instead of emojis for consistency
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { EngagementAction } from '../stores/engagementStore';

interface ActionSuggestionCardProps {
  action: EngagementAction;
  onPress: () => void;
  onComplete: () => void;
  compact?: boolean;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  focus: 'flash',
  wellness: 'heart',
  habit: 'repeat',
  reflection: 'bulb',
  movement: 'walk',
};

const categoryColors: Record<string, string> = {
  focus: Colors.warning,
  wellness: Colors.error,
  habit: Colors.info,
  reflection: Colors.accent,
  movement: Colors.success,
};

const priorityColors = {
  high: Colors.accent,
  medium: Colors.primary,
  low: Colors.surfaceLight,
};

export default function ActionSuggestionCard({
  action,
  onPress,
  onComplete,
  compact = false,
}: ActionSuggestionCardProps) {
  const iconName = categoryIcons[action.category] || 'star';
  const iconColor = categoryColors[action.category] || Colors.accent;

  if (action.completed) {
    return (
      <View style={[styles.container, styles.completedContainer]}>
        <View style={styles.completedContent}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.completedText}>{action.title}</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColors[action.priority] }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={iconName} size={18} color={iconColor} />
          </View>
          {action.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={10} color={Colors.textSecondary} />
              <Text style={styles.durationText}>{action.duration}</Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : 2}>
          {action.title}
        </Text>
        
        {!compact && action.subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {action.subtitle}
          </Text>
        )}
        
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaText}>Complete</Text>
          <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    overflow: 'hidden',
    flexDirection: 'row',
    minWidth: 200,
    marginRight: Spacing.md,
  },
  containerCompact: {
    minWidth: 160,
    maxWidth: 180,
  },
  completedContainer: {
    opacity: 0.6,
    borderColor: Colors.success,
  },
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    flex: 1,
  },
  completedText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    textDecorationLine: 'line-through',
  },
  priorityIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  durationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  titleCompact: {
    fontSize: 16,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  ctaText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
});

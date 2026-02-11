/**
 * Insight Card Component
 * Displays personalized insights in a natural, conversational format
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from './Card';

interface InsightCardProps {
  title: string;
  message: string;
  category: 'sleep' | 'activity' | 'nutrition' | 'mental' | 'hydration' | string;
  trend?: 'up' | 'down' | 'stable';
  actionText?: string;
  onActionPress?: () => void;
  onSave?: () => void;
  priority?: 'high' | 'medium' | 'low';
}

// Unified purple-based category colors
const categoryConfig = {
  sleep: {
    icon: 'moon',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
  },
  activity: {
    icon: 'walk',
    color: '#A78BFA',
    bgColor: 'rgba(167, 139, 250, 0.12)',
  },
  nutrition: {
    icon: 'nutrition',
    color: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.12)',
  },
  mental: {
    icon: 'heart',
    color: '#C084FC',
    bgColor: 'rgba(192, 132, 252, 0.12)',
  },
  hydration: {
    icon: 'water',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
  },
} as const;

export function InsightCard({
  title,
  message,
  category,
  trend,
  actionText,
  onActionPress,
  onSave,
  priority = 'medium',
}: InsightCardProps) {
  const config = categoryConfig[category as keyof typeof categoryConfig] || {
    icon: 'information-circle',
    color: Colors.primary,
    bgColor: 'rgba(139, 92, 246, 0.1)',
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend === 'up') return Colors.success;
    if (trend === 'down') return Colors.error;
    return Colors.textSecondary;
  };

  const isHighPriority = priority === 'high';

  return (
    <Card
      style={isHighPriority ? [styles.card, styles.highPriorityCard] : styles.card}
      onPress={onSave}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {trend && (
            <View style={styles.trendBadge}>
              <Ionicons
                name={getTrendIcon() as any}
                size={12}
                color={getTrendColor()}
              />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.message}>{message}</Text>

      {actionText && onActionPress && (
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: config.color }]}
          onPress={onActionPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: config.color }]}>
            {actionText}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={config.color} />
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  highPriorityCard: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
  trendBadge: {
    marginLeft: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionText: {
    ...Typography.buttonSmall,
  },
});

/**
 * Today Insight Card
 * Short, actionable insight that feels personal and timely
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface TodayInsightCardProps {
  insight: {
    title: string;
    body: string;
    category: 'sleep' | 'productivity' | 'mood' | 'habits' | 'health' | 'custom' | string;
    actionable?: boolean;
  };
  onExpand?: () => void;
  onDismiss?: () => void;
}

const categoryIcons: Record<string, string> = {
  sleep: 'moon',
  productivity: 'flash',
  mood: 'heart',
  habits: 'checkmark-circle',
  health: 'fitness',
  custom: 'bulb',
};

export default function TodayInsightCard({
  insight,
  onExpand,
  onDismiss,
}: TodayInsightCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    if (expanded && onExpand) {
      onExpand();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderPurple }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons
            name={categoryIcons[insight.category] as any}
            size={20}
            color={colors.primary}
          />
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{insight.title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
        {insight.body}
      </Text>

      {insight.actionable && (
        <View style={styles.actionContainer}>
          <Text style={[styles.actionText, { color: colors.primary }]}>Tap to see action steps</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    // Subtle purple glow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  actionText: {
    ...Typography.caption,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
});


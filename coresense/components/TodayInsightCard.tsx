/**
 * Today Insight Card
 * Short, actionable insight that feels personal and timely
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

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
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={categoryIcons[insight.category] as any}
            size={20}
            color={Colors.primary}
          />
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.body} numberOfLines={expanded ? undefined : 2}>
        {insight.body}
      </Text>
      
      {insight.actionable && (
        <View style={styles.actionContainer}>
          <Text style={styles.actionText}>Tap to see action steps</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
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


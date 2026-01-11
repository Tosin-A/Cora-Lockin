/**
 * Weekly Summary Card
 * Short text summary of the user's week with key focus areas
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface WeeklySummaryCardProps {
  summary: string;
  focusAreas: string[];
  trend?: 'improving' | 'stable' | 'declining';
  onPress?: () => void;
}

const trendConfig = {
  improving: {
    icon: 'trending-up' as const,
    color: Colors.success,
    label: 'Improving',
  },
  stable: {
    icon: 'remove' as const,
    color: Colors.warning,
    label: 'Stable',
  },
  declining: {
    icon: 'trending-down' as const,
    color: Colors.error,
    label: 'Needs attention',
  },
};

export default function WeeklySummaryCard({
  summary,
  focusAreas,
  trend = 'stable',
  onPress,
}: WeeklySummaryCardProps) {
  const trendInfo = trendConfig[trend];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerLabel}>THIS WEEK</Text>
          <View style={[styles.trendBadge, { backgroundColor: trendInfo.color }]}>
            <Ionicons name={trendInfo.icon} size={14} color={Colors.textPrimary} />
            <Text style={styles.trendText}>{trendInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.summary}>{summary}</Text>

        <View style={styles.focusRow}>
          {focusAreas.slice(0, 3).map((area, index) => (
            <View key={index} style={styles.focusTag}>
              <Text style={styles.focusTagText}>{area}</Text>
            </View>
          ))}
        </View>

        {onPress && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Tap for details</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  gradient: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLabel: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  trendText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  summary: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  focusTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  focusTagText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});






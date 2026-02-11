/**
 * MetricCard - Individual stat card for the quick stats bar
 * Displays a single metric with value, trend, and subtitle
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import type { TrendDirection } from '../../types/metrics';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number | null;
  subtitle?: string;
  trend?: TrendDirection;
  trendValue?: string;
  color: string;
  onPress?: () => void;
}

export function MetricCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  color,
  onPress,
}: MetricCardProps) {
  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend === 'up') return Colors.success;
    if (trend === 'down') return Colors.error;
    return Colors.textTertiary;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.value} numberOfLines={1}>
          {value !== null && value !== undefined ? value : '\u2014'}
        </Text>
        {trend && trendValue && (
          <View style={styles.trend}>
            <Ionicons name={getTrendIcon()} size={14} color={getTrendColor()} />
            <Text style={[styles.trendValue, { color: getTrendColor() }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>

      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 130,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    ...Typography.caption,
    marginLeft: 2,
    fontWeight: '600',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});

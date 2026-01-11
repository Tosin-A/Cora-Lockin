/**
 * StatTile Component
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  onPress,
}) => {
  const trendColor =
    trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.textSecondary;

  const content = (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Text style={[styles.trend, { color: trendColor }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card>{content}</Card>
      </TouchableOpacity>
    );
  }

  return <Card>{content}</Card>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  value: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  trendContainer: {
    marginTop: Spacing.xs,
  },
  trend: {
    ...Typography.caption,
    fontWeight: '600',
  },
});








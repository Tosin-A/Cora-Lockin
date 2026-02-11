/**
 * StatTile Component
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: string | React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  onPress?: () => void;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  subtitle,
  onPress,
}) => {
  const { colors } = useTheme();
  const trendColor =
    trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textSecondary;

  // Render icon - handle both string icon names and React nodes
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Ionicons name={icon as any} size={24} color={colors.primary} />;
    }
    return icon;
  };

  const content = (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{renderIcon()}</View>}
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
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
  subtitle: {
    ...Typography.caption,
    color: Colors.textTertiary,
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








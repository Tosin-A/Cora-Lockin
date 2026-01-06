/**
 * Pattern Card
 * Displays a pattern insight with minimal visualization and interpretation
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PatternCardProps {
  title: string;
  category: 'sleep' | 'mood' | 'productivity' | 'habits';
  interpretation: string;
  expandedContent?: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: string;
  dataPoints?: number[]; // Simple array of 7 values for week visualization
  onSave?: () => void;
}

const categoryConfig = {
  sleep: {
    icon: 'moon',
    color: '#7B68EE',
  },
  mood: {
    icon: 'heart',
    color: '#FF6B9D',
  },
  productivity: {
    icon: 'flash',
    color: '#FFD93D',
  },
  habits: {
    icon: 'checkmark-circle',
    color: '#6BCB77',
  },
};

export default function PatternCard({
  title,
  category,
  interpretation,
  expandedContent,
  trend,
  trendValue,
  dataPoints = [],
  onSave,
}: PatternCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[category];

  const handlePress = () => {
    if (expandedContent) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(!expanded);
    }
  };

  const maxPoint = Math.max(...dataPoints, 1);
  const normalizedPoints = dataPoints.map((p) => (p / maxPoint) * 100);

  const trendColor = trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.warning;
  const trendIcon = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={onSave}
      activeOpacity={0.9}
      delayLongPress={500}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon as any} size={18} color={config.color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {trendValue && (
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}20` }]}>
            <Ionicons name={trendIcon} size={12} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
          </View>
        )}
      </View>

      {/* Mini bar chart visualization */}
      {dataPoints.length > 0 && (
        <View style={styles.chartContainer}>
          {normalizedPoints.map((height, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: Math.max(height * 0.4, 4),
                  backgroundColor: index === normalizedPoints.length - 1 ? config.color : Colors.surfaceMedium,
                },
              ]}
            />
          ))}
        </View>
      )}

      <Text style={styles.interpretation}>{interpretation}</Text>

      {expanded && expandedContent && (
        <View style={styles.expandedSection}>
          <View style={styles.expandedDivider} />
          <Text style={styles.expandedContent}>{expandedContent}</Text>
        </View>
      )}

      {expandedContent && (
        <View style={styles.footer}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textTertiary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 16,
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
    marginLeft: 2,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  bar: {
    width: 28,
    borderRadius: 4,
    minHeight: 4,
  },
  interpretation: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandedSection: {
    marginTop: Spacing.sm,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  expandedContent: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});




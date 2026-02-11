/**
 * Pattern Card Component
 * Premium dark SaaS aesthetic - unified purple accent system
 * Clean, minimal, modern with subtle purple glows
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows, TouchTarget } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { InsightChart } from './InsightChart';
import {
  InsightType,
  PatternType,
  PatternTypeIcons,
} from '../../types/insights';

interface PatternCardProps {
  id: string;
  type: InsightType;
  title: string;
  coachCommentary: string;
  evidence: {
    type: PatternType;
    labels: string[];
    values: number[];
    highlight_index?: number;
    trend_direction: 'up' | 'down' | 'stable';
    trend_value?: string;
  };
  actionText?: string;
  isNew?: boolean;
  onAskCoach?: () => void;
  onHelpful?: () => void;
  onDismiss?: () => void;
}

export function PatternCard({
  id,
  type,
  title,
  coachCommentary,
  evidence,
  actionText,
  isNew = false,
  onAskCoach,
  onHelpful,
  onDismiss,
}: PatternCardProps) {
  const { colors } = useTheme();
  const patternIcon = PatternTypeIcons[evidence.type] || 'analytics-outline';

  // Use primary purple for all cards (unified color system)
  const accentColor = colors.primary;

  const getTrendIcon = () => {
    switch (evidence.trend_direction) {
      case 'up':
        return 'arrow-up';
      case 'down':
        return 'arrow-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (evidence.trend_direction) {
      case 'up':
        return type === InsightType.RISK ? colors.error : colors.success;
      case 'down':
        return type === InsightType.RISK ? colors.success : colors.primary;
      default:
        return colors.textTertiary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderPurple,
          shadowColor: colors.primary,
        }
      ]}>
        {/* Subtle purple top border */}
        <View style={[styles.typeIndicator, { backgroundColor: accentColor, opacity: 0.6 }]} />

        {/* Header: Icon + Title */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name={patternIcon as any} size={18} color={accentColor} />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{title}</Text>
              {isNew && (
                <View style={[styles.newBadge, { backgroundColor: colors.primaryMuted }]}>
                  <Text style={[styles.newBadgeText, { color: colors.primary }]}>NEW</Text>
                </View>
              )}
            </View>
            {evidence.trend_value && (
              <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}15` }]}>
                <Ionicons
                  name={getTrendIcon() as any}
                  size={12}
                  color={getTrendColor()}
                />
                <Text style={[styles.trendValue, { color: getTrendColor() }]}>
                  {evidence.trend_value}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Coach Commentary */}
        <Text style={[styles.commentary, { color: colors.textSecondary }]}>{coachCommentary}</Text>

        {/* Evidence Chart */}
        <View style={styles.chartContainer}>
          <InsightChart
            labels={evidence.labels}
            values={evidence.values}
            highlightIndex={evidence.highlight_index}
            highlightColor={accentColor}
            height={80}
          />
        </View>

        {/* Footer: Actions */}
        <View style={[styles.footer, { borderTopColor: colors.borderPurple }]}>
          {actionText && onAskCoach && (
            <TouchableOpacity
              style={styles.askCoachButton}
              onPress={onAskCoach}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={[styles.askCoachText, { color: colors.primary }]}>Ask Coach</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    padding: Spacing.lg,
    overflow: 'hidden',
    // Subtle purple glow shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  typeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
  newBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.small,
  },
  newBadgeText: {
    ...Typography.label,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.small,
    gap: 3,
  },
  trendValue: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  commentary: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  chartContainer: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderPurple,
  },
  askCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.minimum,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginLeft: -Spacing.md,
    gap: Spacing.xs,
  },
  askCoachText: {
    ...Typography.buttonSmall,
    color: Colors.primary,
  },
});

export default PatternCard;

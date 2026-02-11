/**
 * Pattern Card Component
 * Displays a single pattern insight with coach commentary and evidence chart.
 * Supports swipe gestures: right = helpful, left = dismiss.
 * Color-coded by type: behavioral (blue), progress (green), risk (amber).
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { InsightChart } from './InsightChart';
import {
  InsightType,
  PatternType,
  InsightTypeColors,
  PatternTypeIcons,
} from '../../types/insights';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

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
  const translateX = useRef(new Animated.Value(0)).current;
  const typeColor = InsightTypeColors[type];
  const patternIcon = PatternTypeIcons[evidence.type] || 'analytics-outline';

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swiped right - helpful
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onHelpful?.();
            translateX.setValue(0);
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swiped left - dismiss
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDismiss?.();
            translateX.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getTrendIcon = () => {
    switch (evidence.trend_direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (evidence.trend_direction) {
      case 'up':
        return type === InsightType.RISK ? Colors.warning : Colors.success;
      case 'down':
        return type === InsightType.RISK ? Colors.success : Colors.warning;
      default:
        return Colors.textTertiary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.card, { borderLeftColor: typeColor }]}>
        {/* Header: Icon + Title + Trend badge */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${typeColor}20` }]}>
            <Ionicons name={patternIcon as any} size={20} color={typeColor} />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            {evidence.trend_value && (
              <View style={styles.trendBadge}>
                <Ionicons
                  name={getTrendIcon() as any}
                  size={14}
                  color={getTrendColor()}
                />
                <Text style={[styles.trendValue, { color: getTrendColor() }]}>
                  {evidence.trend_value}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Coach Commentary - Large text */}
        <Text style={styles.commentary}>{coachCommentary}</Text>

        {/* Evidence Chart */}
        <InsightChart
          labels={evidence.labels}
          values={evidence.values}
          highlightIndex={evidence.highlight_index}
          highlightColor={typeColor}
          height={100}
        />

        {/* Footer: Ask Coach button */}
        <View style={styles.footer}>
          {actionText && onAskCoach && (
            <TouchableOpacity
              style={[styles.askCoachButton, { borderColor: typeColor }]}
              onPress={onAskCoach}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={16} color={typeColor} />
              <Text style={[styles.askCoachText, { color: typeColor }]}>
                Ask Coach
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.swipeHint}>
            <Ionicons name="swap-horizontal" size={14} color={Colors.textTertiary} />
            <Text style={styles.swipeHintText}>Swipe to react</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderLeftWidth: 4,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
  newBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  trendValue: {
    ...Typography.caption,
    fontWeight: '600',
  },
  commentary: {
    fontSize: 18,  // Large - second only to coach summary
    fontWeight: '500',
    fontFamily: 'Inter-Regular',
    color: Colors.textPrimary,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  askCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  askCoachText: {
    ...Typography.buttonSmall,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
});

export default PatternCard;

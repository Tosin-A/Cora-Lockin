/**
 * Wellness Score Card Component
 * Displays overall wellness score with component breakdown
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from './Card';
import { WellnessScore } from '../stores/wellnessStore';

interface WellnessScoreCardProps {
  score: WellnessScore;
  onPress?: () => void;
}

export function WellnessScoreCard({ score, onPress }: WellnessScoreCardProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return Colors.success;
    if (value >= 60) return Colors.warning;
    return Colors.error;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'trending-up';
      case 'declining':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return Colors.success;
      case 'declining':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const ScoreBar = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
    <View style={styles.scoreBar}>
      <View style={styles.scoreBarHeader}>
        <View style={styles.scoreBarLabel}>
          <Ionicons name={icon as any} size={16} color={Colors.textSecondary} />
          <Text style={styles.scoreBarLabelText}>{label}</Text>
        </View>
        <Text style={[styles.scoreBarValue, { color: getScoreColor(value) }]}>
          {Math.round(value)}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${value}%`,
              backgroundColor: getScoreColor(value),
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <Card variant="purple" style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Wellness Score</Text>
          <View style={styles.trendContainer}>
            <Ionicons
              name={getTrendIcon(score.trend) as any}
              size={16}
              color={getTrendColor(score.trend)}
            />
            <Text style={[styles.trendText, { color: getTrendColor(score.trend) }]}>
              {score.trend.charAt(0).toUpperCase() + score.trend.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.overallScore}>
          <Text style={[styles.overallScoreValue, { color: getScoreColor(score.overall) }]}>
            {Math.round(score.overall)}
          </Text>
          <Text style={styles.overallScoreLabel}>/100</Text>
        </View>
      </View>

      <View style={styles.scores}>
        <ScoreBar label="Sleep" value={score.sleep} icon="moon" />
        <ScoreBar label="Activity" value={score.activity} icon="walk" />
        <ScoreBar label="Nutrition" value={score.nutrition} icon="nutrition" />
        <ScoreBar label="Mental" value={score.mental} icon="heart" />
        <ScoreBar label="Hydration" value={score.hydration} icon="water" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendText: {
    ...Typography.bodySmall,
    textTransform: 'capitalize',
  },
  overallScore: {
    alignItems: 'flex-end',
  },
  overallScoreValue: {
    ...Typography.h1,
    fontSize: 48,
    fontWeight: 'bold',
  },
  overallScoreLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  scores: {
    gap: Spacing.md,
  },
  scoreBar: {
    marginBottom: Spacing.sm,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  scoreBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoreBarLabelText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  scoreBarValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.small,
  },
});

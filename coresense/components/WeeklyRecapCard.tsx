/**
 * Weekly Recap Card
 * Compact summary shown on HomeScreen on Mondays.
 * Dismissible per week, navigates to ProgressScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { WeeklyRecap } from '../utils/coresenseApi';

interface WeeklyRecapCardProps {
  recap: WeeklyRecap;
  onPress: () => void;
  onDismiss: () => void;
}

export default function WeeklyRecapCard({ recap, onPress, onDismiss }: WeeklyRecapCardProps) {
  const { colors } = useTheme();

  const moodVals = recap.mood_trend?.map((m) => m.value).filter(Boolean) ?? [];
  const avgMood = moodVals.length > 0 ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>LAST WEEK</Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.summary, { color: colors.textPrimary }]} numberOfLines={2}>
        {recap.coach_summary}
      </Text>

      <View style={styles.pills}>
        {recap.tasks_completed_total > 0 && (
          <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>
              {recap.tasks_completed_total} tasks
            </Text>
          </View>
        )}
        {avgMood && (
          <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>
              Mood {avgMood}
            </Text>
          </View>
        )}
        {recap.tasks_streak > 0 && (
          <View style={[styles.pill, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>
              {recap.tasks_streak}d streak
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cta}>
        <Text style={[styles.ctaText, { color: colors.primary }]}>View full progress</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    letterSpacing: 0.5,
  },
  summary: {
    ...Typography.body,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});

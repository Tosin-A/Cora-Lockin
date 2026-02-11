/**
 * Coach Commentary Component
 * Premium dark SaaS aesthetic - subtle purple accents
 * Large, readable coach insights with soft purple glow
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

interface CoachCommentaryProps {
  commentary: string;
  updatedAt?: string;
  expression?: 'happy' | 'thoughtful' | 'encouraging' | 'concerned';
}

export function CoachCommentary({
  commentary,
  updatedAt,
}: CoachCommentaryProps) {
  const { colors } = useTheme();
  const timeAgo = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
    : null;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface,
        borderColor: colors.borderPurple,
        shadowColor: colors.primary,
      }
    ]}>
      {/* Coach label */}
      <View style={styles.labelRow}>
        <View style={[styles.coachDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.label, { color: colors.textTertiary }]}>Coach Summary</Text>
      </View>

      {/* Commentary - large, readable text */}
      <Text style={[styles.commentary, { color: colors.textPrimary }]}>{commentary}</Text>

      {/* Timestamp */}
      {timeAgo && (
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{timeAgo}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    // Subtle purple glow shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  coachDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textTertiary,
  },
  commentary: {
    fontSize: 19,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
  },
});

export default CoachCommentary;

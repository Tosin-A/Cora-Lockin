/**
 * Commitment Tracker
 * Shows progress on user commitments with streak and next check-in
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { Commitment } from '../stores/engagementStore';

interface CommitmentTrackerProps {
  commitments: Commitment[];
  onCheckIn?: (commitmentId: string) => void;
  onViewAll?: () => void;
}

export default function CommitmentTracker({
  commitments,
  onCheckIn,
  onViewAll,
}: CommitmentTrackerProps) {
  const activeCommitments = commitments.filter((c) => c.isActive);

  if (activeCommitments.length === 0) {
    return null;
  }

  const primaryCommitment = activeCommitments[0];
  const otherCount = activeCommitments.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Commitments</Text>
        {otherCount > 0 && onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllText}>+{otherCount} more</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.streakSection}>
          <View style={styles.streakCircle}>
            <Ionicons name="flame" size={24} color={Colors.warning} />
            <Text style={styles.streakNumber}>{primaryCommitment.streak}</Text>
          </View>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.commitmentSection}>
          <Text style={styles.commitmentText} numberOfLines={2}>
            {primaryCommitment.text}
          </Text>
          
          {primaryCommitment.nextCheckIn && (
            <View style={styles.nextCheckIn}>
              <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.nextCheckInText}>
                Next check-in: Today
              </Text>
            </View>
          )}

          {onCheckIn && (
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={() => onCheckIn(primaryCommitment.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={18} color={Colors.textPrimary} />
              <Text style={styles.checkInButtonText}>Check In</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  viewAllText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
    padding: Spacing.lg,
  },
  streakSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: Spacing.lg,
  },
  streakCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceMedium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  streakNumber: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: -4,
  },
  streakLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  commitmentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  commitmentText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  nextCheckIn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextCheckInText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    alignSelf: 'flex-start',
  },
  checkInButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
});




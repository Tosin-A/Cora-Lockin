/**
 * DidItButton Component
 * A prominent button for users to log that they completed an action
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface DidItButtonProps {
  onPress: () => void;
  completedToday?: number;
  disabled?: boolean;
}

export default function DidItButton({
  onPress,
  completedToday = 0,
  disabled = false,
}: DidItButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={Colors.textPrimary}
        />
        <Text style={styles.text}>I Did It!</Text>
      </View>
      {completedToday > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{completedToday}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});

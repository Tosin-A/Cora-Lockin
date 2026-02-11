/**
 * ToggleSwitch Component
 */

import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textPrimary }, disabled && { color: colors.textTertiary }]}>{label}</Text>
        {description && <Text style={[styles.description, { color: colors.textSecondary }, disabled && { color: colors.textTertiary }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceMedium, true: colors.primary }}
        thumbColor={Platform.OS === 'ios' ? undefined : (value ? '#FFFFFF' : colors.textTertiary)}
        ios_backgroundColor={colors.surfaceMedium}
        disabled={disabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.textTertiary,
  },
});








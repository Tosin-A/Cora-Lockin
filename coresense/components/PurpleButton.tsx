/**
 * PurpleButton Component
 * Supports both light and dark themes
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Spacing, BorderRadius, Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface PurpleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const PurpleButton: React.FC<PurpleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}) => {
  const { colors } = useTheme();

  const dynamicStyles = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    primaryText: {
      color: '#FFFFFF',
    },
    secondaryText: {
      color: colors.primary,
    },
    textOnly: {
      color: colors.primary,
    },
    disabledText: {
      color: colors.textTertiary,
    },
  };

  const buttonStyle = [
    styles.button,
    variant === 'primary' && dynamicStyles.primary,
    variant === 'secondary' && dynamicStyles.secondary,
    variant === 'text' && styles.text,
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'primary' && dynamicStyles.primaryText,
    variant === 'secondary' && dynamicStyles.secondaryText,
    variant === 'text' && dynamicStyles.textOnly,
    disabled && dynamicStyles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.primary} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  text: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: '600',
  },
});


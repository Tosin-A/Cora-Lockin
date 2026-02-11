/**
 * Card Component
 * Supports both light and dark themes
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  padding = Spacing.lg,
  style,
}) => {
  const { colors, shadows } = useTheme();

  const dynamicStyles = {
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.borderPurple,
      ...shadows.card,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderColor: colors.borderPurple,
      shadowOpacity: 0,
      elevation: 0,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderColor: 'transparent',
      ...shadows.elevated,
    },
  };

  const cardStyle = [
    dynamicStyles.card,
    variant === 'outlined' && dynamicStyles.outlined,
    variant === 'elevated' && dynamicStyles.elevated,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

/**
 * Card Component
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'purple' | 'dark';
  onPress?: () => void;
  padding?: number;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  padding = Spacing.md,
  style,
}) => {
  const cardStyle = [
    styles.card,
    variant === 'purple' && styles.purple,
    variant === 'dark' && styles.dark,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.borderPurple,
  },
  purple: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
  },
  dark: {
    backgroundColor: Colors.surfaceMedium,
  },
});








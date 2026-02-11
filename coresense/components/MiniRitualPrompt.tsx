/**
 * Mini Ritual Prompt
 * Tiny engagement card for quick check-ins or micro-interactions
 * Uses icons instead of emojis for consistency
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface MiniRitualPromptProps {
  prompt: string;
  icon?: ReactNode;
  onTap: () => void;
  completed?: boolean;
}

export default function MiniRitualPrompt({
  prompt,
  icon,
  onTap,
  completed = false,
}: MiniRitualPromptProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!completed) {
      // Pulse animation when active
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Fade out when completed
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [completed]);

  // Don't render after fade out animation
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => setHidden(true), 300);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  if (hidden) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onTap}
        activeOpacity={0.8}
        disabled={completed}
      >
        {icon ? (
          <View style={styles.iconContainer}>{icon}</View>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons name="hand-right" size={20} color={Colors.accent} />
          </View>
        )}
        <Text style={styles.text}>{prompt}</Text>
        {completed && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={16} color={Colors.textPrimary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    minHeight: 60,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  text: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});

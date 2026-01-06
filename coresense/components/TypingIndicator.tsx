
/**
 * Simple Typing Indicator Component
 * Shows 3 jumping dots animation for the coach
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

interface TypingIndicatorProps {
  show?: boolean;
}

export default function TypingIndicator({ show = true }: TypingIndicatorProps) {
  // Create 3 animated values for the jumping dots
  const animatedValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Create a looping animation for each dot
  useEffect(() => {
    if (!show) return;

    // Create staggered animation for each dot
    const animations = animatedValues.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          // Wait for staggered delay
          Animated.delay(index * 150),
          // Jump up
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          // Fall back down
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    });

    // Start all animations
    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [show, animatedValues]);

  return (
    <View style={styles.container}>
      <View style={styles.messageBubble}>
        {animatedValues.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    maxWidth: '85%',
  },
  messageBubble: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderTopLeftRadius: BorderRadius.small,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: 4,
  },
});


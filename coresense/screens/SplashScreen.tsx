/**
 * Splash Screen - Animated Cora Logo
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';

export default function SplashScreen() {
  const { checkAuth } = useAuthStore();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bubbleScaleAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start the Cora bubble animation cycle
    startCoraAnimation();

    // Check auth status after animation starts
    setTimeout(() => {
      checkAuth();
    }, 3000);
  }, []);

  const startCoraAnimation = () => {
    // Create a repeating animation sequence
    const createAnimationSequence = () => {
      // Phase 1: Text "Cora" (2 seconds)
      const textPhase = Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      });

      // Phase 2: Transition to bubble (1 second)
      const toBubblePhase = Animated.parallel([
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 10,
          useNativeDriver: true,
        }),
      ]);

      // Phase 3: Bubble rotation (1 second)
      const bubbleRotate = Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      });

      // Phase 4: Back to text (1 second)
      const backToTextPhase = Animated.parallel([
        Animated.spring(bubbleScaleAnim, {
          toValue: 0,
          tension: 150,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      // Combine all phases
      return Animated.sequence([
        textPhase,
        toBubblePhase,
        bubbleRotate,
        backToTextPhase,
      ]);
    };

    // Start the animation and make it repeat
    const animation = createAnimationSequence();
    animation.start(() => {
      // Reset rotation and repeat
      rotationAnim.setValue(0);
      startCoraAnimation(); // Recursive call to repeat
    });
  };

  // Interpolate rotation for continuous spinning
  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: Colors.primary }]}>
      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        {/* Animated Cora Logo */}
        <View style={styles.logoContainer}>
          {/* Text Version of Cora */}
          <Animated.View style={[styles.textContainer, { opacity: textOpacityAnim }]}>
            <Text style={styles.coraText}>Cora</Text>
          </Animated.View>

          {/* Bubble Version of Cora */}
          <Animated.View 
            style={[
              styles.bubbleContainer,
              {
                transform: [
                  { scale: bubbleScaleAnim },
                  { rotate: spin },
                ],
              },
            ]}
          >
            <View style={styles.bubble}>
              <Text style={styles.coraTextBubble}>Cora</Text>
            </View>
          </Animated.View>
        </View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.subtitle}>Your Accountability Coach</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coraText: {
    ...Typography.h1,
    color: Colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },
  coraTextBubble: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 10,
  },
});


/**
 * Splash Screen - Animated Cora Logo
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Animated, Text, Easing } from "react-native";
import { Colors, Typography } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";

export default function SplashScreen() {
  const { checkAuth } = useAuthStore();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bubbleScaleAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const animationLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const authCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Track when auth check completes
  const authCompletedRef = useRef(false);
  const minSplashTimeRef = useRef(Date.now());

  const startAuthCheck = useCallback(() => {
    const startTime = Date.now();
    minSplashTimeRef.current = startTime;

    // Start authentication immediately
    checkAuth().finally(() => {
      authCompletedRef.current = true;

      // Check if minimum splash time has elapsed
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed); // Minimum 2 seconds

      if (remaining > 0) {
        setTimeout(() => {
          if (mountedRef.current) {
            // Navigation would happen here
          }
        }, remaining);
      } else if (mountedRef.current) {
        // Navigation would happen here
      }
    });
  }, [checkAuth]);

  const createAnimationSequence = useCallback(() => {
    // Phase 1: Text fade out
    const textFadeOut = Animated.timing(textOpacityAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    });

    // Phase 2: Bubble scale in
    const bubbleScaleIn = Animated.spring(bubbleScaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    });

    // Phase 3: Rotation (continuous loop)
    const rotationLoop = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Phase 4: Bubble scale out
    const bubbleScaleOut = Animated.spring(bubbleScaleAnim, {
      toValue: 0,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    });

    // Phase 5: Text fade in
    const textFadeIn = Animated.timing(textOpacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });

    return Animated.sequence([
      textFadeOut,
      Animated.parallel([bubbleScaleIn, rotationLoop]),
      bubbleScaleOut,
      textFadeIn,
    ]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

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
    const animationSequence = createAnimationSequence();
    const loopedAnimation = Animated.loop(animationSequence);
    animationLoopRef.current = loopedAnimation;
    loopedAnimation.start();

    // Start authentication immediately
    startAuthCheck();

    return () => {
      // Cleanup on unmount
      mountedRef.current = false;
      if (animationLoopRef.current) {
        animationLoopRef.current.stop();
      }
      if (authCheckRef.current) {
        clearTimeout(authCheckRef.current);
      }
    };
  }, [createAnimationSequence, startAuthCheck]);

  // Interpolate rotation for continuous spinning
  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={[styles.container, { backgroundColor: Colors.primary }]}
      accessible={true}
      accessibilityLabel="Cora Splash Screen"
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        accessible={true}
        accessibilityLabel="Cora Logo Animation"
      >
        {/* Animated Cora Logo */}
        <View style={styles.logoContainer}>
          {/* Text Version of Cora */}
          <Animated.View
            style={[styles.textContainer, { opacity: textOpacityAnim }]}
            accessible={true}
            accessibilityLabel="Cora Text Logo"
          >
            <Text style={styles.coraText}>Cora</Text>
          </Animated.View>

          {/* Bubble Version of Cora */}
          <Animated.View
            style={[
              styles.bubbleContainer,
              {
                transform: [{ scale: bubbleScaleAnim }, { rotate: spin }],
              },
            ]}
            accessible={true}
            accessibilityLabel="Cora Bubble Logo"
          >
            <View style={styles.bubble}>
              <Text style={styles.coraTextBubble}>Cora</Text>
            </View>
          </Animated.View>
        </View>

        {/* Subtitle */}
        <Animated.View
          style={{ opacity: fadeAnim }}
          accessible={true}
          accessibilityLabel="Your Accountability Coach"
        >
          <Text style={styles.subtitle}>Your Accountability Coach</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  textContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
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
    textAlign: "center",
    letterSpacing: 2,
  },
  coraTextBubble: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: "center",
    opacity: 0.8,
    marginTop: 10,
  },
});

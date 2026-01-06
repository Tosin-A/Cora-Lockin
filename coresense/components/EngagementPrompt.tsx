/**
 * Engagement Prompt
 * Today's main engagement question/directive from the coach
 * Uses icons instead of emojis for consistency
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface EngagementPromptProps {
  question: string;
  icon?: keyof typeof Ionicons.glyphMap;
  response?: string;
  answered?: boolean;
  onRespond?: (response: string) => void;
  onDismiss?: () => void;
}

export default function EngagementPrompt({
  question,
  icon = 'chatbubbles',
  response,
  answered = false,
  onRespond,
  onDismiss,
}: EngagementPromptProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [inputValue, setInputValue] = React.useState(response || '');
  const [showInput, setShowInput] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubmit = () => {
    if (inputValue.trim() && onRespond) {
      onRespond(inputValue.trim());
      setShowInput(false);
    }
  };

  if (answered && response) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.answeredContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.answeredHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.accent} />
          </View>
          <Text style={styles.answeredLabel}>You said:</Text>
        </View>
        <Text style={styles.answeredResponse}>"{response}"</Text>
        <View style={styles.answeredFooter}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.answeredFooterText}>Logged for today</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[Colors.surfaceMedium, Colors.surface]}
        style={styles.gradient}
      >
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}

        <View style={styles.promptHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={Colors.accent} />
          </View>
          <Text style={styles.label}>TODAY'S PROMPT</Text>
        </View>

        <Text style={styles.question}>{question}</Text>

        {showInput ? (
          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Your response..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={280}
              autoFocus
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !inputValue.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!inputValue.trim()}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.respondButton}
            onPress={() => setShowInput(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.respondButtonText}>Respond</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
  },
  answeredContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderColor: Colors.success,
    borderWidth: 1,
  },
  gradient: {
    padding: Spacing.lg,
  },
  dismissButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
    zIndex: 1,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.actionHighlight,
  },
  question: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    lineHeight: 32,
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    alignSelf: 'flex-start',
  },
  respondButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  inputSection: {
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  answeredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  answeredLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  answeredResponse: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  answeredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answeredFooterText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
});

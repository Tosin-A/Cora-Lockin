/**
 * Coach Commentary Component
 * Displays the AI coach's summary with avatar and subtle glow effect.
 * Commentary is the LARGEST text on screen per design spec.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, GlowEffects } from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

interface CoachCommentaryProps {
  commentary: string;
  updatedAt?: string;
  expression?: 'happy' | 'thoughtful' | 'encouraging' | 'concerned';
}

const expressionEmojis = {
  happy: '\uD83D\uDE0A',
  thoughtful: '\uD83E\uDD14',
  encouraging: '\uD83D\uDCAA',
  concerned: '\uD83E\uDEE4',
};

export function CoachCommentary({
  commentary,
  updatedAt,
  expression = 'thoughtful',
}: CoachCommentaryProps) {
  const emoji = expressionEmojis[expression];
  const timeAgo = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
    : null;

  return (
    <View style={styles.container}>
      {/* Coach Avatar with glow */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarGlow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{emoji}</Text>
          </View>
        </View>
      </View>

      {/* Commentary - LARGEST text */}
      <Text style={styles.commentary}>{commentary}</Text>

      {/* Timestamp */}
      {timeAgo && (
        <Text style={styles.timestamp}>Updated {timeAgo}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glassSurface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatarGlow: {
    ...GlowEffects.coachAvatar,
    borderRadius: 40,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  commentary: {
    fontSize: 22,  // Largest text on screen
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});

export default CoachCommentary;

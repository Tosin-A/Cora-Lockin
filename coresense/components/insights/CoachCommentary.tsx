/**
 * Coach Commentary Component
 * Displays the AI coach's summary with avatar and subtle glow effect.
 * Commentary is the LARGEST text on screen per design spec.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

interface CoachCommentaryProps {
  commentary: string;
  updatedAt?: string;
  expression?: 'happy' | 'thoughtful' | 'encouraging' | 'concerned';
}

export function CoachCommentary({
  commentary,
  updatedAt,
}: CoachCommentaryProps) {
  const timeAgo = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
    : null;

  return (
    <View style={styles.container}>
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

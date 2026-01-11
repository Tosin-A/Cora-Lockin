/**
 * Last Coach Message Card
 * Preview of most recent coach message with link to Messages app
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { formatDistanceToNow } from 'date-fns';

interface LastCoachMessageCardProps {
  messageText: string;
  timestamp?: Date;
  messageId?: string;
  onPress: () => void;
}

export default function LastCoachMessageCard({
  messageText,
  timestamp,
  onPress,
}: LastCoachMessageCardProps) {
  const formatTimestamp = (): string => {
    if (!timestamp) return '';
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} ago`;
    if (hours < 48) return 'Yesterday';
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const truncatedText = messageText.length > 120 
    ? messageText.substring(0, 120) + '...' 
    : messageText;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.border} />
      <View style={styles.content}>
        <Text style={styles.messageText} numberOfLines={2}>
          {truncatedText || 'No messages yet'}
        </Text>
        {timestamp && (
          <View style={styles.footer}>
            <Text style={styles.timestamp}>{formatTimestamp()}</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>View in Messages</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  border: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  messageText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    ...Typography.caption,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
});





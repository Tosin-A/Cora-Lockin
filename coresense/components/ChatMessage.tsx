/**
 * Chat Message Component
 * Displays individual chat messages with user/coach styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';
import type { ChatMessage } from '../stores/chatStore';

interface ChatMessageProps {
  message: ChatMessage;
  isLast?: boolean;
  isGrouped?: boolean;
  showAvatar?: boolean;
  coachAvatar?: string;
  userAvatar?: string;
}

export default function ChatMessageComponent({ 
  message, 
  isLast,
  isGrouped = false,
  showAvatar = true,
  coachAvatar,
  userAvatar
}: ChatMessageProps) {
  const isUser = message.sender === 'user';
  
  const formatTime = (timestamp: Date): string => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.coachContainer]}>
      {showAvatar && isLast && !isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.coachAvatar}>
            <Ionicons name="person" size={16} color={Colors.textPrimary} />
          </View>
        </View>
      )}
      
      <View style={[
        styles.messageBubble, 
        isUser ? styles.userBubble : styles.coachBubble,
        isGrouped && !isLast && styles.groupedMessage
      ]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.coachText]}>
          {message.isStreaming && message.streamingText 
            ? message.streamingText 
            : message.text}
          {message.isStreaming && (
            <Text style={styles.typingIndicator}>▌</Text>
          )}
        </Text>
        
        {(isLast || !isGrouped) && (
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.coachTimestamp]}>
              {formatTime(message.timestamp)}
            </Text>
            
            {isUser && message.status && (
              <View style={styles.statusContainer}>
                {message.status === 'sending' && (
                  <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                )}
                {message.status === 'sent' && (
                  <Ionicons name="checkmark-outline" size={12} color={Colors.textTertiary} />
                )}
                {message.status === 'delivered' && (
                  <Ionicons name="checkmark-done-outline" size={12} color={Colors.textTertiary} />
                )}
                {message.status === 'read' && (
                  <Ionicons name="checkmark-done" size={12} color={Colors.primary} />
                )}
              </View>
            )}
          </View>
        )}
      </View>
      
      {showAvatar && isLast && isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={16} color={Colors.textPrimary} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  coachContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    maxWidth: '100%',
  },
  coachBubble: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.small,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: BorderRadius.small,
  },
  groupedMessage: {
    marginTop: Spacing.xs,
    borderTopLeftRadius: BorderRadius.medium,
    borderTopRightRadius: BorderRadius.medium,
  },
  typingIndicator: {
    color: Colors.textSecondary,
  },
  messageText: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  coachText: {
    color: Colors.textPrimary,
  },
  userText: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timestamp: {
    ...Typography.caption,
  },
  coachTimestamp: {
    color: Colors.textTertiary,
  },
  userTimestamp: {
    color: Colors.textPrimary,
    opacity: 0.7,
  },
  statusContainer: {
    marginLeft: Spacing.xs,
  },
});

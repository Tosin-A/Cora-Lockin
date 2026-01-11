/**
 * Chat Message Component
 * Displays individual chat messages with user/coach styling
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Colors, Typography, BorderRadius, Spacing } from "../constants/theme";
import type { ChatMessage } from "../stores/chatStore";

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
  userAvatar,
}: ChatMessageProps) {
  const isUser = message.sender === "user";

  const formatTime = (timestamp: Date): string => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.coachContainer,
      ]}
    >
      {showAvatar && isLast && !isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.coachAvatar}>
            <Ionicons name="person" size={16} color={Colors.textPrimary} />
          </View>
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.coachBubble,
          isGrouped && !isLast && styles.groupedMessage,
          {
            borderRadius:
              message.text.length < 30
                ? BorderRadius.large * 2
                : BorderRadius.large * 1.5,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.coachText,
          ]}
        >
          {message.isStreaming && message.streamingText
            ? message.streamingText
            : message.text}
          {message.isStreaming && <Text style={styles.typingIndicator}>▌</Text>}
        </Text>
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
    flexDirection: "row",
    marginBottom: Spacing.sm,
    maxWidth: "85%",
  },
  userContainer: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  coachContainer: {
    alignSelf: "flex-start",
  },
  avatarContainer: {
    width: 32,
    alignItems: "center",
    marginHorizontal: Spacing.xs,
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: "100%",
  },
  coachBubble: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.large * 2,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.large * 2,
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
    fontWeight: "500",
  },
});

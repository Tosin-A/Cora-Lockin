/**
 * Chat Input Component
 * Handles text input, sending, and quick actions for chat
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import type { QuickAction } from "../stores/chatStore";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  quickActions?: QuickAction[];
  onQuickActionPress?: (actionId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialMessage?: string;
}

export default function ChatInput({
  onSendMessage,
  quickActions = [],
  onQuickActionPress,
  disabled = false,
  placeholder = "Type a message...",
  initialMessage = "",
}: ChatInputProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState(initialMessage);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const previousInitialMessage = useRef(initialMessage);

  // Set initial message when it changes (e.g., from navigation params)
  useEffect(() => {
    // Only update if the initial message has changed (new insight selected)
    if (initialMessage && initialMessage !== previousInitialMessage.current) {
      setMessage(initialMessage);
      previousInitialMessage.current = initialMessage;
      // Focus input and move cursor to end
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [initialMessage]);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      setShowQuickActions(false);
    }
  };

  const handleQuickActionPress = (actionId: string) => {
    if (onQuickActionPress) {
      onQuickActionPress(actionId);
    }
    setShowQuickActions(false);
  };

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Quick Actions Bar */}
      {showQuickActions && quickActions.length > 0 && (
        <View style={[styles.quickActionsContainer, { backgroundColor: colors.surface }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContent}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionButton, { backgroundColor: colors.surfaceMedium }]}
                onPress={() => handleQuickActionPress(action.id)}
                disabled={disabled}
              >
                <Ionicons
                  name={action.icon as any}
                  size={16}
                  color={colors.textPrimary}
                  style={styles.quickActionIcon}
                />
                <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Input Row */}
      <View style={styles.inputRow}>
        {/* Text Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.textPrimary }]}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            editable={!disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          {/* Character Counter */}
          {message.length > 400 && (
            <Text style={[styles.characterCounter, { color: colors.textTertiary }]}>{500 - message.length}</Text>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!message.trim() || disabled) && [styles.sendButtonDisabled, { backgroundColor: colors.surfaceMedium }],
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={
              message.trim() && !disabled
                ? '#FFFFFF'
                : colors.textTertiary
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  quickActionsContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
  },
  quickActionsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    gap: Spacing.xs,
  },
  quickActionIcon: {
    marginRight: Spacing.xs,
  },
  quickActionText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },

  inputContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.large * 1.2,
    paddingHorizontal: Spacing.md,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    maxHeight: 80,
    textAlignVertical: "top",
    lineHeight: 20,
    paddingVertical: Spacing.sm,
  },
  characterCounter: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceMedium,
  },
});

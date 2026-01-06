/**
 * Chat Input Component
 * Handles text input, sending, and quick actions for chat
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { QuickAction } from '../stores/chatStore';


interface ChatInputProps {
  onSendMessage: (message: string) => void;
  quickActions?: QuickAction[];
  onQuickActionPress?: (actionId: string) => void;
  disabled?: boolean;
  placeholder?: string;

}

export default function ChatInput({
  onSendMessage,
  quickActions = [],
  onQuickActionPress,
  disabled = false,
  placeholder = 'Type a message...',

}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const inputRef = useRef<TextInput>(null);

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
      setMessage('');
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
    <View style={styles.container}>
      {/* Quick Actions Bar */}
      {showQuickActions && quickActions.length > 0 && (
        <View style={styles.quickActionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContent}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionButton}
                onPress={() => handleQuickActionPress(action.id)}
                disabled={disabled}
              >
                <Ionicons
                  name={action.icon as any}
                  size={16}
                  color={Colors.textPrimary}
                  style={styles.quickActionIcon}
                />
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Input Row */}
      <View style={styles.inputRow}>


        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={500}
            editable={!disabled}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          
          {/* Character Counter */}
          {message.length > 400 && (
            <Text style={styles.characterCounter}>
              {500 - message.length}
            </Text>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={
              message.trim() && !disabled
                ? Colors.primary
                : Colors.textTertiary
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
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickActionsContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickActionsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },

  inputContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  characterCounter: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceMedium,
  },
});

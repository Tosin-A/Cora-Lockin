/**
 * Coach Chat Screen
 * Main chat interface with real-time messaging, streaming responses, and quick actions
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../constants/theme";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import { useChatStore } from "../stores/chatStore";
import { useUserStore } from "../stores/userStore";
import { useInsightsStore } from "../stores/insightsStore";

export default function CoachChatScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Store hooks
  const {
    messages,
    loading,
    sending,
    typing,
    quickActions,
    sendMessage,
    loadChatHistory,
    completeQuickAction,
    pendingReconciliation,
    hasPendingReconciliation,
  } = useChatStore();

  const { profile } = useUserStore();
  const { generateInsightFromChat } = useInsightsStore();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Load chat history when screen focuses (handles fast navigation)
    // Phase 4: Skip reload during streaming or pending reconciliation
    const unsubscribe = navigation.addListener("focus", () => {
      const isTyping = typing;
      const hasPending = hasPendingReconciliation();

      if (isTyping || hasPending) {
        console.log(
          `Skipping focus reload: typing=${isTyping}, pending=${hasPending}`
        );
        return;
      }

      console.log("Focus event: loading chat history");
      loadChatHistory({ forceRefresh: true });
    });

    return unsubscribe;
  }, [navigation, loadChatHistory, typing, hasPendingReconciliation]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive (iMessage-style immediate scroll)
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    try {
      await sendMessage(messageText);

      // Generate insight from chat message if it contains relevant keywords
      await generateInsightFromChat(messageText, "productivity");
    } catch (error: any) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleQuickAction = async (actionId: string) => {
    completeQuickAction(actionId);

    // Generate relevant insight based on action type
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      await generateInsightFromChat(
        `User selected ${action.title} quick action`,
        action.category
      );
    }
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const prevMessage = messages[index - 1];
    const isGrouped =
      prevMessage &&
      prevMessage.sender === item.sender &&
      new Date().getTime() - new Date(prevMessage.timestamp).getTime() < 300000; // 5 minutes

    return (
      <ChatMessage
        message={item}
        isGrouped={isGrouped}
        showAvatar={!isGrouped}
        coachAvatar=""
        userAvatar={profile?.full_name?.[0] || "👤"}
      />
    );
  };

  const renderHeader = () => {
    return (
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Spacing.md),
            paddingBottom: Spacing.sm,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.coachAvatar}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Cora</Text>
            {typing && <Text style={styles.headerSubtitle}>Typing...</Text>}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Alert.alert("Chat Options", "Choose an action", [
                {
                  text: "Clear Chat",
                  onPress: () => {
                    // Clear chat history
                    useChatStore.getState().clearChat();
                  },
                },
                {
                  text: "Coach Status",
                  onPress: () => {
                    // Show coach status info
                    Alert.alert(
                      "Coach Status",
                      "Your coach remembers everything and holds you accountable."
                    );
                  },
                },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    // Only show typing indicator when there are messages (not in empty chat state)
    if (!typing || messages.length === 0) return null;

    return (
      <View style={styles.typingIndicatorContainer}>
        <TypingIndicator show={typing} />
      </View>
    );
  };

  const renderEmptyChat = () => {
    if (messages.length > 0) return null;

    return (
      <View style={styles.emptyChatContainer}>
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={48}
              color={Colors.accent}
            />
          </View>
          <Text style={styles.welcomeTitle}>Cora</Text>
          <Text style={styles.welcomeSubtitle}>
            I'm here to hold you accountable. Not to cheer you on. Not to be
            your therapist. To call you out when you're making excuses and
            celebrate when you're actually doing the work.
          </Text>

          {/* Initial Coach Message */}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              {
                paddingTop: Spacing.lg,
                paddingBottom: Spacing.xl,
              },
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyChat}
            ListFooterComponent={renderTypingIndicator}
          />
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        )}

        {/* Chat Input */}
        <View style={styles.inputContainer}>
          <ChatInput
            onSendMessage={handleSendMessage}
            quickActions={quickActions}
            onQuickActionPress={handleQuickAction}
            disabled={sending || loading}
            placeholder="Chat to me"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    // Input container will be positioned at the bottom
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  welcomeIcon: {
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  welcomeSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  quickActionsPreview: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  previewActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  previewActionText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  initialCoachMessage: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  coachGreetingText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontStyle: "italic",
    textAlign: "center",
  },
  typingIndicatorContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
});

/**
 * Coach Chat Screen
 * Main chat interface with real-time messaging, streaming responses, and quick actions
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import { useChatStore } from "../stores/chatStore";
import { useUserStore } from "../stores/userStore";
import { useInsightsStore } from "../stores/insightsStore";
import { useMessageLimitStore } from "../stores/messageLimitStore";
import { useSubscriptionStore } from "../stores/subscriptionStore";

// Route params type for insight context
type CoachChatRouteParams = {
  Coach: {
    context?: {
      type: 'insight';
      insightId: string;
      title: string;
      commentary: string;
      patternType?: string;
      actionSteps?: string[];
    };
  };
};

export default function CoachChatScreen({ navigation }: any) {
  const route = useRoute<RouteProp<CoachChatRouteParams, 'Coach'>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
  const {
    showPaywall,
    paywallMessage,
    hidePaywall,
    messagesRemaining,
    dailyRemaining,
    weeklyRemaining,
    isPro,
    loadUsageStats,
  } = useMessageLimitStore();

  const { startCheckout, checkoutLoading } = useSubscriptionStore();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Load usage stats on mount
  useEffect(() => {
    loadUsageStats();
  }, []);

  // Generate pre-filled message from insight context
  const initialMessage = useMemo(() => {
    const context = route.params?.context;
    if (!context || context.type !== 'insight') return "";

    // Create a conversational prompt based on the insight
    const { title, commentary, actionSteps } = context;

    // Build a natural question about the insight
    let prompt = `I saw your insight about "${title}". `;

    if (commentary) {
      // Add context from the coach commentary
      prompt += `You mentioned: "${commentary}" `;
    }

    prompt += "Can you give me more specific advice on how to improve this?";

    // If there are action steps, reference them
    if (actionSteps && actionSteps.length > 0) {
      prompt += " I'd also like more details on the steps you suggested.";
    }

    return prompt;
  }, [route.params?.context]);

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

  const handleSendMessage = useCallback(async (messageText: string) => {
    try {
      await sendMessage(messageText);
      await generateInsightFromChat(messageText, "productivity");
      // Refresh usage stats after sending
      loadUsageStats();
    } catch (error: any) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  }, [sendMessage, generateInsightFromChat, loadUsageStats]);

  const handleQuickAction = useCallback(async (actionId: string) => {
    completeQuickAction(actionId);
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      await generateInsightFromChat(
        `User selected ${action.title} quick action`,
        action.category
      );
    }
  }, [completeQuickAction, quickActions, generateInsightFromChat]);

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
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
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
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.coachAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Kora</Text>
            {typing && <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>Typing...</Text>}
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
              color={colors.textSecondary}
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
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={styles.welcomeIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={48}
              color={colors.accent}
            />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Kora</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        {/* Loading Overlay — only on initial load when no messages exist */}
        {loading && messages.length === 0 && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading chat...</Text>
          </View>
        )}

        {/* Messages remaining indicator */}
        {!isPro && messagesRemaining <= 5 && messagesRemaining > 0 && (
          <View style={[styles.remainingBanner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
              {dailyRemaining <= weeklyRemaining
                ? `${dailyRemaining} message${dailyRemaining !== 1 ? 's' : ''} left today`
                : `${weeklyRemaining} message${weeklyRemaining !== 1 ? 's' : ''} left this week`}
            </Text>
          </View>
        )}

        {/* Chat Input */}
        <View style={styles.inputContainer}>
          <ChatInput
            onSendMessage={handleSendMessage}
            quickActions={quickActions}
            onQuickActionPress={handleQuickAction}
            disabled={sending || messagesRemaining <= 0}
            placeholder={messagesRemaining <= 0 ? "Message limit reached" : "Chat to me"}
            initialMessage={initialMessage}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="fade"
        onRequestClose={hidePaywall}
      >
        <View style={styles.paywallOverlay}>
          <View style={[styles.paywallCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.paywallClose}
              onPress={hidePaywall}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.paywallIcon, { backgroundColor: colors.primaryMuted || '#EDE9FE' }]}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.paywallTitle, { color: colors.textPrimary }]}>
              Message Limit Reached
            </Text>

            <Text style={[styles.paywallBody, { color: colors.textSecondary }]}>
              {paywallMessage}
            </Text>

            <View style={styles.paywallFeatures}>
              <View style={styles.paywallFeatureRow}>
                <Ionicons name="checkmark" size={18} color={colors.primary} />
                <Text style={[styles.paywallFeatureText, { color: colors.textPrimary }]}>
                  20 messages per day
                </Text>
              </View>
              <View style={styles.paywallFeatureRow}>
                <Ionicons name="checkmark" size={18} color={colors.primary} />
                <Text style={[styles.paywallFeatureText, { color: colors.textPrimary }]}>
                  100 messages per week
                </Text>
              </View>
              <View style={styles.paywallFeatureRow}>
                <Ionicons name="checkmark" size={18} color={colors.primary} />
                <Text style={[styles.paywallFeatureText, { color: colors.textPrimary }]}>
                  Priority coaching responses
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.paywallButton, { backgroundColor: colors.primary }]}
              onPress={startCheckout}
              activeOpacity={0.8}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.paywallButtonText}>Upgrade to Pro - £8.99/mo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paywallLaterButton}
              onPress={hidePaywall}
              activeOpacity={0.7}
            >
              <Text style={[styles.paywallLaterText, { color: colors.textTertiary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Remaining messages banner
  remainingBanner: {
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  remainingText: {
    ...Typography.caption,
    fontSize: 12,
  },

  // Paywall modal
  paywallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  paywallCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  paywallClose: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  paywallIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  paywallTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: 8,
  },
  paywallBody: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  paywallFeatures: {
    alignSelf: 'stretch',
    marginBottom: 24,
    gap: 12,
  },
  paywallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paywallFeatureText: {
    ...Typography.body,
    fontSize: 15,
  },
  paywallButton: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  paywallButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paywallLaterButton: {
    paddingVertical: 8,
  },
  paywallLaterText: {
    ...Typography.body,
    fontSize: 14,
  },
});

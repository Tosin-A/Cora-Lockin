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
  Dimensions,
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
import { scheduleWithSmartGap } from "../utils/calendarService";
import { coresenseApi, CoachPersonality } from "../utils/coresenseApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  // Store hooks — fine-grained selectors to avoid unnecessary re-renders
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const typing = useChatStore((s) => s.typing);
  const quickActions = useChatStore((s) => s.quickActions);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadChatHistory = useChatStore((s) => s.loadChatHistory);
  const loadCachedMessages = useChatStore((s) => s.loadCachedMessages);
  const completeQuickAction = useChatStore((s) => s.completeQuickAction);
  const hasPendingReconciliation = useChatStore((s) => s.hasPendingReconciliation);
  const pendingCalendarEvent = useChatStore((s) => s.pendingCalendarEvent);
  const clearPendingCalendarEvent = useChatStore((s) => s.clearPendingCalendarEvent);

  const profile = useUserStore((s) => s.profile);
  const generateInsightFromChat = useInsightsStore((s) => s.generateInsightFromChat);
  const messagesRemaining = useMessageLimitStore((s) => s.messagesRemaining);
  const loadUsageStats = useMessageLimitStore((s) => s.loadUsageStats);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);
  const productPrice = useSubscriptionStore((s) => s.productPrice);
  const checkoutLoading = useSubscriptionStore((s) => s.checkoutLoading);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [calendarAdding, setCalendarAdding] = useState(false);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const skeletonPulse = useRef(new Animated.Value(0.3)).current;

  // Coach personality state
  const [showPersonalityPicker, setShowPersonalityPicker] = useState(false);
  const [personalities, setPersonalities] = useState<CoachPersonality[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<CoachPersonality | null>(null);
  const [savingPersonality, setSavingPersonality] = useState(false);

  useEffect(() => {
    if (!loading || messages.length > 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(skeletonPulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [loading, messages.length]);

  useEffect(() => {
    loadCachedMessages();
    loadUsageStats();
    // Load coach personalities + saved selection
    (async () => {
      try {
        const [personalitiesRes, prefsRes] = await Promise.all([
          coresenseApi.getCoachPersonalities(),
          coresenseApi.getPreferences(),
        ]);
        const list = personalitiesRes.data?.personalities;
        if (list?.length) {
          setPersonalities(list);
          const savedId = (prefsRes.data as any)?.coachPersonality || "cora";
          const match = list.find((p) => p.id === savedId) || list[0];
          setSelectedPersonality(match);
        }
      } catch (e) {
        console.error("Failed to load coach personalities:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setCalendarSuccess(false);
    setCalendarAdding(false);
  }, [pendingCalendarEvent]);

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
    const unsubscribe = navigation.addListener("focus", () => {
      if (typing || hasPendingReconciliation()) return;

      const state = useChatStore.getState();
      if (state.lastSyncedAt && Date.now() - state.lastSyncedAt.getTime() < 30000) {
        return;
      }

      loadChatHistory({
        forceRefresh: true,
        silent: state.messages.length > 0,
      });
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

  const displayMessages = useMemo(() => {
    const result: typeof messages = [];
    for (const msg of messages) {
      if (msg.sender === 'coach' && msg.text) {
        const paragraphs = msg.text.split(/\n\n+/).filter((p: string) => p.trim());
        if (paragraphs.length > 1) {
          paragraphs.forEach((paragraph: string, idx: number) => {
            result.push({ ...msg, id: `${msg.id}-p${idx}`, text: paragraph.trim() });
          });
        } else {
          result.push(msg);
        }
      } else {
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (displayMessages.length > prevCountRef.current && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
    prevCountRef.current = displayMessages.length;
  }, [displayMessages.length]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    // Block sending before it hits the API if limit is reached
    if (messagesRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }
    try {
      await sendMessage(messageText);
      await generateInsightFromChat(messageText, "productivity");
      loadUsageStats();
    } catch (error: any) {
      if (error?.name === "MessageLimitError" || error?.message?.includes("message_limit_reached")) {
        loadUsageStats();
        setShowUpgradeModal(true);
      } else {
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    }
  }, [sendMessage, generateInsightFromChat, loadUsageStats, messagesRemaining]);

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

  const handlePersonalitySelect = useCallback(async (personality: CoachPersonality) => {
    if (savingPersonality || personality.id === selectedPersonality?.id) return;
    setSavingPersonality(true);
    const previous = selectedPersonality;
    setSelectedPersonality(personality);
    try {
      const { error } = await coresenseApi.setCoachPersonality(personality.id);
      if (error) throw new Error(error);
      setShowPersonalityPicker(false);
    } catch {
      setSelectedPersonality(previous);
      Alert.alert("Error", "Failed to update coach personality.");
    } finally {
      setSavingPersonality(false);
    }
  }, [savingPersonality, selectedPersonality]);

  const handleAddToCalendar = useCallback(async () => {
    if (!pendingCalendarEvent || calendarAdding) return;
    setCalendarAdding(true);
    try {
      const targetDate = new Date(pendingCalendarEvent.date);
      const result = await scheduleWithSmartGap(
        pendingCalendarEvent.title,
        targetDate,
        pendingCalendarEvent.duration_minutes || 60,
        pendingCalendarEvent.preferred_time,
        pendingCalendarEvent.notes
      );
      if (result.success) {
        setCalendarSuccess(true);
        setTimeout(() => {
          clearPendingCalendarEvent();
        }, 2000);
      } else {
        Alert.alert("Calendar Error", result.error || "Could not add event to calendar.");
      }
    } catch {
      Alert.alert("Calendar Error", "Something went wrong. Please try again.");
    } finally {
      setCalendarAdding(false);
    }
  }, [pendingCalendarEvent, calendarAdding, clearPendingCalendarEvent]);

  const renderCalendarActionCard = () => {
    if (!pendingCalendarEvent) return null;

    const formattedDate = (() => {
      try {
        return new Date(pendingCalendarEvent.date).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return pendingCalendarEvent.date;
      }
    })();

    return (
      <View style={[calendarStyles.card, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {calendarSuccess ? (
          <View style={calendarStyles.successRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success || '#22C55E'} />
            <Text style={[calendarStyles.successText, { color: colors.textSecondary }]}>
              Added to your calendar
            </Text>
          </View>
        ) : (
          <>
            <View style={calendarStyles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
              <View style={calendarStyles.infoText}>
                <Text style={[calendarStyles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {pendingCalendarEvent.title}
                </Text>
                <Text style={[calendarStyles.eventDate, { color: colors.textTertiary }]}>
                  {formattedDate}
                  {pendingCalendarEvent.preferred_time ? ` · ${pendingCalendarEvent.preferred_time}` : ''}
                </Text>
              </View>
            </View>
            <View style={calendarStyles.actions}>
              <TouchableOpacity
                style={calendarStyles.dismissButton}
                onPress={clearPendingCalendarEvent}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={[calendarStyles.dismissText, { color: colors.textTertiary }]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[calendarStyles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddToCalendar}
                disabled={calendarAdding}
                activeOpacity={0.8}
              >
                {calendarAdding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={calendarStyles.addButtonText}>Add to Calendar</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
    const prevMessage = displayMessages[index - 1];
    const isGrouped =
      prevMessage &&
      prevMessage.sender === item.sender &&
      new Date().getTime() - new Date(prevMessage.timestamp).getTime() < 300000;

    return (
      <ChatMessage
        message={item}
        isGrouped={isGrouped}
        showAvatar={!isGrouped}
        coachAvatar=""
        userAvatar={profile?.full_name?.[0] || "👤"}
      />
    );
  }, [displayMessages, profile?.full_name]);

  const keyExtractor = useCallback((item: any) => item.id, []);

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
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{selectedPersonality?.name || "Cora"}</Text>
            {typing && <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>Typing...</Text>}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Alert.alert("Chat Options", "Choose an action", [
                {
                  text: "Change Coach",
                  onPress: () => setShowPersonalityPicker(true),
                },
                {
                  text: "Clear Chat",
                  onPress: () => {
                    useChatStore.getState().clearChat();
                  },
                },
                {
                  text: "Reload Chat",
                  onPress: () => {
                    loadChatHistory({ forceRefresh: true });
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
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>{selectedPersonality?.name || "Cora"}</Text>
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
            data={displayMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              {
                paddingTop: Spacing.lg,
                paddingBottom: Spacing.xl,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            maxToRenderPerBatch={10}
            windowSize={7}
            initialNumToRender={15}
            removeClippedSubviews={true}
            ListEmptyComponent={renderEmptyChat}
            ListFooterComponent={renderTypingIndicator}
          />
        </View>

        {loading && messages.length === 0 && (
          <View style={styles.skeletonContainer}>
            {[
              { w: '65%', h: 56, left: true },
              { w: '45%', h: 40, left: false },
              { w: '75%', h: 64, left: true },
              { w: '40%', h: 36, left: false },
              { w: '55%', h: 48, left: true },
            ].map((item, i) => (
              <Animated.View
                key={i}
                style={{
                  width: item.w as any,
                  height: item.h,
                  backgroundColor: colors.surfaceMedium || '#F3F4F6',
                  borderRadius: 12,
                  alignSelf: item.left ? ('flex-start' as const) : ('flex-end' as const),
                  marginBottom: 12,
                  opacity: skeletonPulse,
                }}
              />
            ))}
          </View>
        )}

        {/* Calendar action card */}
        {renderCalendarActionCard()}

        {/* Chat Input */}
        {messagesRemaining <= 0 ? (
          <TouchableOpacity
            style={styles.inputContainer}
            activeOpacity={0.8}
            onPress={() => setShowUpgradeModal(true)}
          >
            <View pointerEvents="none">
              <ChatInput
                onSendMessage={handleSendMessage}
                quickActions={[]}
                onQuickActionPress={handleQuickAction}
                disabled={true}
                placeholder="Upgrade to Pro for more messages"
                initialMessage=""
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.inputContainer}>
            <ChatInput
              onSendMessage={handleSendMessage}
              quickActions={quickActions}
              onQuickActionPress={handleQuickAction}
              disabled={sending}
              placeholder="Chat to me"
              initialMessage={initialMessage}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Personality Picker Modal */}
      <Modal
        visible={showPersonalityPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPersonalityPicker(false)}
      >
        <View style={personalityStyles.overlay}>
          <View style={[personalityStyles.sheet, { backgroundColor: colors.surface }]}>
            <View style={personalityStyles.handle} />
            <View style={personalityStyles.sheetHeader}>
              <Text style={[personalityStyles.sheetTitle, { color: colors.textPrimary }]}>Choose Your Coach</Text>
              <TouchableOpacity
                onPress={() => setShowPersonalityPicker(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[personalityStyles.sheetSubtitle, { color: colors.textTertiary }]}>
              Takes effect on your next message
            </Text>

            {personalities.map((p) => {
              const isSelected = p.id === selectedPersonality?.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    personalityStyles.card,
                    { backgroundColor: colors.background, borderColor: isSelected ? colors.primary : "rgba(0,0,0,0.06)" },
                    isSelected && { borderWidth: 1.5 },
                  ]}
                  onPress={() => handlePersonalitySelect(p)}
                  activeOpacity={0.7}
                  disabled={savingPersonality}
                >
                  <View style={personalityStyles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[personalityStyles.cardName, { color: colors.textPrimary }]}>{p.name}</Text>
                      <Text style={[personalityStyles.cardDesc, { color: colors.textSecondary }]}>{p.description}</Text>
                    </View>
                    {isSelected && (
                      <View style={[personalityStyles.checkmark, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[personalityStyles.cardSample, { color: colors.textTertiary }]}>"{p.sample}"</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Upgrade to Pro Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={upgradeStyles.overlay}>
          <View style={[upgradeStyles.card, { backgroundColor: colors.surface }]}>
            <View style={upgradeStyles.iconWrap}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
            </View>
            <Text style={[upgradeStyles.title, { color: colors.textPrimary }]}>
              You've hit your message limit
            </Text>
            <Text style={[upgradeStyles.desc, { color: colors.textSecondary }]}>
              Upgrade to Pro for unlimited messages and keep the conversation going
            </Text>
            <TouchableOpacity
              style={[upgradeStyles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                setShowUpgradeModal(false);
                await startCheckout();
              }}
              activeOpacity={0.8}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={upgradeStyles.upgradeBtnText}>
                  Upgrade to Pro{productPrice ? ` — ${productPrice}` : ""}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={upgradeStyles.dismissBtn}
              onPress={() => setShowUpgradeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[upgradeStyles.dismissText, { color: colors.textTertiary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const upgradeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  upgradeBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissBtn: {
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontSize: 14,
  },
});

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
  skeletonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    justifyContent: 'flex-end',
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

const calendarStyles = StyleSheet.create({
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  eventDate: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  successText: {
    fontSize: 14,
  },
});

const personalityStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sheetSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  cardSample: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
});

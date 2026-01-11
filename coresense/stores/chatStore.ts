/**
 * Chat Store - State management for coach chat functionality
 * Implements message lifecycle:
 * 1. Create temp message with client_temp_id (optimistic)
 * 2. Send to API with client_temp_id
 * 3. Backend stores and returns saved_ids
 * 4. Remove ONLY the temp message matching client_temp_id
 * 5. Full replace from /history (authoritative)
 */

import { create } from "zustand";
import { Alert } from "react-native";
import { coresenseApi } from "../utils/coresenseApi";
import { useAuthStore } from "./authStore";
import { useMessageLimitStore } from "./messageLimitStore";

export interface ChatMessage {
  // DB-owned fields (set after reconciliation)
  id: string;
  text: string;
  sender: "user" | "coach";
  timestamp: Date;
  status?: "sending" | "sent" | "delivered" | "read";
  isStreaming?: boolean;
  streamingText?: string;

  // Optimistic/pending fields (set before reconciliation)
  client_temp_id?: string; // Original temp ID for reconciliation (user messages)
  isOptimistic?: boolean; // true if pending DB confirmation

  // Assistant message reconciliation (Phase 4)
  assistant_temp_id?: string; // Temp ID for new assistant messages
  run_id?: string; // OpenAI run ID for delta tracking
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  category: "checkin" | "mood" | "focus" | "health";
  action: () => void;
}

interface ChatStore {
  // State
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  typing: boolean;
  quickActions: QuickAction[];
  isLoadingHistory: boolean; // Guard for concurrent loads
  currentLoadId: number; // Track load operations for staleness

  // Reconciliation state (Phase 2)
  pendingReconciliation: string[]; // client_temp_ids waiting for /history
  lastSyncedAt: Date | null; // Timestamp of last /history fetch
  pendingMessageIds: string[]; // Track message IDs we're waiting for from API

  // Assistant message reconciliation state (Phase 4)
  pendingAssistantTempIds: string[]; // assistant_temp_ids waiting for /history
  lastRunId: string | null; // Track last processed run for delta optimization

  // Actions
  sendMessage: (text: string, isQuickAction?: boolean) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;
  markAsRead: (messageId: string) => void;
  setTyping: (typing: boolean) => void;
  loadChatHistory: (options?: {
    useFullReplace?: boolean;
    forceRefresh?: boolean;
  }) => Promise<void>;
  completeQuickAction: (actionId: string) => void;
  simulateStreaming: (messageId: string, fullText: string) => Promise<void>;

  // Phase 3: Reconciliation helpers
  waitForReconciliation: (
    tempIds: string[],
    maxAttempts?: number
  ) => Promise<boolean>;
  hasPendingReconciliation: () => boolean;

  // Phase 4: Assistant message reconciliation helpers
  waitForAssistantReconciliation: (
    tempIds: string[],
    maxAttempts?: number
  ) => Promise<boolean>;
  appendNewMessages: (newMessages: ChatMessage[]) => void;

  // Message limit integration
  checkMessageLimit: () => boolean;
  showUpgradePrompt: () => void;
}

// Generate unique temp ID for optimistic messages
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  // Initial state
  messages: [],
  loading: false,
  sending: false,
  typing: false,
  quickActions: [
    {
      id: "struggling",
      title: "Struggling Today",
      icon: "warning-outline",
      category: "checkin",
      action: () => {
        const { sendMessage } = get();
        sendMessage("I'm struggling today and need accountability", true);
      },
    },
    {
      id: "excuse",
      title: "Made an Excuse",
      icon: "alert-circle-outline",
      category: "checkin",
      action: () => {
        const { sendMessage } = get();
        sendMessage("I catch myself making excuses again", true);
      },
    },
    {
      id: "breakthrough",
      title: "Had a Breakthrough",
      icon: "trophy-outline",
      category: "checkin",
      action: () => {
        const { sendMessage } = get();
        sendMessage("I had a real breakthrough today", true);
      },
    },
    {
      id: "commit",
      title: "Making a Commitment",
      icon: "checkmark-circle-outline",
      category: "checkin",
      action: () => {
        const { sendMessage } = get();
        sendMessage(
          "I want to make a commitment and need you to hold me to it",
          true
        );
      },
    },
  ],
  isLoadingHistory: false,
  currentLoadId: 0,

  // Reconciliation state
  pendingReconciliation: [],
  lastSyncedAt: null,
  pendingMessageIds: [],

  // Assistant message reconciliation state
  pendingAssistantTempIds: [],
  lastRunId: null,

  // Actions
  sendMessage: async (text: string, isQuickAction = false) => {
    if (!text.trim()) return;

    // Check message limit first
    const { canSendMessage, showUpgradePrompt } =
      useMessageLimitStore.getState();

    if (!canSendMessage()) {
      console.log("Message limit reached, showing upgrade prompt");
      showUpgradePrompt();
      return;
    }

    // Generate temp ID for this message
    const clientTempId = generateTempId();

    // Set sending and typing states
    set({ sending: true, typing: true });

    // Create optimistic user message with temp ID
    const userMessage: ChatMessage = {
      id: clientTempId, // Use temp ID as initial ID
      client_temp_id: clientTempId, // Store for reconciliation
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
      status: "sending",
      isOptimistic: true, // Mark as unconfirmed
    };

    // Add user message immediately (optimistic)
    set((state) => ({
      messages: [...state.messages, userMessage],
      // Mark this message as pending reconciliation
      pendingReconciliation: [...state.pendingReconciliation, clientTempId],
      pendingMessageIds: [...state.pendingMessageIds, clientTempId],
    }));

    try {
      // Get user ID from auth store
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Send to API with client_temp_id
      const { data, error } = await coresenseApi.sendChatMessage(
        user.id,
        text,
        {
          current_streak: 0, // TODO: Get from user store
          recent_pattern: "coasting",
          response_rate: "high",
        },
        clientTempId
      );

      if (error) {
        // Handle different error types
        const errorString =
          typeof error === "string" ? error : JSON.stringify(error);

        if (
          errorString.includes("message_limit_reached") ||
          errorString.includes("402")
        ) {
          console.log("Server-side limit check failed, showing upgrade prompt");
          set((state) => ({
            typing: false,
            pendingReconciliation: state.pendingReconciliation.filter(
              (id) => id !== clientTempId
            ),
            pendingMessageIds: state.pendingMessageIds.filter(
              (id) => id !== clientTempId
            ),
          }));
          showUpgradePrompt();
          return;
        }
        throw new Error(errorString);
      }

      // Clear typing state - NO local coach message creation
      // Coach message will come from /history after DB write completes
      set({ typing: false });

      console.log(
        "Message sent, waiting for DB write and /history reconciliation..."
      );

      // Extract assistant_temp_ids and run_id from response (Phase 4)
      const assistantTempIds = data?.saved_ids?.assistant_temp_ids || [];
      const runId = data?.run_id;

      if (assistantTempIds.length > 0) {
        console.log(
          `Storing ${assistantTempIds.length} assistant_temp_ids for reconciliation`
        );
        set((state) => ({
          pendingAssistantTempIds: [
            ...state.pendingAssistantTempIds,
            ...assistantTempIds,
          ],
          lastRunId: runId,
        }));
      }

      // Wait for DB write to complete before reconciliation
      // Poll /history until we see the new message with a real DB ID
      await get().waitForReconciliation([clientTempId]);

      // Also wait for assistant messages to be reconciled (Phase 4)
      if (assistantTempIds.length > 0) {
        await get().waitForAssistantReconciliation(assistantTempIds);
      }

      // Refresh usage stats after successful message
      const { loadUsageStats } = useMessageLimitStore.getState();
      loadUsageStats();
    } catch (error: any) {
      console.error("Failed to send message:", error);

      // Clear typing state on error
      set((state) => ({
        typing: false,
        pendingReconciliation: state.pendingReconciliation.filter(
          (id) => id !== clientTempId
        ),
        pendingMessageIds: state.pendingMessageIds.filter(
          (id) => id !== clientTempId
        ),
      }));

      // Update user message with error status
      get().updateMessage(clientTempId, { status: "sent" });

      // Remove the failed temp message (it will be restored from history if needed)
      set((state) => ({
        messages: state.messages.filter(
          (m) => m.client_temp_id !== clientTempId
        ),
      }));

      // Add error message from coach
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: "I'm sorry, I'm having trouble responding right now. Please try again.",
        sender: "coach",
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
      }));
    } finally {
      set({ sending: false });
    }
  },

  setMessages: (messages: ChatMessage[]) => {
    set({ messages });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id: string, updates: Partial<ChatMessage>) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  clearChat: () => {
    set({ messages: [] });
  },

  markAsRead: (messageId: string) => {
    get().updateMessage(messageId, { status: "read" });
  },

  setTyping: (typing: boolean) => {
    set({ typing });
  },

  loadChatHistory: async (options = {}) => {
    const { useFullReplace = true, forceRefresh = false } = options;

    // Prevent concurrent loads
    if (get().isLoadingHistory) {
      console.log("Already loading chat history, skipping");
      return;
    }

    const thisLoadId = ++get().currentLoadId;

    set({ loading: true, isLoadingHistory: true });

    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.log("No authenticated user, skipping chat history load");
        return;
      }

      const { data, error } = await coresenseApi.getChatHistory(user.id);

      if (!error && data) {
        const formattedMessages: ChatMessage[] = (data.messages || []).map(
          (msg: any) => ({
            id: msg.id,
            text: msg.content || msg.text,
            sender: msg.sender_type === "gpt" ? "coach" : "user",
            timestamp: new Date(msg.created_at || msg.timestamp),
            status: "delivered",
            // Assistant message reconciliation fields (Phase 4)
            assistant_temp_id: msg.assistant_temp_id,
            run_id: msg.run_id,
            // These should not exist in DB-persisted messages
            client_temp_id: undefined,
            isOptimistic: false,
          })
        );

        console.log(
          `Loaded ${formattedMessages.length} messages from chat history`
        );

        // Check for stale load
        if (thisLoadId !== get().currentLoadId && !forceRefresh) {
          console.log("Stale load, discarding");
          return;
        }

        if (useFullReplace) {
          // Full replace - /history is authoritative
          // This eliminates duplicates by ensuring we only have DB-persisted messages
          set({ messages: formattedMessages, lastSyncedAt: new Date() });
        } else {
          // Delta mode - append only new messages
          get().appendNewMessages(formattedMessages);
        }
      } else if (error) {
        console.log("Chat history API error (might be new account):", error);
        set({ messages: [] });
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      set({ messages: [] });
    } finally {
      set({ loading: false, isLoadingHistory: false });
    }
  },

  // Phase 3: Wait for DB reconciliation
  // Poll /history until we see messages with real DB IDs (not temp IDs)
  waitForReconciliation: async (tempIds: string[], maxAttempts = 20) => {
    const { pendingReconciliation, pendingMessageIds, loadChatHistory } = get();

    // Filter to only the temp IDs we're waiting for
    const waitingFor = tempIds.filter((id) =>
      pendingReconciliation.includes(id)
    );

    if (waitingFor.length === 0) {
      console.log("No pending reconciliation needed");
      return true;
    }

    console.log(
      `Waiting for reconciliation of ${waitingFor.length} message(s)...`
    );

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Load fresh history
      await loadChatHistory({ useFullReplace: true, forceRefresh: true });

      const { messages, pendingMessageIds: currentPending } = get();

      // Check if all temp IDs have been replaced with real DB IDs
      // A message is reconciled if:
      // 1. It no longer has a client_temp_id matching our pending IDs, OR
      // 2. It has a DB ID (not temp format)
      const reconciled = waitingFor.every((tempId) => {
        const stillTemp = messages.find((m) => m.client_temp_id === tempId);
        return !stillTemp;
      });

      if (reconciled) {
        console.log(`Reconciliation complete after ${attempt + 1} attempt(s)`);

        // Clear pending state
        set((state) => ({
          pendingReconciliation: state.pendingReconciliation.filter(
            (id) => !waitingFor.includes(id)
          ),
          pendingMessageIds: state.pendingMessageIds.filter(
            (id) => !waitingFor.includes(id)
          ),
        }));

        return true;
      }

      // Wait before next poll (100ms base + exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(100 * Math.pow(2, attempt), 2000))
      );
    }

    console.warn(`Reconciliation timeout after ${maxAttempts} attempts`);

    // Even on timeout, clear pending state to avoid getting stuck
    set((state) => ({
      pendingReconciliation: state.pendingReconciliation.filter(
        (id) => !waitingFor.includes(id)
      ),
      pendingMessageIds: state.pendingMessageIds.filter(
        (id) => !waitingFor.includes(id)
      ),
    }));

    return false;
  },

  // Check if there are pending messages awaiting reconciliation
  hasPendingReconciliation: () => {
    const state = get();
    return (
      state.pendingReconciliation.length > 0 ||
      state.pendingAssistantTempIds.length > 0
    );
  },

  // Phase 4: Wait for assistant message DB reconciliation
  // Poll /history until we see assistant messages with real DB IDs
  waitForAssistantReconciliation: async (
    tempIds: string[],
    maxAttempts = 20
  ) => {
    const { pendingAssistantTempIds, loadChatHistory, messages } = get();

    const waitingFor = tempIds.filter((id) =>
      pendingAssistantTempIds.includes(id)
    );

    if (waitingFor.length === 0) {
      console.log("No pending assistant reconciliation needed");
      return true;
    }

    console.log(
      `Waiting for assistant reconciliation of ${waitingFor.length} message(s)...`
    );

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Load fresh history with full replace
      await loadChatHistory({ useFullReplace: true, forceRefresh: true });

      const { messages: currentMessages } = get();

      // Check if assistant temp IDs have been reconciled
      // A message is reconciled if assistant_temp_id is no longer set (or doesn't match pending)
      const reconciled = waitingFor.every((tempId) => {
        const found = currentMessages.find(
          (m) => m.assistant_temp_id === tempId
        );
        // Reconciled if we can't find it by temp ID, or temp ID is cleared
        return !found || !found.assistant_temp_id;
      });

      if (reconciled) {
        console.log(
          `Assistant reconciliation complete after ${attempt + 1} attempt(s)`
        );

        // Clear pending state
        set((state) => ({
          pendingAssistantTempIds: state.pendingAssistantTempIds.filter(
            (id) => !waitingFor.includes(id)
          ),
        }));

        return true;
      }

      // Wait before next poll (100ms base + exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(100 * Math.pow(2, attempt), 2000))
      );
    }

    console.warn(
      `Assistant reconciliation timeout after ${maxAttempts} attempts`
    );

    // Even on timeout, clear pending state to avoid getting stuck
    set((state) => ({
      pendingAssistantTempIds: state.pendingAssistantTempIds.filter(
        (id) => !waitingFor.includes(id)
      ),
    }));

    return false;
  },

  // Helper method for delta message appending
  // Only appends messages that don't already exist in the list
  appendNewMessages: (newMessages: ChatMessage[]) => {
    const { messages, lastRunId } = get();

    // Filter to only messages that don't exist in our current list
    const existingIds = new Set(messages.map((m) => m.id));
    const newOnly = newMessages.filter((m) => !existingIds.has(m.id));

    if (newOnly.length > 0) {
      console.log(`Appending ${newOnly.length} new messages (delta mode)`);

      // Sort by timestamp to maintain chronological order
      const sorted = [...messages, ...newOnly].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      set({
        messages: sorted,
        lastSyncedAt: new Date(),
      });
    }
  },

  completeQuickAction: (actionId: string) => {
    const action = get().quickActions.find((a) => a.id === actionId);
    if (action) {
      action.action();
    }
  },

  // Helper method for streaming simulation
  simulateStreaming: async (messageId: string, fullText: string) => {
    const words = fullText.split(" ");
    let currentText = "";

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? " " : "") + words[i];

      get().updateMessage(messageId, {
        streamingText: currentText,
        text: currentText,
      });

      // Simulate typing delay
      await new Promise((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 100)
      );
    }

    // Complete streaming
    get().updateMessage(messageId, {
      isStreaming: false,
      streamingText: undefined,
      status: "delivered",
    });
  },

  // Message limit integration
  checkMessageLimit: () => {
    const { canSendMessage } = useMessageLimitStore.getState();
    return canSendMessage();
  },

  showUpgradePrompt: () => {
    const { showUpgradePrompt } = useMessageLimitStore.getState();
    showUpgradePrompt();
  },
}));

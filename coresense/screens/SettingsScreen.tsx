/**
 * Settings Screen (formerly PreferencesScreen)
 * A polished, user-friendly settings experience with all original logic preserved.
 *
 * PRESERVED: All variable names, store methods, and core logic
 * IMPROVED: Visual hierarchy, interactions, feedback, and accessibility
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { Card } from "../components/Card";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { PurpleButton } from "../components/PurpleButton";
import { useAuthStore } from "../stores/authStore";
import { useUserStore } from "../stores/userStore";
import {
  requestHealthKitPermissions,
} from "../utils/healthService";
import { useHealthStore } from "../stores/healthStore";
import { useThemeStore, ThemeMode } from "../stores/themeStore";
import { API_BASE_URL } from "../utils/apiConfig";
import {
  coresenseApi,
  NotificationPreferences,
} from "../utils/coresenseApi";
import {
  registerForPushNotifications,
} from "../utils/notificationService";

// ============================================================================
// CONSTANTS (UNCHANGED)
// ============================================================================

const FEEDBACK_EMAIL = "adedokuntosin1@gmail.com";

const DEFAULT_PREFERENCES = {
  id: "default",
  user_id: "",
  messaging_frequency: 3,
  response_length: "medium" as const,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
  quiet_hours_days: [1, 2, 3, 4, 5, 6, 7],
  accountability_level: 5,
  goals: [],
  healthkit_enabled: false,
  healthkit_sync_frequency: "daily",
  // NEW: Notification preferences
  push_notifications: true,
  task_reminders: true,
  weekly_reports: true,
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// TOAST COMPONENT - Success/Error Feedback
// ============================================================================

interface ToastProps {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const iconName = type === "success" ? "checkmark-circle" : type === "error" ? "alert-circle" : "information-circle";
  const iconColor = type === "success" ? Colors.success : type === "error" ? Colors.error : Colors.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  iconColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps & { colors: any }> = ({ icon, title, iconColor, colors }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconContainer, { backgroundColor: `${iconColor || colors.primary}15` }]}>
      <Ionicons name={icon} size={18} color={iconColor || colors.primary} />
    </View>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
  </View>
);

// ============================================================================
// SKELETON LOADER COMPONENT
// ============================================================================

const SkeletonLoader: React.FC<{ width?: number | string; height?: number }> = ({
  width = "100%",
  height = 20
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, opacity },
      ]}
    />
  );
};

// ============================================================================
// MAIN SETTINGS SCREEN COMPONENT
// ============================================================================

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { preferences, fetchPreferences, updatePreferences, profile } = useUserStore();

  // ============================================================================
  // STATE (Original names preserved)
  // ============================================================================

  const [localPrefs, setLocalPrefs] = useState(preferences || DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Feedback modal state (unchanged)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<"bug" | "feature" | "general">("general");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // HealthKit state - use healthStore as source of truth
  const healthKitEnabled = useHealthStore((state) => state.healthKitEnabled);
  const setHealthKitEnabled = useHealthStore((state) => state.setHealthKitEnabled);
  const healthKitAvailable = useHealthStore((state) => state.isAvailable);
  const healthKitPermissionsGranted = useHealthStore((state) => state.permissionsGranted);
  const [requestingHealthKit, setRequestingHealthKit] = useState(false);

  // Determine HealthKit status description
  const getHealthKitDescription = () => {
    if (!healthKitEnabled) {
      return "Enable to sync sleep, steps & activity data";
    }
    if (!healthKitAvailable) {
      return "Enabled - rebuild app to connect HealthKit";
    }
    if (!healthKitPermissionsGranted) {
      return "Enabled - grant permissions in Health settings";
    }
    return "Connected - syncing sleep, steps & activity data";
  };

  // Theme state
  const themeMode = useThemeStore((state) => state.mode);
  const isDark = useThemeStore((state) => state.isDark);
  const setThemeMode = useThemeStore((state) => state.setMode);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    notifications_enabled: true,
    task_reminders_enabled: true,
    coach_nudges_enabled: true,
    insights_enabled: true,
    streak_reminders_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    max_daily_notifications: 10,
  });
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(true);
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);
  const [sendingTestNotif, setSendingTestNotif] = useState(false);

  // NEW: Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false,
    message: "",
    type: "success",
  });

  // NEW: Time picker state
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // NEW: Last saved timestamp
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Animation refs
  const saveButtonAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setIsLoading(true);
        setNotifPrefsLoading(true);
        await fetchPreferences(user.id);
        // Load notification preferences
        const { data: notifData } = await coresenseApi.getNotificationPreferences();
        if (notifData) {
          setNotifPrefs(notifData);
        }
        setNotifPrefsLoading(false);
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    setLocalPrefs(preferences || DEFAULT_PREFERENCES);
  }, [preferences]);

  // HealthKit enabled state is now managed by healthStore - no need to check permissions on mount
  // The healthStore persists the enabled state and syncs data when enabled

  // Animate save button visibility
  useEffect(() => {
    Animated.spring(saveButtonAnim, {
      toValue: hasChanges ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [hasChanges]);

  // ============================================================================
  // HANDLERS (Original logic preserved)
  // ============================================================================

  const handleRequestHealthKitPermissions = async () => {
    setRequestingHealthKit(true);
    try {
      const result = await requestHealthKitPermissions();

      if (result.permissionsGranted) {
        setHealthKitEnabled(true);
        showToast("HealthKit connected successfully!", "success");
      } else {
        Alert.alert(
          "Permission Denied",
          "HealthKit permissions were not granted. You can try again later in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                Alert.alert(
                  "Note",
                  "Please go to Settings > Privacy & Security > Health to enable permissions."
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting HealthKit permissions:", error);
      showToast("Failed to connect HealthKit", "error");
    } finally {
      setRequestingHealthKit(false);
    }
  };

  const handleSave = async () => {
    if (!user || !localPrefs) return;

    setIsSaving(true);
    try {
      await updatePreferences(user.id, localPrefs);
      setHasChanges(false);
      setLastSaved(new Date());
      showToast("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error updating preferences:", error);
      showToast("Failed to save settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocalPref = (key: keyof typeof localPrefs, value: any) => {
    if (!localPrefs) return;
    setLocalPrefs({ ...localPrefs, [key]: value });
    setHasChanges(true);
  };

  // Send test notification
  const handleTestNotification = async () => {
    setSendingTestNotif(true);
    try {
      const { success, error } = await coresenseApi.sendTestNotification();
      if (success) {
        showToast("Test notification sent! Check your device.", "success");
      } else {
        showToast(error || "Failed to send test notification", "error");
      }
    } catch (e) {
      showToast("Failed to send test notification", "error");
    } finally {
      setSendingTestNotif(false);
    }
  };

  // Update notification preference (auto-saves to API)
  const updateNotifPref = async (key: keyof NotificationPreferences, value: any) => {
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs);

    // Auto-save notification preferences
    setSavingNotifPrefs(true);
    try {
      const { success, error } = await coresenseApi.updateNotificationPreferences({ [key]: value });
      if (success) {
        // If enabling push notifications, request permission and register token
        if (key === "notifications_enabled" && value === true) {
          const token = await registerForPushNotifications();
          if (token) {
            showToast("Notifications enabled", "success");
          } else {
            showToast("Enable notifications in device settings", "info");
          }
        } else {
          showToast("Preference saved", "success");
        }
      } else {
        showToast(error || "Failed to save preference", "error");
        // Revert on error
        setNotifPrefs(notifPrefs);
      }
    } catch (e) {
      showToast("Failed to save preference", "error");
      setNotifPrefs(notifPrefs);
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert("Required", "Please enter your feedback");
      return;
    }

    setSendingFeedback(true);

    try {
      const feedbackPayload = {
        category: feedbackCategory,
        message: feedbackText,
        userEmail: user?.email || "Anonymous",
        userName: profile?.username || "Unknown",
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(feedbackPayload),
        });

        if (response.ok) {
          showToast("Feedback submitted successfully!", "success");
          setFeedbackText("");
          setShowFeedbackModal(false);
        } else {
          throw new Error("Failed to send");
        }
      } catch (apiError) {
        showToast("Feedback recorded - thank you!", "success");
        setFeedbackText("");
        setShowFeedbackModal(false);
      }
    } catch (error) {
      showToast("Failed to submit feedback", "error");
    } finally {
      setSendingFeedback(false);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Format time to 12-hour format
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Convert Date to 24-hour time string
  const dateToTimeString = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Convert 24-hour time string to Date
  const timeStringToDate = (time: string): Date => {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Get frequency label
  const getFrequencyLabel = (freq: number): string => {
    if (freq <= 2) return "Low";
    if (freq <= 5) return "Medium";
    return "High";
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    Alert.alert(
      "Reset to Defaults",
      "This will restore all settings to their default values. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setLocalPrefs({ ...DEFAULT_PREFERENCES, user_id: user?.id || "" });
            setHasChanges(true);
            showToast("Settings reset to defaults", "info");
          },
        },
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const displayPrefs = localPrefs || DEFAULT_PREFERENCES;

  // Loading state with skeletons
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} style={styles.section}>
              <SkeletonLoader width={120} height={24} />
              <View style={{ marginTop: Spacing.md }}>
                <SkeletonLoader height={50} />
              </View>
              <View style={{ marginTop: Spacing.sm }}>
                <SkeletonLoader height={50} />
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: hasChanges ? 120 : Math.max(insets.bottom, Spacing.lg) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ================================================================ */}
          {/* SECTION 1: Account Profile */}
          {/* ================================================================ */}
          <TouchableOpacity
            style={[styles.accountLink, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("Account" as never)}
            activeOpacity={0.7}
            accessibilityLabel="View account settings"
            accessibilityHint="Opens your account profile"
            accessibilityRole="button"
          >
            <View style={styles.accountLinkContent}>
              <View style={[styles.accountAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.accountAvatarText, { color: '#FFFFFF' }]}>
                  {profile?.username?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.textPrimary }]}>
                  {profile?.username || "Your Account"}
                </Text>
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* ================================================================ */}
          {/* SECTION 2: Appearance */}
          {/* ================================================================ */}
          <Card style={styles.section}>
            <SectionHeader icon="color-palette-outline" title="Appearance" iconColor={colors.neonBlue} colors={colors} />

            <View style={styles.themeSelector}>
              <Text style={[styles.themeSelectorLabel, { color: colors.textPrimary }]}>Theme</Text>
              <View style={styles.themeOptions}>
                {(['light', 'dark'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.themeOption,
                      { backgroundColor: colors.surfaceMedium },
                      themeMode === mode && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }],
                    ]}
                    onPress={() => setThemeMode(mode)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mode === 'light' ? 'sunny-outline' : 'moon-outline'}
                      size={20}
                      color={themeMode === mode ? colors.primary : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.themeOptionText,
                        { color: colors.textTertiary },
                        themeMode === mode && [styles.themeOptionTextActive, { color: colors.primary }],
                      ]}
                    >
                      {mode === 'light' ? 'Light' : 'Dark'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={[styles.themeNote, { color: colors.textTertiary }]}>
              {isDark
                ? 'Dark mode is easier on the eyes at night'
                : 'Light mode for better visibility in bright environments'}
            </Text>
          </Card>

          {/* ================================================================ */}
          {/* SECTION 3: Notifications */}
          {/* ================================================================ */}
          <Card style={styles.section}>
            <SectionHeader icon="notifications-outline" title="Notifications" colors={colors} />

            <ToggleSwitch
              value={notifPrefs.notifications_enabled}
              onValueChange={(value) => updateNotifPref("notifications_enabled", value)}
              label="Push notifications"
              description="Receive notifications from Cora and the app"
              disabled={notifPrefsLoading || savingNotifPrefs}
            />

            <View style={styles.divider} />

            <ToggleSwitch
              value={notifPrefs.task_reminders_enabled}
              onValueChange={(value) => updateNotifPref("task_reminders_enabled", value)}
              label="Task reminders"
              description="Get reminded about upcoming and overdue tasks"
              disabled={notifPrefsLoading || savingNotifPrefs || !notifPrefs.notifications_enabled}
            />

            <View style={styles.divider} />

            <ToggleSwitch
              value={notifPrefs.coach_nudges_enabled}
              onValueChange={(value) => updateNotifPref("coach_nudges_enabled", value)}
              label="Coach nudges"
              description="Cora can nudge you about tasks and check-ins"
              disabled={notifPrefsLoading || savingNotifPrefs || !notifPrefs.notifications_enabled}
            />

            <View style={styles.divider} />

            <ToggleSwitch
              value={notifPrefs.insights_enabled}
              onValueChange={(value) => updateNotifPref("insights_enabled", value)}
              label="Insight notifications"
              description="Get notified when new insights are discovered"
              disabled={notifPrefsLoading || savingNotifPrefs || !notifPrefs.notifications_enabled}
            />

            <View style={styles.divider} />

            <ToggleSwitch
              value={notifPrefs.streak_reminders_enabled}
              onValueChange={(value) => updateNotifPref("streak_reminders_enabled", value)}
              label="Streak reminders"
              description="Get reminded when your streak is at risk"
              disabled={notifPrefsLoading || savingNotifPrefs || !notifPrefs.notifications_enabled}
            />

            <View style={styles.divider} />

            {/* Test Notification Button */}
            <TouchableOpacity
              style={[
                styles.testNotifButton,
                (!notifPrefs.notifications_enabled || sendingTestNotif) && styles.testNotifButtonDisabled
              ]}
              onPress={handleTestNotification}
              disabled={!notifPrefs.notifications_enabled || sendingTestNotif}
              activeOpacity={0.7}
            >
              {sendingTestNotif ? (
                <ActivityIndicator size="small" color={Colors.textPrimary} />
              ) : (
                <Ionicons name="notifications-outline" size={18} color={Colors.textPrimary} />
              )}
              <Text style={styles.testNotifButtonText}>
                {sendingTestNotif ? "Sending..." : "Send Test Notification"}
              </Text>
            </TouchableOpacity>
          </Card>

          {/* ================================================================ */}
          {/* SECTION 4: Quiet Hours */}
          {/* ================================================================ */}
          <Card style={styles.section}>
            <SectionHeader icon="moon-outline" title="Quiet Hours" iconColor={colors.neonBlue} colors={colors} />

            <ToggleSwitch
              value={notifPrefs.quiet_hours_enabled}
              onValueChange={(value) => updateNotifPref("quiet_hours_enabled", value)}
              label="Enable quiet hours"
              description="No notifications during these times"
              disabled={notifPrefsLoading || savingNotifPrefs}
            />

            {notifPrefs.quiet_hours_enabled && (
              <Animated.View style={styles.quietHoursExpanded}>
                <View style={styles.divider} />

                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerItem}>
                    <Text style={[styles.timePickerLabel, { color: colors.textTertiary }]}>Start</Text>
                    <TouchableOpacity
                      style={[styles.timePickerButton, { backgroundColor: colors.surfaceMedium, borderColor: colors.border }]}
                      onPress={() => setShowStartTimePicker(true)}
                      accessibilityLabel={`Start time: ${formatTime12Hour(notifPrefs.quiet_hours_start)}`}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={[styles.timePickerValue, { color: colors.textPrimary }]}>
                        {formatTime12Hour(notifPrefs.quiet_hours_start)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timePickerDivider}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                  </View>

                  <View style={styles.timePickerItem}>
                    <Text style={[styles.timePickerLabel, { color: colors.textTertiary }]}>End</Text>
                    <TouchableOpacity
                      style={[styles.timePickerButton, { backgroundColor: colors.surfaceMedium, borderColor: colors.border }]}
                      onPress={() => setShowEndTimePicker(true)}
                      accessibilityLabel={`End time: ${formatTime12Hour(notifPrefs.quiet_hours_end)}`}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={[styles.timePickerValue, { color: colors.textPrimary }]}>
                        {formatTime12Hour(notifPrefs.quiet_hours_end)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.quietHoursNote, { color: colors.textTertiary }]}>
                  Notifications sent during quiet hours will be delivered when they end
                </Text>
              </Animated.View>
            )}
          </Card>

          {/* ================================================================ */}
          {/* SECTION 5: Coach Interaction */}
          {/* ================================================================ */}
          <Card style={styles.section}>
            <SectionHeader icon="chatbubbles-outline" title="Coach Interaction" iconColor={colors.neonPink} colors={colors} />

            {/* Frequency Slider */}
            <View style={styles.frequencyContainer}>
              <View style={styles.frequencyHeader}>
                <Text style={styles.frequencyTitle}>Message Frequency</Text>
                <View style={styles.frequencyBadge}>
                  <Text style={styles.frequencyBadgeText}>
                    {getFrequencyLabel(displayPrefs.messaging_frequency)}
                  </Text>
                </View>
              </View>
              <Text style={styles.frequencyDescription}>
                {displayPrefs.messaging_frequency} messages per day
              </Text>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>1</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={7}
                  step={1}
                  value={displayPrefs.messaging_frequency}
                  onValueChange={(value) => updateLocalPref("messaging_frequency", value)}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.surfaceMedium}
                  thumbTintColor={Colors.primary}
                />
                <Text style={styles.sliderLabel}>7</Text>
              </View>

              <View style={styles.frequencyLabels}>
                <Text style={styles.frequencyLabelText}>Low</Text>
                <Text style={styles.frequencyLabelText}>Medium</Text>
                <Text style={styles.frequencyLabelText}>High</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Feedback Button */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowFeedbackModal(true)}
              activeOpacity={0.7}
              accessibilityLabel="Give feedback"
              accessibilityHint="Opens feedback form"
              accessibilityRole="button"
            >
              <View style={styles.actionRowIcon}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.actionRowContent}>
                <Text style={styles.actionRowTitle}>Give Feedback</Text>
                <Text style={styles.actionRowDescription}>Help us improve your experience</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </Card>

          {/* ================================================================ */}
          {/* SECTION 6: Health Data (iOS only) */}
          {/* ================================================================ */}
          {Platform.OS === "ios" && (
            <Card style={styles.section}>
              <SectionHeader icon="fitness-outline" title="Health Data" iconColor={colors.primary} colors={colors} />

              <ToggleSwitch
                value={healthKitEnabled}
                onValueChange={async (value) => {
                  if (value) {
                    // Turning ON - request permissions and enable syncing
                    setRequestingHealthKit(true);
                    try {
                      const result = await requestHealthKitPermissions();

                      if (!result.isAvailable) {
                        // Native module not available - still enable the setting
                        // so it will work when the app is properly rebuilt
                        setHealthKitEnabled(true);
                        updateLocalPref("healthkit_enabled" as any, true);
                        showToast("HealthKit enabled. Please rebuild the app to connect.", "info");
                      } else if (result.permissionsGranted) {
                        setHealthKitEnabled(true);
                        updateLocalPref("healthkit_enabled" as any, true);
                        showToast("HealthKit connected successfully!", "success");
                      } else {
                        // HealthKit available but permissions denied
                        // Still enable the setting - user may grant permissions later
                        setHealthKitEnabled(true);
                        updateLocalPref("healthkit_enabled" as any, true);
                        showToast("HealthKit enabled. Please grant permissions in Settings > Privacy > Health.", "info");
                      }
                    } catch (error) {
                      console.error("Error enabling HealthKit:", error);
                      // Still enable the setting on error
                      setHealthKitEnabled(true);
                      updateLocalPref("healthkit_enabled" as any, true);
                      showToast("HealthKit enabled but may need permissions.", "info");
                    } finally {
                      setRequestingHealthKit(false);
                    }
                  } else {
                    // Turning OFF - disable syncing without revoking OS permissions
                    setHealthKitEnabled(false);
                    updateLocalPref("healthkit_enabled" as any, false);
                    showToast("HealthKit disabled. Your data won't be synced.", "info");
                  }
                }}
                label="HealthKit Integration"
                description={getHealthKitDescription()}
                disabled={requestingHealthKit}
              />

              {!healthKitEnabled && (
                <View style={[styles.healthKitBenefits, { backgroundColor: colors.surfaceMedium }]}>
                  <Text style={[styles.healthKitBenefitsTitle, { color: colors.textPrimary }]}>Benefits of connecting:</Text>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Personalized coaching based on your activity</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Sleep insights for better rest</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Progress tracking and trends</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.healthKitNote, { color: colors.textTertiary, backgroundColor: colors.surfaceMedium }]}>
                CoreSense uses HealthKit data including steps, sleep, and activity to provide
                personalized coaching insights. You can revoke access in your device's Health settings at any time.
              </Text>
            </Card>
          )}

          {/* ================================================================ */}
          {/* FOOTER */}
          {/* ================================================================ */}
          <View style={styles.footer}>
            {lastSaved && (
              <Text style={styles.lastSavedText}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </Text>
            )}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetToDefaults}
              activeOpacity={0.7}
              accessibilityLabel="Reset to default settings"
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={16} color={Colors.textTertiary} />
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>CoreSense v1.0.0</Text>
          </View>
        </ScrollView>

        {/* Sticky Save Button */}
        <Animated.View
          style={[
            styles.stickyButtonContainer,
            {
              transform: [
                {
                  translateY: saveButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
              opacity: saveButtonAnim,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <PurpleButton
            title={isSaving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
        </Animated.View>
      </View>

      {/* ================================================================ */}
      {/* TIME PICKER MODALS */}
      {/* ================================================================ */}
      {showStartTimePicker && (
        <Modal transparent animationType="fade" visible={showStartTimePicker}>
          <TouchableOpacity
            style={styles.timePickerModal}
            activeOpacity={1}
            onPress={() => setShowStartTimePicker(false)}
          >
            <View style={[styles.timePickerModalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.timePickerModalTitle, { color: colors.textPrimary }]}>Set Start Time</Text>
              <DateTimePicker
                value={timeStringToDate(notifPrefs.quiet_hours_start)}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    updateNotifPref("quiet_hours_start", dateToTimeString(date));
                  }
                }}
                textColor={colors.textPrimary}
              />
              <TouchableOpacity
                style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowStartTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showEndTimePicker && (
        <Modal transparent animationType="fade" visible={showEndTimePicker}>
          <TouchableOpacity
            style={styles.timePickerModal}
            activeOpacity={1}
            onPress={() => setShowEndTimePicker(false)}
          >
            <View style={[styles.timePickerModalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.timePickerModalTitle, { color: colors.textPrimary }]}>Set End Time</Text>
              <DateTimePicker
                value={timeStringToDate(notifPrefs.quiet_hours_end)}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    updateNotifPref("quiet_hours_end", dateToTimeString(date));
                  }
                }}
                textColor={colors.textPrimary}
              />
              <TouchableOpacity
                style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowEndTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* FEEDBACK MODAL (Original logic preserved, improved styling) */}
      {/* ================================================================ */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Share Feedback</Text>
              <TouchableOpacity
                onPress={() => setShowFeedbackModal(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close feedback modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(["bug", "feature", "general"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: colors.surfaceMedium },
                    feedbackCategory === cat && [styles.categoryButtonActive, { borderColor: colors.primary, backgroundColor: colors.background }],
                  ]}
                  onPress={() => setFeedbackCategory(cat)}
                  accessibilityLabel={`Select ${cat} category`}
                  accessibilityState={{ selected: feedbackCategory === cat }}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={cat === "bug" ? "bug" : cat === "feature" ? "bulb" : "chatbubble"}
                    size={16}
                    color={feedbackCategory === cat ? colors.textPrimary : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: colors.textTertiary },
                      feedbackCategory === cat && [styles.categoryTextActive, { color: colors.primary }],
                    ]}
                  >
                    {cat === "bug" ? "Bug" : cat === "feature" ? "Feature" : "General"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Your feedback</Text>
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: colors.surfaceMedium, color: colors.textPrimary }]}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={5}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
              accessibilityLabel="Feedback text input"
            />

            <PurpleButton
              title={sendingFeedback ? "Sending..." : "Submit Feedback"}
              onPress={handleSubmitFeedback}
              disabled={sendingFeedback || !feedbackText.trim()}
              style={styles.submitButton}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },

  // Toast
  toast: {
    position: "absolute",
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    zIndex: 1000,
    ...Shadows.elevated,
  },
  toastText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },

  // Skeleton
  skeleton: {
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.small,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },

  // Sections
  section: {
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // Theme Selector
  themeSelector: {
    marginBottom: Spacing.md,
  },
  themeSelectorLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "500",
    marginBottom: Spacing.md,
  },
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted || `${Colors.primary}15`,
  },
  themeOptionText: {
    ...Typography.body,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
  themeOptionTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  themeNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  // Account Link
  accountLink: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  accountLinkContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  accountAvatarText: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: 4,
  },
  accountEmail: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Test Notification Button
  testNotifButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },
  testNotifButtonDisabled: {
    backgroundColor: Colors.surfaceMedium,
    opacity: 0.6,
  },
  testNotifButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },

  // Quiet Hours
  quietHoursExpanded: {
    marginTop: Spacing.sm,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  timePickerItem: {
    alignItems: "center",
  },
  timePickerLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceMedium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timePickerValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  timePickerDivider: {
    paddingHorizontal: Spacing.sm,
  },
  quietHoursNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  // Time Picker Modal
  timePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    width: SCREEN_WIDTH - Spacing.xl * 2,
    alignItems: "center",
  },
  timePickerModalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  timePickerDoneButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
  },
  timePickerDoneText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },

  // Frequency Slider
  frequencyContainer: {
    marginBottom: Spacing.md,
  },
  frequencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  frequencyTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  frequencyBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  frequencyBadgeText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  frequencyDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    width: 16,
    textAlign: "center",
  },
  frequencyLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  frequencyLabelText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },

  // Action Rows
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  actionRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceMedium,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  actionRowContent: {
    flex: 1,
  },
  actionRowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "500",
    marginBottom: 2,
  },
  actionRowDescription: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },

  // HealthKit
  healthKitContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  healthKitInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: Spacing.md,
  },
  healthKitStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  healthKitText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  healthKitTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: 4,
  },
  healthKitDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  healthKitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 80,
    alignItems: "center",
  },
  healthKitButtonText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
  },
  healthKitBenefits: {
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  healthKitBenefitsTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  benefitText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  healthKitNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    backgroundColor: Colors.surfaceMedium,
    padding: Spacing.sm,
    borderRadius: BorderRadius.small,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  lastSavedText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  resetButtonText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  // Sticky Save Button
  stickyButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  saveButton: {
    marginBottom: 0,
  },

  // Modal Styles (Preserved)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  modalLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: "transparent",
  },
  categoryButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  categoryText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  categoryTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  feedbackInput: {
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    minHeight: 120,
    color: Colors.textPrimary,
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});

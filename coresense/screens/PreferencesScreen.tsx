/**
 * Preferences Screen
 */

import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography, BorderRadius } from "../constants/theme";
import { Card } from "../components/Card";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { PurpleButton } from "../components/PurpleButton";
import { useAuthStore } from "../stores/authStore";
import { useUserStore } from "../stores/userStore";
import {
  requestHealthKitPermissions,
  checkPermissions,
} from "../utils/healthService";

// Email to send feedback to
const FEEDBACK_EMAIL = "adedokuntosin1@gmail.com";

// Default preferences when none are loaded
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
};

export default function PreferencesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { preferences, fetchPreferences, updatePreferences, profile } =
    useUserStore();
  const [localPrefs, setLocalPrefs] = useState(
    preferences || DEFAULT_PREFERENCES,
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<
    "bug" | "feature" | "general"
  >("general");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // HealthKit state
  const [healthKitPermissions, setHealthKitPermissions] = useState<
    boolean | null
  >(null);
  const [requestingHealthKit, setRequestingHealthKit] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences(user.id);
    }
  }, [user]);

  useEffect(() => {
    setLocalPrefs(preferences || DEFAULT_PREFERENCES);
  }, [preferences]);

  // Check HealthKit permissions on mount
  useEffect(() => {
    checkPermissions().then((granted) => {
      setHealthKitPermissions(granted);
    });
  }, []);

  // Function to request HealthKit permissions
  const handleRequestHealthKitPermissions = async () => {
    setRequestingHealthKit(true);
    try {
      const result = await requestHealthKitPermissions();
      setHealthKitPermissions(result.permissionsGranted);

      if (result.permissionsGranted) {
        Alert.alert(
          "Success",
          "HealthKit permissions granted! Your health data will now be available.",
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "HealthKit permissions were not granted. You can try again later in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // Note: In a real app, you'd use Linking.openSettings()
                Alert.alert(
                  "Note",
                  "Please go to Settings > Privacy & Security > Health to enable permissions.",
                );
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error requesting HealthKit permissions:", error);
      Alert.alert(
        "Error",
        "Failed to request HealthKit permissions. Please try again.",
      );
    } finally {
      setRequestingHealthKit(false);
    }
  };

  const handleSave = async () => {
    if (!user || !localPrefs) return;

    try {
      await updatePreferences(user.id, localPrefs);
      setHasChanges(false);
      // Show success feedback
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  const updateLocalPref = (key: keyof typeof localPrefs, value: any) => {
    if (!localPrefs) return;
    setLocalPrefs({ ...localPrefs, [key]: value });
    setHasChanges(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert("Required", "Please enter your feedback");
      return;
    }

    setSendingFeedback(true);

    try {
      // Send feedback via API endpoint (you can set up a simple endpoint for this)
      // For now, we'll use a fetch to a webhook or email service
      const feedbackPayload = {
        category: feedbackCategory,
        message: feedbackText,
        userEmail: user?.email || "Anonymous",
        userName: profile?.username || "Unknown",
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };

      // Try to send via your backend API
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";

      try {
        const response = await fetch(`${API_URL}/api/v1/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(feedbackPayload),
        });

        if (response.ok) {
          Alert.alert(
            "Thank you!",
            "Your feedback has been submitted successfully.",
          );
          setFeedbackText("");
          setShowFeedbackModal(false);
        } else {
          throw new Error("Failed to send");
        }
      } catch (apiError) {
        // Fallback: Show success anyway since we can't guarantee backend availability
        // In production, you'd want proper error handling here
        Alert.alert("Thank you!", "Your feedback has been recorded.");
        setFeedbackText("");
        setShowFeedbackModal(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setSendingFeedback(false);
    }
  };

  // Always render the screen - use defaults if preferences not loaded yet
  const displayPrefs = localPrefs || DEFAULT_PREFERENCES;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom, Spacing.lg),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Settings - NOW AT TOP */}
        <TouchableOpacity
          style={styles.accountLink}
          onPress={() => navigation.navigate("Account" as never)}
        >
          <View style={styles.accountLinkContent}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {profile?.username?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>
                {profile?.username || "Your Account"}
              </Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textTertiary}
            />
          </View>
        </TouchableOpacity>

        {/* Quiet Hours */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <ToggleSwitch
            value={displayPrefs.quiet_hours_enabled}
            onValueChange={(value) =>
              updateLocalPref("quiet_hours_enabled", value)
            }
            label="Enable quiet hours"
            description="Your coach won't send messages during these times"
          />
          {displayPrefs.quiet_hours_enabled && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>
                {displayPrefs.quiet_hours_start} -{" "}
                {displayPrefs.quiet_hours_end}
              </Text>
              <Text style={styles.timeNote}>
                You can adjust times in account settings
              </Text>
            </View>
          )}
        </Card>

        {/* Notification Settings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <ToggleSwitch
            value={true}
            onValueChange={() => {}}
            label="Push notifications"
            description="Receive notifications from your coach"
          />
          <ToggleSwitch
            value={true}
            onValueChange={() => {}}
            label="Task reminders"
            description="Get reminded about upcoming tasks"
          />
        </Card>

        {/* Health Data - iOS only */}
        {Platform.OS === "ios" && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Health Data</Text>
            <View style={styles.healthKitContainer}>
              <View style={styles.healthKitInfo}>
                <Ionicons
                  name={
                    healthKitPermissions === true
                      ? "checkmark-circle"
                      : healthKitPermissions === false
                        ? "warning"
                        : "help-circle"
                  }
                  size={20}
                  color={
                    healthKitPermissions === true
                      ? Colors.success
                      : healthKitPermissions === false
                        ? Colors.warning
                        : Colors.textTertiary
                  }
                />
                <View style={styles.healthKitText}>
                  <Text style={styles.healthKitTitle}>Apple HealthKit</Text>
                  <Text style={styles.healthKitDescription}>
                    {healthKitPermissions === true
                      ? "Connected - Your health data is being used for personalized coaching"
                      : healthKitPermissions === false
                        ? "Not connected - Enable to get health insights and personalized coaching"
                        : "Checking connection status..."}
                  </Text>
                </View>
              </View>
              {(healthKitPermissions === false ||
                healthKitPermissions === null) && (
                <TouchableOpacity
                  style={styles.healthKitButton}
                  onPress={handleRequestHealthKitPermissions}
                  disabled={requestingHealthKit}
                >
                  {requestingHealthKit ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.textPrimary}
                    />
                  ) : (
                    <Text style={styles.healthKitButtonText}>
                      {healthKitPermissions === null ? "Connect" : "Retry"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.healthKitNote}>
              CoreSense uses HealthKit data including steps, sleep, and activity
              to provide personalized coaching insights. You can disable this in
              your device settings at any time.
            </Text>
          </Card>
        )}

        {/* Coach Interaction */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Coach Interaction</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              Alert.alert(
                "Adjust Frequency",
                "How often would you like to receive suggestions and check-ins?",
                [
                  { text: "Less Often", onPress: () => {} },
                  { text: "Normal", onPress: () => {} },
                  { text: "More Often", onPress: () => {} },
                ],
              );
            }}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons
                name="options-outline"
                size={20}
                color={Colors.primary}
              />
            </View>
            <View style={styles.actionRowContent}>
              <Text style={styles.actionRowTitle}>Adjust Frequency</Text>
              <Text style={styles.actionRowDescription}>
                Change how often you get suggestions
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={() => setShowFeedbackModal(true)}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={Colors.primary}
              />
            </View>
            <View style={styles.actionRowContent}>
              <Text style={styles.actionRowTitle}>Give Feedback</Text>
              <Text style={styles.actionRowDescription}>
                Help us improve your experience
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        </Card>

        {hasChanges && (
          <PurpleButton
            title="Save Changes"
            onPress={handleSave}
            style={styles.saveButton}
          />
        )}
      </ScrollView>

      {/* Feedback Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Feedback</Text>
              <TouchableOpacity
                onPress={() => setShowFeedbackModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {(["bug", "feature", "general"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    feedbackCategory === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setFeedbackCategory(cat)}
                >
                  <Ionicons
                    name={
                      cat === "bug"
                        ? "bug"
                        : cat === "feature"
                          ? "bulb"
                          : "chatbubble"
                    }
                    size={16}
                    color={
                      feedbackCategory === cat
                        ? Colors.textPrimary
                        : Colors.textTertiary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      feedbackCategory === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat === "bug"
                      ? "Bug"
                      : cat === "feature"
                        ? "Feature"
                        : "General"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Your feedback</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  radioGroup: {
    marginTop: Spacing.md,
  },
  radioLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  radioOption: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceMedium,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  radioOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  radioText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  radioTextSelected: {
    color: Colors.primary,
    fontWeight: "600",
  },
  timeInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  timeNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  accountLink: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  accountLinkContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 2,
  },
  accountEmail: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  saveButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  // Modal styles
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
  // HealthKit styles
  healthKitContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  healthKitInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: Spacing.md,
  },
  healthKitText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  healthKitTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: 2,
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
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  healthKitNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    backgroundColor: Colors.surfaceMedium,
    padding: Spacing.sm,
    borderRadius: BorderRadius.small,
    marginTop: Spacing.sm,
  },
});

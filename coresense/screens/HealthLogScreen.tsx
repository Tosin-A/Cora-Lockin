/**
 * Health Log Screen
 * Manual logging for mood, stress, water intake, and nutrition
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography, BorderRadius } from "../constants/theme";
import { Card } from "../components";

export default function HealthLogScreen() {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [water, setWater] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleLogMood = async (value: number) => {
    setMood(value);
    await logHealthData("mood", value);
  };

  const handleLogStress = async (value: number) => {
    setStress(value);
    await logHealthData("stress", value);
  };

  const handleLogWater = async () => {
    const value = parseFloat(water);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount");
      return;
    }
    await logHealthData("water", value, "ml");
    setWater("");
  };

  const logHealthData = async (
    logType: string,
    value: number,
    unit?: string,
  ) => {
    try {
      const { supabase } = await import("../utils/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert("Error", "Please log in to log health data");
        return;
      }

      const API_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000";
      const response = await fetch(`${API_URL}/api/v1/wellness/logs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          log_type: logType,
          value: value,
          unit: unit,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log data");
      }

      Alert.alert(
        "Success",
        `${logType.charAt(0).toUpperCase() + logType.slice(1)} logged successfully`,
      );
    } catch (error: any) {
      console.error("Error logging health data:", error);
      Alert.alert("Error", "Failed to log health data");
    }
  };

  const MoodPicker = () => {
    const moods = [
      { value: 1, emoji: "😢", label: "Very Low" },
      { value: 3, emoji: "😕", label: "Low" },
      { value: 5, emoji: "😐", label: "Neutral" },
      { value: 7, emoji: "🙂", label: "Good" },
      { value: 9, emoji: "😄", label: "Great" },
    ];

    return (
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>How are you feeling?</Text>
        <View style={styles.moodContainer}>
          {moods.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.moodButton,
                mood === m.value && styles.moodButtonSelected,
              ]}
              onPress={() => handleLogMood(m.value)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    );
  };

  const StressSlider = () => {
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    return (
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Stress Level (1-10)</Text>
        <View style={styles.stressContainer}>
          {levels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.stressButton,
                stress === level && styles.stressButtonSelected,
              ]}
              onPress={() => handleLogStress(level)}
            >
              <Text
                style={[
                  styles.stressButtonText,
                  stress === level && styles.stressButtonTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.stressLabel}>
          {stress
            ? `${stress}/10 - ${stress <= 3 ? "Low" : stress <= 6 ? "Moderate" : "High"} Stress`
            : "Select your stress level"}
        </Text>
      </Card>
    );
  };

  const WaterTracker = () => (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Water Intake</Text>
      <View style={styles.waterContainer}>
        <TextInput
          style={styles.waterInput}
          placeholder="Amount in ml"
          placeholderTextColor={Colors.textTertiary}
          value={water}
          onChangeText={setWater}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.waterButton} onPress={handleLogWater}>
          <Ionicons name="add" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.waterHint}>Recommended: 2000ml (8 cups) per day</Text>
    </Card>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Log Health Data</Text>
        <Text style={styles.subtitle}>
          Track your mood, stress, and hydration
        </Text>
      </View>

      <MoodPicker />
      <StressSlider />
      <WaterTracker />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any additional notes..."
          placeholderTextColor={Colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </Card>
    </ScrollView>
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
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  card: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  moodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  moodButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.surface,
    minWidth: 60,
  },
  moodButtonSelected: {
    backgroundColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  moodLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  stressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  stressButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.small,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stressButtonSelected: {
    backgroundColor: Colors.primary,
  },
  stressButtonText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  stressButtonTextSelected: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  stressLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  waterContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  waterInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
  },
  waterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  waterHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  notesInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    minHeight: 100,
    textAlignVertical: "top",
  },
});

/**
 * Status Banner Component
 * Shows user's current streak, mood, or sleep status
 * Uses icons instead of emojis for consistency
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface StatusBannerProps {
  streak?: number;
  mood?: 'great' | 'good' | 'okay' | 'low';
  sleepHours?: number | null;
  lastCheckIn?: Date;
}

const moodIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  great: 'happy',
  good: 'happy-outline',
  okay: 'remove-circle-outline',
  low: 'sad-outline',
};

const moodLabels = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
};

export default function StatusBanner({
  streak,
  mood,
  sleepHours,
  lastCheckIn,
}: StatusBannerProps) {
  const getStatusData = (): { text: string; icon: keyof typeof Ionicons.glyphMap; color: string } => {
    if (streak && streak > 0) {
      return { text: `${streak}-day streak`, icon: 'flame', color: Colors.warning };
    }
    if (mood) {
      return { text: `Mood: ${moodLabels[mood]}`, icon: moodIcons[mood], color: Colors.accent };
    }
    if (sleepHours !== undefined && sleepHours !== null) {
      if (sleepHours < 7) {
        return { text: `${sleepHours.toFixed(1)}h sleep last night`, icon: 'moon', color: Colors.info };
      }
      return { text: `${sleepHours.toFixed(1)}h of good sleep`, icon: 'moon', color: Colors.success };
    }
    return { text: 'Ready for your check-in?', icon: 'sparkles', color: Colors.accent };
  };

  const { text, icon, color } = getStatusData();

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  text: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
});

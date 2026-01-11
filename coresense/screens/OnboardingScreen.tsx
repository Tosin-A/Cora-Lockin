/**
 * Onboarding Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { PurpleButton } from '../components/PurpleButton';
import { Card } from '../components/Card';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';

const { width } = Dimensions.get('window');
const GOALS = ['Study', 'Health', 'Habits', 'Sleep', 'Focus'];
const STYLES = [
  { value: 'firm', label: 'Firm & Direct', preview: "Let's get this done. No excuses." },
  { value: 'balanced', label: 'Balanced', preview: "How's it going? Ready to tackle this?" },
  { value: 'supportive', label: 'Supportive & Gentle', preview: "You've got this! I'm here to help." },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { updatePreferences } = useUserStore();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [style, setStyle] = useState<'firm' | 'balanced' | 'supportive'>('balanced');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter((g) => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    try {
      await updatePreferences(user.id, {
        goals,
        messaging_style: style,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
      });
      // Navigation handled by AppNavigator
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Welcome to CoreSense</Text>
            <Text style={styles.stepSubtitle}>
              Let's set up your coach
            </Text>
            <Card variant="purple" style={styles.welcomeCard}>
              <Text style={styles.welcomeText}>
                Your personal coach is ready to help you stay on track with your goals.
              </Text>
            </Card>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What are you working on?</Text>
            <Text style={styles.stepSubtitle}>Select all that apply</Text>
            <View style={styles.goalsGrid}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalTile,
                    goals.includes(goal) && styles.goalTileSelected,
                  ]}
                  onPress={() => toggleGoal(goal)}
                >
                  <Text
                    style={[
                      styles.goalText,
                      goals.includes(goal) && styles.goalTextSelected,
                    ]}
                  >
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How should your coach talk?</Text>
            <Text style={styles.stepSubtitle}>Choose a style that works for you</Text>
            {STYLES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.styleOption,
                  style === s.value && styles.styleOptionSelected,
                ]}
                onPress={() => setStyle(s.value as any)}
              >
                <Text
                  style={[
                    styles.styleLabel,
                    style === s.value && styles.styleLabelSelected,
                  ]}
                >
                  {s.label}
                </Text>
                <Text style={styles.stylePreview}>{s.preview}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>When should your coach be quiet?</Text>
            <Text style={styles.stepSubtitle}>Set your quiet hours</Text>
            <Card>
              <ToggleSwitch
                value={quietHoursEnabled}
                onValueChange={setQuietHoursEnabled}
                label="Respect quiet hours"
                description="Your coach won't send messages during these times"
              />
              {quietHoursEnabled && (
                <View style={styles.timeContainer}>
                  <Text style={styles.timeLabel}>Start: {quietHoursStart}</Text>
                  <Text style={styles.timeLabel}>End: {quietHoursEnd}</Text>
                  <Text style={styles.timeNote}>
                    You can adjust these later in settings
                  </Text>
                </View>
              )}
            </Card>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressDots}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {step > 0 && (
            <PurpleButton
              title="Back"
              onPress={() => setStep(step - 1)}
              variant="secondary"
              style={styles.backButton}
            />
          )}
          <PurpleButton
            title={step === 3 ? 'Finish' : 'Continue'}
            onPress={() => {
              if (step === 3) {
                handleFinish();
              } else {
                setStep(step + 1);
              }
            }}
            style={styles.continueButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  welcomeCard: {
    marginTop: Spacing.xl,
  },
  welcomeText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  goalTile: {
    width: (width - Spacing.lg * 3) / 2,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  goalTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMedium,
  },
  goalText: {
    ...Typography.h3,
    color: Colors.textSecondary,
  },
  goalTextSelected: {
    color: Colors.primary,
  },
  styleOption: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  styleOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMedium,
  },
  styleLabel: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  styleLabelSelected: {
    color: Colors.primary,
  },
  stylePreview: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  timeContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  timeNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceMedium,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});








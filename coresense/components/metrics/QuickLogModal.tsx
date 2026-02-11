/**
 * QuickLogModal - Modal for quick check-in (log energy, mood, stress)
 * Native Soft Precision - clean bottom sheet with generous touch targets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows, TouchTarget } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MetricType } from '../../types/metrics';
import type { MetricInput } from '../../types/metrics';

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (metrics: MetricInput[]) => Promise<boolean>;
}

export function QuickLogModal({ visible, onClose, onSubmit }: QuickLogModalProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const metrics: MetricInput[] = [];

    if (energy !== null) {
      metrics.push({ metric_type: MetricType.ENERGY, value: energy });
    }
    if (mood !== null) {
      metrics.push({ metric_type: MetricType.MOOD, value: mood });
    }
    if (stress !== null) {
      metrics.push({ metric_type: MetricType.STRESS, value: stress });
    }
    if (sleepHours !== null) {
      metrics.push({ metric_type: MetricType.SLEEP, value: sleepHours });
    }

    if (metrics.length === 0) {
      return;
    }

    try {
      setSubmitting(true);
      const success = await onSubmit(metrics);

      if (success) {
        // Reset and close
        setEnergy(null);
        setMood(null);
        setStress(null);
        setSleepHours(null);
        onClose();
      }
    } catch (error) {
      console.error('[QuickLogModal] Error submitting metrics:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setEnergy(null);
      setMood(null);
      setStress(null);
      setSleepHours(null);
      onClose();
    }
  };

  const renderScale = (
    label: string,
    value: number | null,
    onChange: (v: number) => void,
    icon: string,
    labels?: string[]
  ) => (
    <View style={styles.scaleContainer}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleIcon}>{icon}</Text>
        <Text style={[styles.scaleLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={styles.scaleButtons}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.scaleButton,
              { backgroundColor: colors.background, borderColor: colors.border },
              value === num && [styles.scaleButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => onChange(num)}
            disabled={submitting}
          >
            <Text
              style={[
                styles.scaleButtonText,
                { color: colors.textSecondary },
                value === num && styles.scaleButtonTextActive,
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {labels && (
        <View style={styles.scaleLabels}>
          <Text style={[styles.scaleLabelText, { color: colors.textTertiary }]}>{labels[0]}</Text>
          <Text style={[styles.scaleLabelText, { color: colors.textTertiary }]}>{labels[1]}</Text>
        </View>
      )}
    </View>
  );

  const hasSelections = energy !== null || mood !== null || stress !== null || sleepHours !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.modal, { paddingBottom: Math.max(insets.bottom, Spacing.lg), backgroundColor: colors.surface, ...shadows.elevated }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Quick Check-In</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              disabled={submitting}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>How are you feeling right now?</Text>

            {renderScale(
              'Energy Level',
              energy,
              setEnergy,
              '\u26A1',
              ['Low', 'High']
            )}

            {renderScale(
              'Mood',
              mood,
              setMood,
              '\u{1F60A}',
              ['Bad', 'Great']
            )}

            {renderScale(
              'Stress Level',
              stress,
              setStress,
              '\u{1F4A8}',
              ['Calm', 'Stressed']
            )}

            {/* Sleep Hours */}
            <View style={styles.scaleContainer}>
              <View style={styles.scaleHeader}>
                <Text style={styles.scaleIcon}>{'\u{1F319}'}</Text>
                <Text style={[styles.scaleLabel, { color: colors.textPrimary }]}>Sleep (last night)</Text>
              </View>
              <View style={styles.scaleButtons}>
                {[4, 5, 6, 7, 8, 9].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.scaleButton,
                      styles.scaleButtonSmall,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      sleepHours === hours && [styles.scaleButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                    onPress={() => setSleepHours(hours)}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.scaleButtonText,
                        { color: colors.textSecondary },
                        sleepHours === hours && styles.scaleButtonTextActive,
                      ]}
                    >
                      {hours}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.scaleLabels}>
                <Text style={[styles.scaleLabelText, { color: colors.textTertiary }]}>Too little</Text>
                <Text style={[styles.scaleLabelText, { color: colors.textTertiary }]}>Great</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary, ...shadows.medium },
                !hasSelections && [styles.submitButtonDisabled, { backgroundColor: colors.textMuted }],
              ]}
              onPress={handleSubmit}
              disabled={submitting || !hasSelections}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Save Check-In
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
    ...Shadows.elevated,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: TouchTarget.minimum,
    height: TouchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  scaleContainer: {
    marginBottom: Spacing.xl,
  },
  scaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scaleIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  scaleLabel: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  scaleButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: TouchTarget.minimum,
  },
  scaleButtonSmall: {
    aspectRatio: undefined,
    paddingVertical: Spacing.md,
  },
  scaleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scaleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scaleButtonTextActive: {
    color: '#FFFFFF',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  scaleLabelText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.minimum + 8,
    ...Shadows.medium,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
  },
  submitButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
});

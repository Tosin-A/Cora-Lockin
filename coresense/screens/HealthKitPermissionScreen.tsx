/**
 * HealthKit Permission Screen
 * Requests HealthKit permissions before app entry - critical for accountability coach
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealthStore } from '../stores/healthStore';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

export default function HealthKitPermissionScreen() {
  const { 
    isAvailable, 
    permissionsGranted, 
    isInitializing, 
    initialize, 
    requestPermissions,
    todayData 
  } = useHealthStore();
  
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [showHealthData, setShowHealthData] = useState(false);

  useEffect(() => {
    // Initialize HealthKit on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Show health data after permissions are granted and data is loaded
    if (permissionsGranted && todayData) {
      setShowHealthData(true);
    }
  }, [permissionsGranted, todayData]);

  const handleRequestPermissions = async () => {
    setPermissionRequested(true);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Health Data Access',
          'HealthKit permissions are required for the full accountability coach experience. You can grant permissions later in Settings.',
          [
            {
              text: 'Continue Without Health Data',
              style: 'default',
            },
            {
              text: 'Try Again',
              style: 'default',
              onPress: () => setPermissionRequested(false),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setPermissionRequested(false);
    }
  };

  const handleContinue = () => {
    // This would typically navigate to the main app
    // For now, we'll just log success
    console.log('Continuing to app with HealthKit:', { 
      permissionsGranted, 
      todayData: todayData ? 'Data available' : 'No data yet' 
    });
  };

  // Show loading while initializing
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking HealthKit availability...</Text>
        </View>
      </View>
    );
  }

  // Show health data if permissions granted
  if (permissionsGranted && showHealthData && todayData) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.title}>Health Data Connected</Text>
            <Text style={styles.subtitle}>
              Your health metrics are now integrated with your accountability coach
            </Text>
          </View>

          <View style={styles.healthDataCard}>
            <Text style={styles.healthDataTitle}>Today's Health Summary</Text>
            
            <View style={styles.healthMetrics}>
              {todayData.steps > 0 && (
                <View style={styles.healthMetric}>
                  <Ionicons name="footsteps" size={24} color={Colors.primary} />
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricValue}>{todayData.steps.toLocaleString()}</Text>
                    <Text style={styles.metricLabel}>Steps today</Text>
                  </View>
                </View>
              )}
              
              {todayData.sleepHours > 0 && (
                <View style={styles.healthMetric}>
                  <Ionicons name="moon" size={24} color={Colors.accent} />
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricValue}>{todayData.sleepHours.toFixed(1)}h</Text>
                    <Text style={styles.metricLabel}>Last night's sleep</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.dataNote}>
              This data helps your coach understand your patterns and provide better accountability.
            </Text>
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue to CoreSense</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show permission request screen
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="fitness" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Connect Your Health Data</Text>
          <Text style={styles.subtitle}>
            CoreSense uses your health metrics to provide personalized accountability coaching.
            This data helps your coach understand your patterns and support you better.
          </Text>
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why we need this:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.benefitText}>
              Understand your energy patterns and when you need support
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.benefitText}>
              Provide context-aware coaching based on your activity and sleep
            </Text>
          </View>
          <View style={styles.benefitText}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.benefitText}>
              Track progress beyond just streaks - your overall wellbeing
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.permissionButton,
            permissionRequested && styles.permissionButtonDisabled
          ]}
          onPress={handleRequestPermissions}
          disabled={permissionRequested}
        >
          {permissionRequested ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={24} color="white" />
              <Text style={styles.permissionButtonText}>Grant Health Access</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleContinue}>
          <Text style={styles.skipButtonText}>Continue Without Health Data</Text>
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          Your health data never leaves your device and is used only for coaching insights.
          You can revoke permissions anytime in iOS Settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitsTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
    flex: 1,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  permissionButtonDisabled: {
    opacity: 0.7,
  },
  permissionButtonText: {
    ...Typography.h3,
    color: 'white',
    fontWeight: '700',
    marginLeft: Spacing.md,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  skipButtonText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  privacyNote: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  healthDataCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthDataTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  healthMetrics: {
    gap: Spacing.lg,
  },
  healthMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  metricInfo: {
    marginLeft: Spacing.md,
  },
  metricValue: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metricLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  dataNote: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Typography.h3,
    color: 'white',
    fontWeight: '700',
  },
});
/**
 * Reset Password Screen
 * Handles both password recovery (from email link) and in-app password change.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { PurpleButton } from '../components/PurpleButton';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useAuthStore } from '../stores/authStore';

type ResetPasswordRouteParams = {
  ResetPassword: {
    mode: 'reset' | 'change';
  };
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ResetPasswordRouteParams, 'ResetPassword'>>();
  const { colors } = useTheme();
  const { updatePassword, setPendingPasswordReset, signOut } = useAuthStore();

  const mode = route.params?.mode ?? 'reset';
  const isResetMode = mode === 'reset';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    let valid = true;
    setNewPasswordError('');
    setConfirmError('');

    if (!newPassword) {
      setNewPasswordError('Password is required');
      valid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await updatePassword(newPassword);

      if (isResetMode) {
        Alert.alert(
          'Password Updated',
          'Your password has been reset successfully. You can now sign in with your new password.',
          [{
            text: 'OK',
            onPress: () => signOut(),
          }],
        );
      } else {
        Alert.alert(
          'Password Changed',
          'Your password has been updated successfully.',
          [{
            text: 'OK',
            onPress: () => navigation.goBack(),
          }],
        );
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to update password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isResetMode) {
      setPendingPasswordReset(false);
      signOut();
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isResetMode ? 'Set New Password' : 'Change Password'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isResetMode
              ? 'Choose a strong password for your account.'
              : 'Enter a new password for your account.'}
          </Text>
        </View>

        <Card style={styles.card}>
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setNewPasswordError('');
            }}
            placeholder="Enter new password (min 6 characters)"
            secureTextEntry
            error={newPasswordError}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmError('');
            }}
            placeholder="Re-enter your new password"
            secureTextEntry
            error={confirmError}
          />

          <PurpleButton
            title={loading ? 'Updating...' : 'Update Password'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />

          <PurpleButton
            title="Cancel"
            onPress={handleCancel}
            variant="text"
            style={styles.cancelButton}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  cancelButton: {
    marginTop: Spacing.sm,
  },
});

/**
 * Account Screen
 * User profile view and editing functionality.
 * All data comes from real user records - no mock or placeholder data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { Card } from '../components/Card';
import { PurpleButton } from '../components/PurpleButton';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { getUserProfile, updateUserProfile } from '../utils/api';
import { User } from '../types';


export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { profile: storeProfile, fetchProfile } = useUserStore();

  // Profile state
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [username, setUsername] = useState('');

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch profile data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        console.log('[AccountScreen] ❌ No user found');
        setError('User not authenticated');
        return;
      }
      console.log('[AccountScreen] 📡 Fetching profile directly from database...');
      const { data, error: apiError } = await getUserProfile(user.id);

      if (apiError) {
        console.warn('Profile fetch error:', apiError);
        setError(apiError);
      } else if (data) {
        console.log('[AccountScreen] ✅ Profile fetched successfully:', data);
        setProfile(data);
        setUsername(data.username || '');
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Unable to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Check for changes
  useEffect(() => {
    if (profile) {
      const changed = username !== (profile.username || '');
      setHasChanges(changed);
    }
  }, [username, profile]);

  const handleSave = async () => {
    console.log('[AccountScreen] 🔄 Username update started');
    console.log('[AccountScreen] 📝 Current username value:', username);
    console.log('[AccountScreen] 👤 Current user from auth:', user?.id, user?.email);
    
    if (!user) {
      console.log('[AccountScreen] ❌ No user found for update');
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      console.log('[AccountScreen] 📡 Calling direct Supabase update...');
      const { data, error: apiError } = await updateUserProfile(user.id, {
        username: username,
      });
      
      console.log('[AccountScreen] 📡 Direct Supabase Response:', { data, apiError });

      if (apiError) {
        console.log('[AccountScreen] ❌ Username update failed:', apiError);
        Alert.alert('Error', apiError || 'Failed to update profile');
      } else {
        console.log('[AccountScreen] ✅ Username update successful!');
        Alert.alert('Success', 'Profile updated successfully');
        setHasChanges(false);
        // Refresh profile in store
        console.log('[AccountScreen] 🔄 Refreshing profile from store...');
        fetchProfile(user.id);
      }
    } catch (err: any) {
      console.log('[AccountScreen] 💥 Exception during username update:', err);
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      console.log('[AccountScreen] 🏁 Username update process completed');
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performSignOut,
        },
      ]);
    }
  };

  const performSignOut = async () => {
    try {
      navigation.goBack();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await signOut();
    } catch (error: any) {
      console.error('[AccountScreen] Sign out error:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming soon', 'Account deletion will be available soon');
          },
        },
      ]
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) + 100 },
        ]}
        bounces={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Account</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.avatarEmail}>{user?.email}</Text>
        </View>

        {/* Profile Edit Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.inputHint}>
              This will be displayed as your identifier in the app.
            </Text>
          </View>


        </Card>

        {/* Save Button */}
        {hasChanges && (
          <PurpleButton
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          />
        )}

        {/* Account Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionItem} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemDanger]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={[styles.actionText, styles.actionTextDanger]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  retryText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '600',
  },
  // Avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  avatarEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  // Input groups
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  inputHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  // Select/Dropdown
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  selectText: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  timezoneList: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceMedium,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
  },
  timezoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timezoneOptionSelected: {
    backgroundColor: Colors.surface,
  },
  timezoneText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  timezoneTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  // Action items
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionItemDanger: {
    borderBottomWidth: 0,
  },
  actionText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  actionTextDanger: {
    color: Colors.error,
  },
  // Save button
  saveButton: {
    marginBottom: Spacing.lg,
  },
});

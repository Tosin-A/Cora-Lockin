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
  Modal,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { PurpleButton } from '../components/PurpleButton';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { getUserProfile, updateUserProfile } from '../utils/api';
import { User } from '../types';

const isApplePrivateRelay = (email?: string) =>
  !!email && email.includes('@privaterelay.appleid.com');

const getDisplayEmail = (email?: string) =>
  isApplePrivateRelay(email) ? 'Private Apple Email' : email;

export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, signOut, deleteAccount, deletingAccount } = useAuthStore();
  const { profile: storeProfile, fetchProfile } = useUserStore();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const checkoutLoading = useSubscriptionStore((s) => s.checkoutLoading);
  const restoreLoading = useSubscriptionStore((s) => s.restoreLoading);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);
  const restorePurchases = useSubscriptionStore((s) => s.restorePurchases);
  const openCustomerPortal = useSubscriptionStore((s) => s.openCustomerPortal);
  const loadSubscriptionStatus = useSubscriptionStore((s) => s.loadSubscriptionStatus);
  const loadProductPrice = useSubscriptionStore((s) => s.loadProductPrice);
  const priceString = useSubscriptionStore((s) => s.priceString);

  const PRIVACY_POLICY_URL = 'https://coresense.online/privacy';
  const TERMS_OF_USE_URL = 'https://coresense.online/terms';

  // Profile state
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [username, setUsername] = useState('');

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Delete account confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
      loadSubscriptionStatus();
      loadProductPrice();
    }, [fetchData, loadSubscriptionStatus, loadProductPrice])
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
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setDeleteConfirmText('');
            setShowDeleteModal(true);
          },
        },
      ],
    );
  };

  const performDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      await deleteAccount();
    } catch (err: any) {
      Alert.alert(
        'Deletion Failed',
        err?.message || 'Unable to delete your account. Please try again or contact support.',
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity onPress={fetchData}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRow}>
            {profile?.avatar_url || user?.avatar_url ? (
              <Image
                source={{ uri: profile?.avatar_url || user?.avatar_url || '' }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                  {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {isPro && (
              <View style={[styles.proPill, { backgroundColor: '#007AFF', marginLeft: Spacing.sm }]}>
                <Text style={styles.proPillText}>Pro</Text>
              </View>
            )}
          </View>
          <Text style={[styles.avatarEmail, { color: colors.textSecondary }]}>{getDisplayEmail(user?.email)}</Text>
        </View>

        {/* Profile Edit Section */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Profile Information</Text>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceMedium, borderColor: colors.border }]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account Details</Text>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{getDisplayEmail(user?.email)}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Member since</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>
        </Card>

        {/* Pro Subscription */}
        <Card style={styles.section}>
          <View style={styles.proSectionHeader}>
            <View style={[styles.proSectionIcon, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
              <Ionicons name="diamond-outline" size={18} color="#007AFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pro</Text>
          </View>
          {isPro ? (
            <>
              <View style={styles.proSubscriptionRow}>
                <View style={[styles.proPill, { backgroundColor: '#007AFF' }]}>
                  <Text style={styles.proPillText}>Active</Text>
                </View>
                <Text style={[styles.proSubscriptionDesc, { color: colors.textSecondary }]}>
                  10 messages/day, 30/week
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.proManageButton, { backgroundColor: colors.surfaceMedium }]}
                onPress={openCustomerPortal}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={20} color={colors.primary} />
                <Text style={[styles.proManageButtonText, { color: colors.textPrimary }]}>
                  Manage subscription
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {priceString && (
                <Text style={[styles.proPriceText, { color: colors.textPrimary }]}>
                  {priceString}/month
                </Text>
              )}
              <Text style={[styles.proSubscriptionDesc, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
                Get 10 messages per day and 30 per week. Unlock unlimited coaching potential.
              </Text>
              <Text style={[styles.proSubscriptionTerms, { color: colors.textTertiary }]}>
                Auto-renewable monthly subscription.{' '}
                {priceString ? `${priceString} billed monthly. ` : ''}
                Payment will be charged to your Apple ID account at confirmation of purchase.
                Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
                You can manage or cancel your subscription in your App Store account settings.
              </Text>
              <TouchableOpacity
                style={[styles.proUpgradeButton, { backgroundColor: '#007AFF' }]}
                onPress={startCheckout}
                disabled={checkoutLoading}
                activeOpacity={0.7}
              >
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.proUpgradeButtonText}>
                    {priceString ? `Subscribe for ${priceString}/month` : 'Upgrade to Pro'}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.proLegalLinks}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.proLegalLinkText, { color: colors.primary }]}>
                    Terms of Use (EULA)
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.proLegalSeparator, { color: colors.textTertiary }]}>|</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.proLegalLinkText, { color: colors.primary }]}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.proRestoreButton, { borderColor: colors.border }]}
                onPress={restorePurchases}
                disabled={restoreLoading}
                activeOpacity={0.7}
              >
                {restoreLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text style={[styles.proRestoreButtonText, { color: colors.textSecondary }]}>
                    Restore Purchases
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Actions */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Actions</Text>
          <TouchableOpacity
            style={[styles.actionItem, { borderBottomColor: colors.border }]}
            onPress={() => (navigation as any).navigate('ChangePassword', { mode: 'change' })}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionItem, { borderBottomColor: colors.border }]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemDanger]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            )}
            <Text style={[styles.actionText, { color: colors.error }]}>
              {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Confirm Deletion
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              All your messages, health data, insights, and preferences will be permanently erased. This cannot be reversed.
            </Text>
            <Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>
              Type <Text style={{ fontWeight: '700', color: colors.error }}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceMedium,
                  borderColor: deleteConfirmText === 'DELETE' ? colors.error : colors.border,
                },
              ]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surfaceMedium }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonDestructive,
                  deleteConfirmText !== 'DELETE' && styles.modalButtonDisabled,
                ]}
                onPress={performDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Delete My Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  // Pro section
  proSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  proSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proSubscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  proPriceText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  proSubscriptionDesc: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  proSubscriptionTerms: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  proLegalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  proLegalLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  proLegalSeparator: {
    fontSize: 13,
  },
  proPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  proManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },
  proManageButtonText: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
  },
  proUpgradeButton: {
    paddingVertical: 14,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  },
  proUpgradeButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  proRestoreButton: {
    paddingVertical: 12,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  proRestoreButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
  // Save button
  saveButton: {
    marginBottom: Spacing.lg,
  },
  // Delete confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
  },
  modalTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  modalBody: {
    ...Typography.body,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  modalPrompt: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDestructive: {
    backgroundColor: Colors.error,
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },
  modalButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
});

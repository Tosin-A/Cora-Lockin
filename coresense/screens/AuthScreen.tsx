/**
 * Auth Screen
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
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { PurpleButton } from '../components/PurpleButton';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useAuthStore } from '../stores/authStore';
import { handleOAuthError } from '../utils/oauth';

export default function AuthScreen() {
  const navigation = useNavigation();
  const { signIn, signUp, signInWithGoogle, signInWithApple, isLoading, googleLoading, appleLoading } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [appleError, setAppleError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    let hasError = false;

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      console.log('AuthScreen: handleAuth called, isSignUp:', isSignUp);
      if (isSignUp) {
        console.log('AuthScreen: Calling signUp...');
        await signUp(email.trim().toLowerCase(), password, fullName);
        console.log('AuthScreen: signUp completed');
      } else {
        console.log('AuthScreen: Calling signIn...');
        await signIn(email.trim().toLowerCase(), password);
        console.log('AuthScreen: signIn completed');
      }
    } catch (err: any) {
      console.error('AuthScreen: Authentication error caught:', err);
      
      let errorMessage = 'Authentication failed';
      let alertTitle = isSignUp ? 'Sign Up Failed' : 'Sign In Failed';
      
      if (err?.isEmailConfirmation || err?.message?.includes('EMAIL_CONFIRMATION_REQUIRED')) {
        errorMessage = err.message || 'Account created! Please check your email to confirm your account before signing in.';
        alertTitle = 'Account Created';
        setEmail('');
        setPassword('');
        setFullName('');
        setGeneralError('');
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      }
      
      console.log('AuthScreen: Displaying message to user:', errorMessage);
      setGeneralError(errorMessage);
      
      Alert.alert(
        alertTitle,
        errorMessage,
        [{ 
          text: 'OK',
          onPress: () => {
            if (err?.isEmailConfirmation) {
              setIsSignUp(false);
              setGeneralError('');
            }
          }
        }]
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setGeneralError('');

    try {
      console.log('AuthScreen: Starting Google sign-in...');
      await signInWithGoogle();
      console.log('AuthScreen: Google sign-in successful');
    } catch (err: any) {
      console.error('AuthScreen: Google sign-in error:', err);

      const errorMessage = handleOAuthError(err);
      setGoogleError(errorMessage);

      Alert.alert(
        'Google Sign-In Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAppleSignIn = async () => {
    setAppleError('');
    setGeneralError('');

    try {
      console.log('AuthScreen: Starting Apple sign-in...');
      await signInWithApple();
      console.log('AuthScreen: Apple sign-in successful');
    } catch (err: any) {
      console.error('AuthScreen: Apple sign-in error:', err);

      const errorMessage = handleOAuthError(err);
      setAppleError(errorMessage);

      Alert.alert(
        'Apple Sign-In Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>CoreSense</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
        </View>

        <Card style={styles.card}>
          {isSignUp && (
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your name"
              autoCapitalize="words"
            />
          )}

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            placeholder="Enter password (min 6 characters)"
            secureTextEntry
            error={passwordError}
          />

          {/* Continue with Google Button - Placed after password field */}
          <PurpleButton
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="secondary"
            loading={googleLoading}
            style={styles.googleButton}
          />

          {googleError && (
            <Text style={styles.googleError}>{googleError}</Text>
          )}

          {/* Continue with Apple Button */}
          <PurpleButton
            title="Continue with Apple"
            onPress={handleAppleSignIn}
            variant="secondary"
            loading={appleLoading}
            style={styles.appleButton}
          />

          {appleError && (
            <Text style={styles.appleError}>{appleError}</Text>
          )}

          {generalError && (
            <Text style={styles.generalError}>{generalError}</Text>
          )}

          <PurpleButton
            title={isSignUp ? 'Sign Up' : 'Sign In'}
            onPress={handleAuth}
            loading={isLoading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <PurpleButton
              title={isSignUp ? 'Sign In' : 'Sign Up'}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setEmailError('');
                setPasswordError('');
                setGeneralError('');
              }}
              variant="text"
            />
          </View>
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  button: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  socialButton: {
    marginTop: Spacing.sm,
  },
  generalError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  oauthInfo: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    alignItems: 'center',
  },
  oauthInfoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  oauthSubText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  googleButton: {
    marginTop: Spacing.md,
  },
  googleError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  appleButton: {
    marginTop: Spacing.sm,
  },
  appleError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

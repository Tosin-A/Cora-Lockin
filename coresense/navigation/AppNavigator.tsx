/**
 * Main App Navigator
 * 4-Tab Structure: Home, Insights, Coach, Settings
 * Includes badge support for new insights
 */

import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useInsightsStore } from '../stores/insightsStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase';
import { clearAuthTokenCache, warmupServer } from '../utils/coresenseApi';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useChatStore } from '../stores/chatStore';
import { initializeHealthKit } from '../utils/healthService';
import { initIAP, endIAP } from '../utils/iap';
import {
  setNotificationNavigationRef,
  setupNotificationHandlers,
  registerForPushNotifications,
} from '../utils/notificationService';
import type { User } from '../types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
// import EngagementScreen from '../screens/EngagementScreen'; // Removed per user request
import SettingsScreen from '../screens/SettingsScreen';
import AccountScreen from '../screens/AccountScreen';
import CoachChatScreen from '../screens/CoachChatScreen';
import TasksScreen from '../screens/TasksScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  // Check for new insights
  const hasNewInsights = useInsightsStore((state) => state.hasNewInsights());
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 28,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={22} color={color} />
              {hasNewInsights && <View style={styles.badgeDot} />}
            </View>
          ),
        }}
      />
      {/* Engage tab removed per user request */}
      <Tab.Screen
        name="Coach"
        component={CoachChatScreen}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 12,
    padding: 6,
    marginTop: -2,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neonPink,
  },
});

function extractCodeFromUrl(url: string): string | null {
  if (url.includes('?')) {
    const query = url.split('?')[1]?.split('#')[0];
    if (query) {
      return new URLSearchParams(query).get('code');
    }
  }
  return null;
}

function extractTokensFromUrl(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
} {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let error: string | null = null;

  const parse = (paramString: string) => {
    const params = new URLSearchParams(paramString);
    accessToken = accessToken || params.get('access_token');
    refreshToken = refreshToken || params.get('refresh_token');
    error = error || params.get('error');
  };

  if (url.includes('#')) {
    const fragment = url.split('#')[1];
    if (fragment) parse(fragment);
  }
  if (url.includes('?')) {
    const query = url.split('?')[1]?.split('#')[0];
    if (query) parse(query);
  }

  return { accessToken, refreshToken, error };
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth, pendingPasswordReset } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<Record<string, undefined>>>(null);
  const prevIsAuthenticatedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let hasHandledInitialSession = false;
    
    // Set up Supabase auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Handle INITIAL_SESSION - this fires on app start
      if (event === 'INITIAL_SESSION') {
        if (!hasHandledInitialSession) {
          hasHandledInitialSession = true;
          // Use the session from the event directly
          if (session?.user) {
            const mappedUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.email?.split('@')[0] || null,
              full_name: session.user.user_metadata?.full_name || null,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              created_at: session.user.created_at,
            };
            useAuthStore.setState({
              user: mappedUser,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // No session — clear any stale stored credentials
            // This prevents "Invalid Refresh Token" errors on subsequent starts
            await supabase.auth.signOut({ scope: 'local' });
            useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        }
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        clearAuthTokenCache();
        console.log('[AppNavigator] SIGNED_IN event - checking auth state');
        // Use the session from the event directly if available
        if (session?.user) {
          const mappedUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.email?.split('@')[0] || null,
            full_name: session.user.user_metadata?.full_name || null,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
          };
          const currentState = useAuthStore.getState();
          // Only update if user changed or not authenticated
          if (currentState.user?.id !== mappedUser.id || !currentState.isAuthenticated) {
            useAuthStore.setState({
              user: mappedUser,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } else {
          // Fallback to checkAuth if no session in event
          await new Promise(resolve => setTimeout(resolve, 100));
          await checkAuth();
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthTokenCache();
        endIAP();
        console.log('Auth state changed: SIGNED_OUT - clearing auth state');
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else if (event === 'PASSWORD_RECOVERY') {
        clearAuthTokenCache();
        console.log('[AppNavigator] PASSWORD_RECOVERY event received');
        if (session?.user) {
          const mappedUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.email?.split('@')[0] || null,
            full_name: session.user.user_metadata?.full_name || null,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
          };
          useAuthStore.setState({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            pendingPasswordReset: true,
          });
        }
      } else if (event === 'USER_UPDATED') {
        const currentState = useAuthStore.getState();
        if (!currentState.user || (session?.user && currentState.user.id !== session.user.id)) {
          await checkAuth();
        }
      }
    });

    // Safety fallback: if INITIAL_SESSION hasn't fired after 3s, force out of loading
    const timeoutId = setTimeout(() => {
      if (!hasHandledInitialSession) {
        hasHandledInitialSession = true;
        console.log('[AppNavigator] INITIAL_SESSION not received, running checkAuth fallback');
        checkAuth();
      }
    }, 3000);

    // Extra safety: guarantee we never stay stuck on splash forever
    const hardTimeoutId = setTimeout(() => {
      const { isLoading } = useAuthStore.getState();
      if (isLoading) {
        console.warn('[AppNavigator] Hard timeout: forcing out of loading state');
        useAuthStore.setState({ isLoading: false });
      }
    }, 6000);

    // Handle OAuth redirects via deep links
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log('[AppNavigator] Deep link received:', url);

      if (url.includes('coresense://subscription-success')) {
        console.log('[AppNavigator] Subscription success callback');
        useSubscriptionStore.getState().handleSubscriptionSuccess();
        return;
      }

      if (url.includes('coresense://subscription-cancel')) {
        console.log('[AppNavigator] Subscription checkout cancelled');
        return;
      }
      
      // Password recovery deep link (distinct from OAuth callback)
      if (url.includes('coresense://auth/recovery')) {
        console.log('[AppNavigator] Password recovery deep link detected');

        // Set the flag synchronously BEFORE exchanging code so the
        // SIGNED_IN event handler (which fires during exchange) doesn't
        // navigate to the main app.
        useAuthStore.setState({ pendingPasswordReset: true });

        const code = extractCodeFromUrl(url);
        if (code) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[AppNavigator] Recovery code exchange error:', error);
              useAuthStore.setState({ pendingPasswordReset: false });
            }
          } catch (error) {
            console.error('[AppNavigator] Recovery code exchange exception:', error);
            useAuthStore.setState({ pendingPasswordReset: false });
          }
        } else {
          // Implicit flow fallback: tokens may arrive via fragment
          const tokens = extractTokensFromUrl(url);
          if (tokens.accessToken && tokens.refreshToken) {
            try {
              const { error } = await supabase.auth.setSession({
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
              });
              if (error) {
                console.error('[AppNavigator] Recovery session error:', error);
                useAuthStore.setState({ pendingPasswordReset: false });
              }
            } catch (error) {
              console.error('[AppNavigator] Recovery session exception:', error);
              useAuthStore.setState({ pendingPasswordReset: false });
            }
          }
        }
        return;
      }

      // OAuth / general auth callback
      if (url.includes('coresense://auth/callback')) {
        console.log('[AppNavigator] OAuth callback detected');

        const code = extractCodeFromUrl(url);

        if (code) {
          console.log('[AppNavigator] PKCE code detected, exchanging for session...');
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[AppNavigator] Code exchange error:', error);
            } else if (data.session) {
              console.log('[AppNavigator] Code exchanged successfully');
            }
          } catch (error) {
            console.error('[AppNavigator] Code exchange exception:', error);
          }
          return;
        }

        const tokens = extractTokensFromUrl(url);
        if (tokens.error) {
          console.error('[AppNavigator] Auth error in callback:', tokens.error);
          return;
        }

        if (tokens.accessToken && tokens.refreshToken) {
          console.log('[AppNavigator] Setting session from tokens...');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken,
            });

            if (error) {
              console.error('[AppNavigator] Error setting session:', error);
            } else if (data.session) {
              console.log('[AppNavigator] Session set successfully from deep link');
              await checkAuth();
            }
          } catch (error) {
            console.error('[AppNavigator] Error handling auth redirect:', error);
          }
        } else {
          console.log('[AppNavigator] No tokens or code in deep link, checking session...');
          setTimeout(async () => {
            await checkAuth();
          }, 1000);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleDeepLink({ url });
        }
      })
      .catch((err) => {
        console.warn('[AppNavigator] Failed to get initial URL:', err);
      });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
      clearTimeout(timeoutId);
      clearTimeout(hardTimeoutId);
    };
  }, [checkAuth]);

  // Initialize HealthKit, notifications, and prefetch insights on component mount if user is already authenticated
  useEffect(() => {
    let notificationCleanup: (() => void) | null = null;

    if (isAuthenticated) {
      console.log('[AppNavigator] User already authenticated, initializing services...');

      warmupServer();
      useChatStore.getState().loadChatHistory({ silent: true });
      initIAP();
      useSubscriptionStore.getState().loadSubscriptionStatus();

      // Initialize HealthKit
      initializeHealthKit()
        .then((status) => {
          console.log('[AppNavigator] HealthKit initialized on mount:', status);
          if (!status.permissionsGranted) {
            console.warn('[AppNavigator] HealthKit permissions not granted on mount');
          }
        })
        .catch((error) => {
          console.error('[AppNavigator] HealthKit initialization failed on mount:', error);
        });

      // Initialize push notifications
      console.log('[AppNavigator] Setting up notification handlers...');
      setupNotificationHandlers()
        .then((cleanup) => {
          notificationCleanup = cleanup;
          console.log('[AppNavigator] Notification handlers set up');
        })
        .catch((error) => {
          console.error('[AppNavigator] Notification handler setup failed:', error);
        });

    }

    return () => {
      if (notificationCleanup) {
        notificationCleanup();
      }
    };
  }, [isAuthenticated]);

  // Track auth state changes for logging and initialize services
  useEffect(() => {
    if (prevIsAuthenticatedRef.current !== null && prevIsAuthenticatedRef.current !== isAuthenticated) {
      console.log('[AppNavigator] Auth state changed:', {
        from: prevIsAuthenticatedRef.current ? 'authenticated' : 'unauthenticated',
        to: isAuthenticated ? 'authenticated' : 'unauthenticated',
      });
      
      if (isAuthenticated) {
        const { isLoading } = useAuthStore.getState();
        if (isLoading) {
          console.log('[AppNavigator] Clearing loading state after authentication');
          useAuthStore.setState({ isLoading: false });
        }
        
        // Initialize HealthKit when user becomes authenticated
        console.log('[AppNavigator] Initializing HealthKit...');
        initializeHealthKit()
          .then((status) => {
            console.log('[AppNavigator] HealthKit initialized:', status);
            if (!status.permissionsGranted) {
              console.warn('[AppNavigator] HealthKit permissions not granted');
            }
          })
          .catch((error) => {
            console.error('[AppNavigator] HealthKit initialization failed:', error);
          });

        // Register for push notifications when user becomes authenticated
        console.log('[AppNavigator] Registering for push notifications...');
        registerForPushNotifications()
          .then((token) => {
            if (token) {
              console.log('[AppNavigator] Push notifications registered');
            } else {
              console.log('[AppNavigator] Push notifications not available or denied');
            }
          })
          .catch((error) => {
            console.error('[AppNavigator] Push notification registration failed:', error);
          });
      }
    }
    prevIsAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Set navigation ref for notification deep linking
  useEffect(() => {
    if (navigationRef.current && isAuthenticated) {
      setNotificationNavigationRef(navigationRef.current);
      console.log('[AppNavigator] Navigation ref set for notifications');
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
      onReady={() => {
        if (navigationRef.current && isAuthenticated) {
          setNotificationNavigationRef(navigationRef.current);
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : pendingPasswordReset ? (
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            initialParams={{ mode: 'reset' }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: Colors.background,
                },
                headerTintColor: Colors.textPrimary,
                headerTitle: 'Tasks',
                headerBackTitle: 'Home',
              }}
            />
            <Stack.Screen
              name="Account"
              component={AccountScreen}
              options={({ navigation }) => ({
                presentation: 'modal',
                gestureEnabled: true,
                headerShown: true,
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.textPrimary,
                headerTitle: 'Account',
                headerBackVisible: false,
                headerLeft: () => null,
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: 16, padding: 4 }}
                  >
                    <Ionicons name="close" size={28} color={Colors.textPrimary} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ResetPasswordScreen}
              initialParams={{ mode: 'change' }}
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: Colors.background,
                },
                headerTintColor: Colors.textPrimary,
                headerTitle: 'Change Password',
                headerBackTitle: 'Account',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

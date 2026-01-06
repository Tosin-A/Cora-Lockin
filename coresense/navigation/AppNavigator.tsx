/**
 * Main App Navigator
 * 4-Tab Structure: Home, Insights, Engage, Settings
 */

import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase';
import { initializeHealthKit } from '../utils/healthService';
import type { User } from '../types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
// import EngagementScreen from '../screens/EngagementScreen'; // Removed per user request
import PreferencesScreen from '../screens/PreferencesScreen';
import AccountScreen from '../screens/AccountScreen';
import CoachChatScreen from '../screens/CoachChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.glassBorder,
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
        component={PreferencesScreen}
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
});

export default function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const navigationRef = useRef<any>(null);
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
            // No session, set loading to false
            useAuthStore.setState({ isLoading: false });
          }
        }
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AppNavigator] SIGNED_IN event - checking auth state');
        // Use the session from the event directly if available
        if (session?.user) {
          const mappedUser: User = {
            id: session.user.id,
            email: session.user.email || '',
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
        console.log('Auth state changed: SIGNED_OUT - clearing auth state');
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else if (event === 'USER_UPDATED') {
        // Only check auth if we don't have a user or the user changed
        const currentState = useAuthStore.getState();
        if (!currentState.user || (session?.user && currentState.user.id !== session.user.id)) {
          await checkAuth();
        }
      }
    });

    // Initial auth check (only if INITIAL_SESSION hasn't been handled)
    // Give the listener a moment to handle INITIAL_SESSION first
    const timeoutId = setTimeout(() => {
      if (!hasHandledInitialSession) {
        hasHandledInitialSession = true;
        checkAuth();
      }
    }, 200);

    // Handle OAuth redirects via deep links
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log('[AppNavigator] Deep link received:', url);
      
      // Check if this is an OAuth callback
      if (url.includes('coresense://auth/callback')) {
        console.log('[AppNavigator] OAuth callback detected');
        
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let errorParam: string | null = null;
        
        // Extract tokens from URL
        if (url.includes('#')) {
          const urlParts = url.split('#');
          if (urlParts.length > 1) {
            const params = new URLSearchParams(urlParts[1]);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
            errorParam = params.get('error');
          }
        } else if (url.includes('?')) {
          const urlParts = url.split('?');
          if (urlParts.length > 1) {
            const params = new URLSearchParams(urlParts[1]);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
            errorParam = params.get('error');
          }
        }
        
        if (errorParam) {
          console.error('[AppNavigator] OAuth error in callback:', errorParam);
          return;
        }
        
        if (accessToken && refreshToken) {
          console.log('[AppNavigator] Setting session from deep link...');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('[AppNavigator] Error setting session:', error);
            } else if (data.session) {
              console.log('[AppNavigator] Session set successfully from deep link');
              // The auth state change listener will handle updating the store
              await checkAuth();
            }
          } catch (error) {
            console.error('[AppNavigator] Error handling OAuth redirect:', error);
          }
        } else {
          console.log('[AppNavigator] No tokens in deep link, checking session...');
          // Wait a bit and check if session was set
          setTimeout(async () => {
            await checkAuth();
          }, 1000);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
      clearTimeout(timeoutId);
    };
  }, [checkAuth]);

  // Initialize HealthKit on component mount if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[AppNavigator] User already authenticated, initializing HealthKit...');
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
    }
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
      }
    }
    prevIsAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

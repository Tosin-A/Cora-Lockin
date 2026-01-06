/**
 * OAuth Functions for Mobile Apps (Expo SDK 54 Compatible)
 * Uses Supabase's built-in OAuth helpers for reliable mobile authentication
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// OAuth redirect configuration for Expo SDK 54+
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'coresense', // matches app.json scheme
  path: 'auth/callback', // Recommended: explicit path for Supabase
});

/**
 * Start Google OAuth flow using Supabase's built-in helper
 * This is the recommended approach for mobile apps
 */
export const startGoogleOAuth = async () => {
  try {
    console.log('[OAuth] Starting Google OAuth flow...');
    console.log('[OAuth] Redirect URI:', redirectUri);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // Crucial for mobile apps
      },
    });

    if (error) {
      console.error('[OAuth] Google OAuth error:', error);
      return { error, data: null };
    }

    if (!data.url) {
      console.error('[OAuth] No OAuth URL returned');
      return { error: new Error('No OAuth URL returned'), data: null };
    }

    console.log('[OAuth] Opening browser for Google sign-in...');
    
    // Open the OAuth URL in the device's browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri
    );

    if (result.type === 'success' && result.url) {
      console.log('[OAuth] OAuth redirect successful');
      
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      
      if (code) {
        console.log('[OAuth] Exchanging code for session...');
        const sessionResult = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionResult.error) {
          console.error('[OAuth] Code exchange failed:', sessionResult.error);
          return { error: sessionResult.error, data: null };
        }
        
        console.log('[OAuth] Google OAuth successful');
        return { data: sessionResult, error: null };
      } else {
        console.error('[OAuth] No authorization code in redirect URL');
        return { error: new Error('No authorization code received'), data: null };
      }
    }

    if (result.type === 'cancel') {
      console.log('[OAuth] User cancelled Google OAuth');
      return { error: new Error('User cancelled'), data: null };
    }

    console.error('[OAuth] OAuth flow failed:', result);
    return { error: new Error('OAuth flow failed'), data: null };
    
  } catch (error) {
    console.error('[OAuth] Google OAuth exception:', error);
    return { error, data: null };
  }
};

/**
 * Start Apple OAuth flow using Supabase's built-in helper
 * This works for both native Apple Sign In (iOS) and web fallback
 */
export const startAppleOAuth = async () => {
  try {
    console.log('[OAuth] Starting Apple OAuth flow...');
    console.log('[OAuth] Redirect URI:', redirectUri);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // Crucial for mobile apps
      },
    });

    if (error) {
      console.error('[OAuth] Apple OAuth error:', error);
      return { error, data: null };
    }

    if (!data.url) {
      console.error('[OAuth] No OAuth URL returned');
      return { error: new Error('No OAuth URL returned'), data: null };
    }

    console.log('[OAuth] Opening browser for Apple sign-in...');
    
    // Open the OAuth URL in the device's browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri
    );

    if (result.type === 'success' && result.url) {
      console.log('[OAuth] OAuth redirect successful');
      
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      
      if (code) {
        console.log('[OAuth] Exchanging code for session...');
        const sessionResult = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionResult.error) {
          console.error('[OAuth] Code exchange failed:', sessionResult.error);
          return { error: sessionResult.error, data: null };
        }
        
        console.log('[OAuth] Apple OAuth successful');
        return { data: sessionResult, error: null };
      } else {
        console.error('[OAuth] No authorization code in redirect URL');
        return { error: new Error('No authorization code received'), data: null };
      }
    }

    if (result.type === 'cancel') {
      console.log('[OAuth] User cancelled Apple OAuth');
      return { error: new Error('User cancelled'), data: null };
    }

    console.error('[OAuth] OAuth flow failed:', result);
    return { error: new Error('OAuth flow failed'), data: null };
    
  } catch (error) {
    console.error('[OAuth] Apple OAuth exception:', error);
    return { error, data: null };
  }
};

/**
 * Legacy Supabase OAuth functions (fallback)
 * These use the old direct OAuth approach
 */
export const signInWithGoogleLegacy = async () => {
  try {
    console.log('[OAuth] Using legacy Supabase Google OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[OAuth] Legacy Google OAuth error:', error);
    return { error, data: null };
  }
};

export const signInWithAppleLegacy = async () => {
  try {
    console.log('[OAuth] Using legacy Supabase Apple OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUri,
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[OAuth] Legacy Apple OAuth error:', error);
    return { error, data: null };
  }
};

/**
 * Check if OAuth is properly configured
 */
export const checkOAuthConfiguration = async () => {
  const issues: string[] = [];
  
  // Check if redirect URI is configured
  if (!redirectUri) {
    issues.push('Redirect URI not configured');
  }
  
  // Check Supabase configuration
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && error.message.includes('Invalid API key')) {
      issues.push('Invalid Supabase configuration');
    }
  } catch (error) {
    issues.push('Supabase connection failed');
  }
  
  // Check app.json scheme
  try {
    // In a real app, you'd check the app configuration
    // For SDK 54, use expo-constants or expo-application
    console.log('[OAuth] App scheme should be: coresense (configured in app.json)');
  } catch (error) {
    issues.push('App configuration error');
  }
  
  return {
    isConfigured: issues.length === 0,
    issues,
    redirectUri,
  };
};

/**
 * Get OAuth status for debugging
 */
export const getOAuthStatus = () => {
  return {
    redirectUri,
    environment: __DEV__ ? 'development' : 'production',
    expoSdkVersion: '54.0.0', // SDK 54 compatible
    available: {
      supabaseOAuth: !!supabase?.auth?.signInWithOAuth,
      webBrowser: !!WebBrowser?.openAuthSessionAsync,
      authSession: !!AuthSession?.makeRedirectUri,
    },
  };
};

/**
 * Enhanced error handling for OAuth failures
 */
export const handleOAuthError = (error: any): string => {
  console.error('[OAuth] Detailed error analysis:', {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    name: error?.name,
    stack: error?.stack,
  });

  // Common error patterns and solutions
  if (error?.message?.includes('Invalid API key')) {
    return 'Authentication service configuration error. Please check Supabase settings.';
  }
  
  if (error?.message?.includes('cancelled') || error?.message?.includes('cancel')) {
    return 'Sign-in was cancelled by user.';
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  if (error?.message?.includes('redirect') || error?.message?.includes('callback')) {
    return 'OAuth redirect configuration error. Please check app scheme and redirect URLs.';
  }
  
  if (error?.message?.includes('provider') || error?.message?.includes('google') || error?.message?.includes('apple')) {
    return 'OAuth provider configuration error. Please check Google/Apple OAuth settings in Supabase.';
  }
  
  // Default error message
  return `OAuth error: ${error?.message || 'Unknown error occurred'}`;
};
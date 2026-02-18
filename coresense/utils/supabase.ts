/**
 * Supabase Client Setup
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Load credentials: try env vars first, fall back to CI-generated config
let SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback: try CI-generated config (written by ci_post_clone.sh)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  try {
    const ciConfig = require('./ciConfig.json');
    SUPABASE_URL = SUPABASE_URL || ciConfig.EXPO_PUBLIC_SUPABASE_URL || '';
    SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || ciConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  } catch {
    // ciConfig.json doesn't exist in dev (expected)
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase credentials - auth will not work');
}

// Secure storage adapter using expo-secure-store (Keychain on iOS, Keystore on Android)
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore may fail on web or in some test environments
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore removal errors
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // Required for mobile OAuth
  },
});

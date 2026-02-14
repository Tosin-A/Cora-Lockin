/**
 * Supabase Client Setup
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load credentials: try env vars first, fall back to CI-generated config
let SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let SUPABASE_SERVICE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';

// Fallback: try CI-generated config (written by ci_post_clone.sh)
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const ciConfig = require('./ciConfig.json');
    SUPABASE_URL = SUPABASE_URL || ciConfig.EXPO_PUBLIC_SUPABASE_URL || '';
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || ciConfig.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';
  } catch {
    // ciConfig.json doesn't exist in dev (expected)
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ Missing Supabase credentials - auth will not work');
}

// Custom storage adapter for React Native using AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // Required for mobile OAuth
  },
});


/**
 * Centralized API Configuration
 *
 * This module provides a single source of truth for the API base URL.
 * All files should import API_BASE_URL from here instead of constructing URLs manually.
 */

import { Platform } from 'react-native';

/**
 * Returns the base API URL for the backend.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (for production/staging)
 * 2. Platform-specific defaults for local development:
 *    - iOS Simulator: localhost (shares host network)
 *    - Android Emulator: 10.0.2.2 (special alias for host)
 *    - Physical device: requires EXPO_PUBLIC_API_URL to be set
 */
function getApiBaseUrl(): string {
  // Use environment variable if set (production or forced in dev)
  // Use environment variable if set (production builds)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }

  // Development fallbacks by platform
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host machine
      return 'http://10.0.2.2:8000';
    }
    // iOS simulator shares host network, use localhost
    return 'http://localhost:8000';
  }

  // Production should always have EXPO_PUBLIC_API_URL set
  console.warn('[apiConfig] No API URL configured for production!');
  return 'http://localhost:8000';
}

/**
 * The base URL for all API requests.
 * Import this constant instead of constructing URLs manually.
 *
 * @example
 * import { API_BASE_URL } from '../utils/apiConfig';
 * const response = await fetch(`${API_BASE_URL}/api/v1/endpoint`);
 */
export const API_BASE_URL = getApiBaseUrl();

// Log the API URL on startup for debugging
console.log(`[apiConfig] Using API URL: ${API_BASE_URL} (Platform: ${Platform.OS}, DEV: ${__DEV__})`);

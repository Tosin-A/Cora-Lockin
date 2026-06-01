/**
 * CoreSense App Entry Point
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { setPostHogClient } from './utils/analytics';

function AppContent() {
  const { isDark } = useTheme();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      setPostHogClient(posthog);
    }
  }, [posthog]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

// Try the ciConfig.json fallback for analytics keys (written by Xcode Cloud's
// ci_post_clone.sh) so PostHog still initializes when the env vars are
// unavailable to the bundler.
let ciConfig: Record<string, string | undefined> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ciConfig = require('./utils/ciConfig.json');
} catch {
  // ciConfig.json doesn't exist in local dev (expected).
}

export default function App() {
  // Analytics is optional. If the key isn't baked into the build (e.g.
  // PostHog vars missing in Xcode Cloud / EAS env), skip PostHog entirely
  // rather than letting its SDK throw and bring the whole app down.
  const posthogKey =
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY || ciConfig.EXPO_PUBLIC_POSTHOG_API_KEY;
  const posthogHost =
    process.env.EXPO_PUBLIC_POSTHOG_HOST || ciConfig.EXPO_PUBLIC_POSTHOG_HOST;

  const Tree = (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {posthogKey ? (
          <PostHogProvider
            apiKey={posthogKey}
            autocapture={false}
            options={posthogHost ? { host: posthogHost } : undefined}
          >
            {Tree}
          </PostHogProvider>
        ) : (
          Tree
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

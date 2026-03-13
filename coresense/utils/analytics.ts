/**
 * Analytics bridge for PostHog
 * Allows Zustand stores to capture events without React hooks.
 */

import type { PostHog } from 'posthog-react-native';

let _client: PostHog | null = null;

export function setPostHogClient(client: PostHog) {
  _client = client;
}

export function captureEvent(name: string, properties?: Record<string, any>) {
  if (_client) {
    _client.capture(name, properties);
  }
}

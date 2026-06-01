#!/bin/sh

# Xcode Cloud post-clone script for Expo/React Native
# This script runs after Xcode Cloud clones the repository

set -e

echo "=== Running ci_post_clone.sh ==="

# Navigate to the coresense directory (React Native project root)
cd "$CI_PRIMARY_REPOSITORY_PATH/coresense"

# Write .env file from Xcode Cloud environment variables
# Set these in Xcode Cloud: Workflow > Environment Variables
echo "=== Writing environment config ==="
cat > .env <<EOL
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY}
EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
EXPO_PUBLIC_POSTHOG_API_KEY=${EXPO_PUBLIC_POSTHOG_API_KEY}
EXPO_PUBLIC_POSTHOG_HOST=${EXPO_PUBLIC_POSTHOG_HOST}
EOL

# Also write a JSON config that gets bundled by Metro as a direct import fallback
# This guarantees env vars are available even if .env loading fails
cat > utils/ciConfig.json <<EOL
{
  "EXPO_PUBLIC_SUPABASE_URL": "${EXPO_PUBLIC_SUPABASE_URL}",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}",
  "EXPO_PUBLIC_API_URL": "${EXPO_PUBLIC_API_URL}",
  "EXPO_PUBLIC_POSTHOG_API_KEY": "${EXPO_PUBLIC_POSTHOG_API_KEY}",
  "EXPO_PUBLIC_POSTHOG_HOST": "${EXPO_PUBLIC_POSTHOG_HOST}"
}
EOL

# Verify required env vars are set. Supabase URL/anon key are required for the
# app to function at all; PostHog vars are optional (analytics is skipped if
# missing). API URL has a sensible default.
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "ERROR: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not set in Xcode Cloud!"
    echo "Set them in Xcode Cloud: Workflow > Environment Variables"
    echo "Without these, the app will black-screen on launch."
    exit 1
fi
if [ -z "$EXPO_PUBLIC_API_URL" ]; then
    echo "WARNING: EXPO_PUBLIC_API_URL not set; app will fall back to its hardcoded default."
fi
if [ -z "$EXPO_PUBLIC_POSTHOG_API_KEY" ]; then
    echo "INFO: EXPO_PUBLIC_POSTHOG_API_KEY not set; analytics will be disabled in this build."
fi

echo "=== Installing Node.js dependencies ==="

# Install Node.js via Homebrew if not available
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install production dependencies only (skip devDeps like testing libraries
# that cause peer dep conflicts with react@19.1.0 on npm 11+)
npm install --omit=dev

# Apply patches manually (patch-package is a devDep so won't be available)
# Patches from patch-package have paths like a/node_modules/... so we apply from coresense root
if [ -d "patches" ]; then
    echo "=== Applying patches ==="
    for patch_file in patches/*.patch; do
        if [ -f "$patch_file" ]; then
            echo "Applying $patch_file..."
            git apply "$patch_file" || {
                echo "git apply failed, trying with patch command..."
                patch -p1 --forward < "$patch_file" || true
            }
        fi
    done
fi

echo "=== Installing CocoaPods dependencies ==="

# Navigate to ios directory
cd ios

# Install CocoaPods if not available
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    gem install cocoapods
fi

echo "CocoaPods version: $(pod --version)"

# Install pods
pod install

echo "=== ci_post_clone.sh complete ==="

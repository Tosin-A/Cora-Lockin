#!/bin/sh

# Xcode Cloud post-clone script for Expo/React Native
# This script runs after Xcode Cloud clones the repository

set -e

echo "=== Running ci_post_clone.sh ==="

# Navigate to the coresense directory (React Native project root)
cd "$CI_PRIMARY_REPOSITORY_PATH/coresense"

# Write .env file from Xcode Cloud environment variables
# Set these in Xcode Cloud: Workflow > Environment Variables
echo "=== Writing .env from Xcode Cloud environment ==="
cat > .env <<EOL
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=${EXPO_PUBLIC_SUPABASE_SERVICE_KEY}
EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
EOL

# Verify env vars are set
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_SERVICE_KEY" ]; then
    echo "WARNING: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_SERVICE_KEY not set in Xcode Cloud!"
    echo "The app will crash on launch without these. Set them in Xcode Cloud workflow settings."
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
if [ -d "patches" ]; then
    echo "=== Applying patches ==="
    for patch_file in patches/*.patch; do
        if [ -f "$patch_file" ]; then
            echo "Applying $patch_file..."
            git apply --directory=node_modules --unsafe-paths "$patch_file" || {
                echo "git apply failed, trying with patch command..."
                patch -p1 --forward --directory=node_modules < "$patch_file" || true
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

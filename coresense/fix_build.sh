#!/bin/bash
# Fix build issues - sets proper encoding and reinstalls pods

set -e

# Set UTF-8 encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

echo "🔧 Fixing build issues..."

cd "$(dirname "$0")"

# Clean everything
echo "🧹 Cleaning build artifacts..."
rm -rf node_modules package-lock.json
rm -rf ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/CoreSense-*
rm -rf .expo

# Reinstall node modules
echo "📦 Installing node modules..."
npm install

# Install pods with proper encoding
echo "📱 Installing CocoaPods..."
cd ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install

echo "✅ Build fix complete! Try building again with: npx expo run:ios --device"

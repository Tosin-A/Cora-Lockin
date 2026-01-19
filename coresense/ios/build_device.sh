#!/bin/bash

# Improved build script for iOS device with better error handling

set -e

echo "🚀 Building CoreSense for iOS device..."
echo ""

# Check device connection first
echo "📱 Checking device connection..."
DEVICES=$(xcrun xctrace list devices 2>/dev/null || echo "")

if [ -z "$DEVICES" ] || ! echo "$DEVICES" | grep -q "Tsn Iphone"; then
    echo "⚠️  Device not found or not ready"
    echo ""
    echo "Please ensure:"
    echo "  ✓ iPhone is unlocked"
    echo "  ✓ Connected via USB cable (NOT wireless)"
    echo "  ✓ Trusted this computer"
    echo "  ✓ Developer Mode enabled (Settings → Privacy & Security → Developer Mode)"
    echo ""
    echo "Run './check_device.sh' for more details"
    exit 1
fi

echo "✅ Device found: Tsn Iphone"
echo ""

# Check if device is connected via USB (more reliable)
if echo "$DEVICES" | grep -q "Tsn Iphone.*(00008101-000E59913E06001E)"; then
    echo "📱 Device detected. Checking readiness..."
    echo ""
    echo "⚠️  IMPORTANT: If build times out, try:"
    echo "   1. Ensure device is connected via USB cable (not wireless)"
    echo "   2. Unlock your iPhone"
    echo "   3. Enable Developer Mode: Settings → Privacy & Security → Developer Mode"
    echo "   4. Trust this computer if prompted"
    echo ""
fi

# Change to project directory
cd "$(dirname "$0")/.."

# Clean build first to avoid cached issues
echo "🧹 Cleaning previous build..."
cd ios
xcodebuild clean -workspace CoreSense.xcworkspace -scheme CoreSense > /dev/null 2>&1 || true
cd ..

# Build with explicit device ID and increased timeout
echo "🔨 Building app for device..."
echo ""

# Try building with explicit destination
npx expo run:ios --device 00008101-000E59913E06001E --no-build-cache || {
    echo ""
    echo "❌ Build failed with timeout!"
    echo ""
    echo "💡 This usually means the device isn't ready. Try:"
    echo ""
    echo "1. 🔌 Use USB cable (not wireless):"
    echo "   - Disconnect wireless if connected"
    echo "   - Connect iPhone via USB cable"
    echo "   - Wait for device to appear in Finder"
    echo ""
    echo "2. 🔓 Unlock and trust device:"
    echo "   - Unlock your iPhone"
    echo "   - Tap 'Trust' when prompted"
    echo ""
    echo "3. ⚙️  Enable Developer Mode:"
    echo "   - Settings → Privacy & Security → Developer Mode"
    echo "   - Enable it and restart iPhone"
    echo ""
    echo "4. 🏗️  Build via Xcode (most reliable):"
    echo "   cd ios && open CoreSense.xcworkspace"
    echo "   Then select device and click Play button"
    echo ""
    echo "5. 🧪 Or use simulator for testing:"
    echo "   npx expo run:ios"
    echo ""
    exit 1
}

echo ""
echo "✅ Build successful!"

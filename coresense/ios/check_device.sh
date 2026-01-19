#!/bin/bash

# Script to check iOS device connection status
# Run this before building to ensure device is ready

echo "🔍 Checking iOS device connection..."
echo ""

# Check if device is connected
echo "📱 Connected devices:"
echo "---"
xcrun xctrace list devices 2>/dev/null | grep -A 1 "== Devices ==" || echo "No devices found"
echo "---"
echo ""

# Check for specific device
if xcrun xctrace list devices 2>/dev/null | grep -q "Tsn Iphone"; then
    echo "✅ Device 'Tsn Iphone' detected!"
    echo ""
    
    # Check if connected via USB (wireless devices show differently)
    DEVICE_INFO=$(xcrun xctrace list devices 2>/dev/null | grep "Tsn Iphone")
    if echo "$DEVICE_INFO" | grep -q "00008101-000E59913E06001E"; then
        echo "📱 Device ID: 00008101-000E59913E06001E"
        echo ""
        echo "⚠️  If build times out, ensure:"
        echo "   ✓ Device is connected via USB cable (not wireless)"
        echo "   ✓ iPhone is unlocked"
        echo "   ✓ Developer Mode is enabled"
        echo "   ✓ Device is trusted"
    fi
else
    echo "❌ Device 'Tsn Iphone' not found!"
    echo ""
fi

echo "💡 Troubleshooting steps:"
echo ""
echo "1. 🔌 Connect via USB cable (most reliable):"
echo "   - Disconnect wireless connection if active"
echo "   - Connect iPhone via USB cable"
echo "   - Wait for device to appear in Finder"
echo ""
echo "2. 🔓 Unlock and trust:"
echo "   - Unlock your iPhone"
echo "   - Tap 'Trust This Computer' when prompted"
echo "   - Enter your passcode"
echo ""
echo "3. ⚙️  Enable Developer Mode:"
echo "   - Settings → Privacy & Security → Developer Mode"
echo "   - Enable it (may require restart)"
echo "   - Restart iPhone when prompted"
echo ""
echo "4. 🔄 Reset connection:"
echo "   - Disconnect and reconnect USB cable"
echo "   - Restart iPhone"
echo "   - Restart Xcode (if open)"
echo ""
echo "🔧 Manual device check:"
echo "   xcrun xctrace list devices"
echo ""
echo "📋 Build for simulator instead:"
echo "   cd .. && npx expo run:ios"
echo ""

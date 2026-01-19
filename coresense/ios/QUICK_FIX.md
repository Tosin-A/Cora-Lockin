# Quick Fix for Device Build Timeout

## The Problem
```
xcodebuild: error: Timed out waiting for all destinations matching the provided destination specifier to become available
```

## Immediate Solution (3 Steps)

### Step 1: Use USB Cable (NOT Wireless) 🔌
The error message indicates the device is being accessed wirelessly, which is unreliable.

1. **Disconnect wireless connection** (if any)
2. **Connect iPhone via USB cable** directly to your Mac
3. **Wait 10 seconds** for device to be recognized

### Step 2: Prepare Device 🔓
1. **Unlock your iPhone**
2. **Trust this computer** when prompted (tap "Trust" and enter passcode)
3. **Enable Developer Mode**: 
   - Settings → Privacy & Security → Developer Mode
   - Toggle it ON
   - Restart iPhone when prompted

### Step 3: Build via Xcode (Most Reliable) 🏗️
Instead of using command line, use Xcode:

```bash
cd coresense/ios
open CoreSense.xcworkspace
```

Then in Xcode:
1. Select "Tsn Iphone" from the device dropdown (top toolbar)
2. Click the **Play** button (▶️) to build and run
3. Xcode will show detailed errors if there are still issues

## Alternative: Use Simulator
If you just need to test (HealthKit won't work, but other features will):

```bash
cd coresense
npx expo run:ios
```

## Why This Happens
- Wireless device connections are unreliable for building
- Device needs to be "prepared" which requires USB connection
- Developer Mode must be enabled for device builds
- Device must be trusted and unlocked

## Verification
After connecting via USB, verify device is ready:

```bash
cd coresense/ios
./check_device.sh
```

You should see:
```
✅ Device 'Tsn Iphone' detected!
📱 Device ID: 00008101-000E59913E06001E
```

Then try building again:
```bash
cd ..
npx expo run:ios --device
```

## Still Not Working?
See `DEVICE_BUILD_TROUBLESHOOTING.md` for comprehensive troubleshooting.

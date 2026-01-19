# iOS Device Build Troubleshooting Guide

## Current Error
```
xcodebuild: error: Timed out waiting for all destinations matching the provided destination specifier to become available
```

## Quick Fixes (Try in Order)

### 1. Check Device Connection ✅
```bash
cd coresense/ios
./check_device.sh
```

### 2. Ensure Device is Ready
- ✅ **Unlock your iPhone**
- ✅ **Connect via USB cable** (most reliable method)
- ✅ **Trust this computer** when prompted on iPhone
- ✅ **Enable Developer Mode**: Settings → Privacy & Security → Developer Mode
  - If Developer Mode is not visible, you may need to build once in Xcode first

### 3. Reset Device Connection
```bash
# Disconnect and reconnect USB cable
# Then restart iPhone
# Restart Xcode (if open)
```

### 4. Clean Build
```bash
cd coresense/ios
xcodebuild clean -workspace CoreSense.xcworkspace -scheme CoreSense
cd ..
npx expo run:ios --device
```

### 5. Build via Xcode (Most Reliable)
```bash
cd coresense/ios
open CoreSense.xcworkspace
```
Then in Xcode:
1. Select your device from the device dropdown
2. Click the Play button to build and run
3. Xcode will show more detailed error messages if there are issues

### 6. Use Simulator Instead (For Testing)
```bash
cd coresense
npx expo run:ios
```
Note: HealthKit features require a physical device, but you can test other features on simulator.

## Common Issues

### Issue: "Device not found"
**Solution:**
- Use USB cable connection (not wireless)
- Ensure iPhone is unlocked
- Check USB cable is working (try different cable)
- Restart iPhone

### Issue: "Developer Mode not enabled"
**Solution:**
1. Build app once in Xcode (this triggers Developer Mode option)
2. Go to Settings → Privacy & Security → Developer Mode
3. Enable Developer Mode
4. Restart iPhone when prompted

### Issue: "Device not trusted"
**Solution:**
- When iPhone shows "Trust This Computer?" alert, tap "Trust"
- Enter your iPhone passcode
- Wait for device to appear in Xcode

### Issue: "Wireless connection timeout"
**Solution:**
- Use USB cable instead (more reliable)
- Ensure both Mac and iPhone on same WiFi network
- Disable and re-enable WiFi on iPhone
- Restart both devices

## Alternative Build Methods

### Method 1: Use Improved Build Script
```bash
cd coresense/ios
./build_device.sh
```

### Method 2: Build via Xcode
```bash
cd coresense/ios
open CoreSense.xcworkspace
# Select device and click Play button
```

### Method 3: Use Expo Development Build
```bash
cd coresense
npx expo run:ios --device --no-build-cache
```

## Verification Steps

After fixing connection issues, verify:

1. **Device appears in Xcode:**
   ```bash
   xcrun devicectl list devices
   ```

2. **Device is ready:**
   - Should show device name and iOS version
   - No error messages

3. **Build succeeds:**
   ```bash
   cd coresense
   npx expo run:ios --device
   ```

## Still Having Issues?

1. **Check Xcode logs:**
   - Open Xcode → Window → Devices and Simulators
   - Select your device
   - Check for error messages

2. **Check system logs:**
   ```bash
   log show --predicate 'process == "xcodebuild"' --last 5m
   ```

3. **Reset everything:**
   ```bash
   # Clean Xcode derived data
   rm -rf ~/Library/Developer/Xcode/DerivedData
   
   # Clean project
   cd coresense/ios
   xcodebuild clean -workspace CoreSense.xcworkspace -scheme CoreSense
   
   # Reinstall pods
   pod install
   ```

## Next Steps

Once device connection is working:
1. ✅ Build successfully completes
2. ✅ App installs on device
3. ✅ Test HealthKit features (requires physical device)
4. ✅ Verify all features work correctly

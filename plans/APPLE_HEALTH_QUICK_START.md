# Apple Health Integration - Quick Start

## Current Status

✅ **Already Working:**
- Basic HealthKit integration with `react-native-health`
- Steps, sleep, and active energy reading
- Permission screen exists
- Info.plist has usage descriptions

❌ **Needs Setup:**
- HealthKit capability not enabled in Xcode
- Missing background sync
- Limited data types supported
- No write permissions

## Quick Setup (30 minutes)

### Step 1: Enable HealthKit Capability (5 min)

1. Open Xcode:
   ```bash
   cd coresense/ios
   open CoreSense.xcworkspace
   ```

2. Select project → Signing & Capabilities tab

3. Click "+ Capability"

4. Add "HealthKit"

5. Verify entitlements file updated:
   ```xml
   <key>com.apple.developer.healthkit</key>
   <true/>
   ```

### Step 2: Update Entitlements File (2 min)

**File:** `coresense/ios/CoreSense/CoreSense.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.applesignin</key>
    <array>
      <string>Default</string>
    </array>
    <!-- ADD THIS -->
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
  </dict>
</plist>
```

### Step 3: Test on Physical Device (5 min)

**Important:** HealthKit only works on physical devices, not simulators!

1. Connect iPhone/iPad
2. Build and run:
   ```bash
   cd coresense
   npx expo run:ios --device
   ```
3. Test permission flow
4. Verify data reading works

### Step 4: Verify Current Functionality (5 min)

Test existing features:
- [ ] Permission request works
- [ ] Steps data reads correctly
- [ ] Sleep data reads correctly
- [ ] Data syncs to backend

## Common Issues & Fixes

### Issue: "HealthKit is not available"

**Fix:**
- Must use physical device (not simulator)
- Check iOS version >= 12.0
- Verify HealthKit capability enabled

### Issue: "Permissions denied"

**Fix:**
- Go to iOS Settings → Privacy → Health → CoreSense
- Enable desired permissions
- Or use deep link: `x-apple-health://`

### Issue: "Data not syncing"

**Fix:**
- Check network connection
- Verify backend API accessible
- Check authentication token
- Review error logs

## Next Steps

1. **Enable HealthKit capability** (Step 1 above)
2. **Test on physical device**
3. **Review full plan:** `APPLE_HEALTH_INTEGRATION_PLAN.md`
4. **Implement enhancements** as needed

## Testing Checklist

- [ ] HealthKit capability enabled
- [ ] App builds successfully
- [ ] Permission request appears
- [ ] Can read steps data
- [ ] Can read sleep data
- [ ] Data syncs to backend
- [ ] Works on physical device

## Quick Commands

```bash
# Build for iOS device
cd coresense
npx expo run:ios --device

# Check HealthKit availability (in app)
# Use HealthKitPermissionScreen

# View logs
npx expo start --ios
```

## Support

- Full plan: `APPLE_HEALTH_INTEGRATION_PLAN.md`
- HealthKit docs: https://developer.apple.com/documentation/healthkit
- react-native-health: https://github.com/agencyenterprise/react-native-health

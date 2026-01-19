# iOS Backend Connectivity Fix - TODO

## Objective

Fix iOS app's inability to connect to backend at `http://localhost:8000` by:

1. Using Mac's LAN IP (`192.168.0.116`) instead of localhost
2. Allowing HTTP traffic in Info.plist (ATS bypass)

## Tasks

### Step 1: Set Environment Variable

- [x] Add `EXPO_PUBLIC_API_URL=http://192.168.0.116:8000` to `coresense/.env`

### Step 2: Update iOS Info.plist (ATS Configuration)

- [x] Change `NSAllowsArbitraryLoads` from `false` to `true` in `coresense/ios/CoreSense/Info.plist`

### Step 3: Update API URL Fallbacks (6 files)

- [x] `coresense/utils/coresenseApi.ts` - Changed fallback from localhost to IP
- [x] `coresense/stores/authStore.ts` - Changed fallback from localhost to IP
- [x] `coresense/stores/goalsStore.ts` - Changed fallback from localhost to IP (5 occurrences)
- [x] `coresense/stores/wellnessStore.ts` - Changed fallback from localhost to IP
- [x] `coresense/screens/PreferencesScreen.tsx` - Changed fallback from localhost to IP
- [x] `coresense/screens/HealthLogScreen.tsx` - Changed fallback from localhost to IP

### Step 4: Verification

- [x] Test backend connectivity from iOS Safari: `http://192.168.0.116:8000/health`
- [x] Backend server started and listening on all interfaces
- [ ] Verify iOS app can load home screen data

## Notes

- The primary fix is setting `EXPO_PUBLIC_API_URL` in the `.env` file
- The fallback URL changes are safety measures for development
- For production, update the `.env` file with the actual production backend URL

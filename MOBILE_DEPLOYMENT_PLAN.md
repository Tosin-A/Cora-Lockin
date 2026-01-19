# Mobile App Deployment Plan for CoreSense

## 📋 Overview

Convert the Expo React Native app (`coresense/`) into a deployable mobile app that can run on your iPhone.

## 🎯 Goal

Deploy the CoreSense app to your iPhone for testing/development use.

---

## Phase 1: Backend Deployment (Required)

**Purpose:** The app requires a backend API to function properly.

### 1.1 Deploy Backend to Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
cd /Users/ayanfex/Desktop/Projects/Ironamns
railway login
railway init
# Select your Railway project or create new

# Deploy the backend
cd backend
railway up

# Get production URL
railway domain
```

**Alternative: Deploy to Render, Heroku, or Fly.io**

### 1.2 Set Backend Environment Variables in Railway

Add these in Railway dashboard:

- `SUPABASE_URL`: https://ngcmutnfqelsqiuitcfw.supabase.co
- `SUPABASE_KEY`: [your supabase service key]
- `OPENAI_API_KEY`: [your OpenAI API key]
- `SECRET_KEY`: [generate a secure random string]

---

## Phase 2: App Configuration

### 2.1 Update Environment Variables

Create/update `coresense/.env`:

```env
EXPO_PUBLIC_API_URL=[your-railway-backend-url]
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
EXPO_PUBLIC_ENV=development
```

### 2.2 Verify EAS Configuration

Your `eas.json` is already configured with:

- Bundle ID: com.coresense.app
- Apple Team ID: 3RVGPKK5M8

---

## Phase 3: Install Dependencies

### 3.1 Install EAS CLI

```bash
npm install -g @expo/eas-cli
```

### 3.2 Install App Dependencies

```bash
cd coresense
npm install
```

---

## Phase 4: Build & Install on iPhone

### Option A: Development Build (Recommended for Testing)

**Step 1: Build Development Client**

```bash
cd coresense
eas build --profile development --platform ios
```

**Step 2: Install on iPhone**

1. After build completes, you'll get a download link (`.ipa` file)
2. Transfer the `.ipa` to your iPhone using:
   - AirDrop, OR
   - Email to yourself, OR
   - Upload to a service and download on iPhone

**Step 3: Install**

1. On iPhone, tap the `.ipa` file
2. Go to Settings → General → VPN & Device Management
3. Trust the developer certificate

### Option B: Build for Simulator (Free, No Apple Developer Account Required)

**Step 1: Build for Simulator**

```bash
eas build --profile preview --platform ios
```

**Step 2: Install on Simulator**

1. Download the build (`.tar.gz`)
2. Extract and locate the `.app` file
3. Open Simulator (Xcode → Open Developer Tool → Simulator)
4. Drag and drop the `.app` file onto the simulator

### Option C: USB Installation (Requires Apple Developer Account)

**Step 1: Build with Development Client**

```bash
eas build --profile development --platform ios --local
```

**Step 2: Install via USB**

```bash
# Connect iPhone via USB
# Trust the computer on your iPhone

xcrun simctl install udid path/to/app.ipa
xcrun simctl boot udid
```

---

## Phase 5: Start the App

### 5.1 For Development Build

1. Open the CoreSense app on your iPhone
2. The app will connect to your backend automatically

### 5.2 For Development with Hot Reload (Optional)

```bash
cd coresense
npx expo start --dev-client
```

Then scan the QR code with your iPhone camera.

---

## ✅ Success Criteria

- [ ] Backend is deployed and accessible
- [ ] App builds successfully
- [ ] App installs on iPhone without errors
- [ ] App launches and shows login screen
- [ ] App can authenticate with Supabase
- [ ] App can connect to backend API

---

## 🔧 Troubleshooting

### "Could not connect to server"

- ✅ Ensure backend is deployed and accessible
- ✅ Verify `EXPO_PUBLIC_API_URL` is correct
- ✅ Check backend CORS settings allow your app

### Build Fails

- ✅ Ensure Apple Developer account is linked
- ✅ Check bundle ID matches your provisioning profile
- ✅ Verify all environment variables are set

### App Crashes on Launch

- ✅ Check iOS version compatibility
- ✅ Ensure all required permissions are configured
- ✅ Verify Supabase keys are correct

---

## 📱 Next Steps (After Testing)

1. **Test all features** on physical device
2. **Fix any bugs** discovered during testing
3. **Build for production** when ready
4. **Submit to TestFlight** for beta testing
5. **Submit to App Store** for release

---

## 📞 Additional Resources

- **EAS Build Documentation**: https://docs.expo.dev/build/introduction/
- **Deploying to iOS**: https://docs.expo.dev/distribution/building-standalone-apps/
- **Apple Developer Program**: https://developer.apple.com/programs/

---

**Estimated Time:** 1-2 hours (mostly build time)
**Cost:** Free for development builds (Apple Developer Account required for device installation)

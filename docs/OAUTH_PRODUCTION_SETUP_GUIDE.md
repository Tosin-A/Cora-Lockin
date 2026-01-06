# OAuth Production Setup Guide

## 🔐 Fix Google & Apple Sign-In for App Store

**Current Issue:** OAuth not working because providers aren't configured in Supabase for production

---

## 🚨 The Problem

When users try to sign up with Google, they get **"couldn't connect to server"** because:

1. **OAuth providers not enabled** in Supabase
2. **Redirect URLs not configured** for production
3. **App scheme not added** to OAuth settings

---

## 🛠️ Step-by-Step OAuth Configuration

### Step 1: Enable OAuth in Supabase

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Sign in with your account
   - Select project: `ngcmutnfqelsqiuitcfw`

2. **Enable Google Provider:**
   - Go to: **Authentication** → **Providers**
   - Find **Google** and toggle it **ON**
   - Click **Configure**

3. **Enable Apple Provider:**
   - Find **Apple** and toggle it **ON** 
   - Click **Configure**

### Step 2: Get Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create new project or select existing one

2. **Enable Google+ API:**
   - Go to **APIs & Services** → **Library**
   - Search "Google+ API" or "Google Identity API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `CoreSense Mobile App`

4. **Add Authorized Redirect URIs:**
   ```
   https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback
   ```

5. **Copy Credentials:**
   - **Client ID**: Copy this
   - **Client Secret**: Copy this

### Step 3: Configure Google in Supabase

**In Supabase Google Provider Settings:**
- **Client ID**: Paste your Google Client ID
- **Client Secret**: Paste your Google Client Secret
- **Redirect URL**: `https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback`
- Click **Save**

### Step 4: Configure Apple Sign In

**Option A: Native iOS Apple Sign In (Recommended)**

1. **Apple Developer Setup:**
   - Go to: https://developer.apple.com/account/
   - Ensure you have an Apple Developer account
   - Bundle ID should be: `com.coresense.app`

2. **Enable Sign in with Apple:**
   - In Xcode (when building for production)
   - Go to **Signing & Capabilities**
   - Add **Sign in with Apple** capability

**Option B: Web Apple OAuth (Fallback)**

1. **Create Service ID in Apple Developer:**
   - Go to **Identifiers** → **Services IDs**
   - Create new Service ID: `com.coresense.web`
   - Enable **Sign in with Apple**

2. **Add to Supabase Apple Provider:**
   - **Services ID**: `com.coresense.web`
   - **Team ID**: `3RVGPKK5M8`
   - **Key ID**: From Apple Developer keys
   - **Secret Key**: Upload .p8 key file

### Step 5: Configure Redirect URLs

1. **In Supabase Dashboard:**
   - Go to **Authentication** → **URL Configuration**

2. **Add Site URL:**
   ```
   coresense://
   ```

3. **Add Redirect URLs:**
   ```
   coresense://
   exp://localhost:8081
   exp://192.168.*.*:8081
   https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback
   ```

4. **Click Save**

---

## 🧪 Testing OAuth

### After Configuration:

1. **Restart Expo Metro:**
   ```bash
   npx expo start --clear
   ```

2. **Test Google Sign In:**
   - Open CoreSense app
   - Click **"Sign in with Google"**
   - Should open Google sign-in page
   - After signing in, should return to app and authenticate

3. **Test Apple Sign In (iOS only):**
   - On iOS device/simulator
   - Click **"Sign in with Apple"**
   - Should open Apple sign-in sheet
   - After signing in, should return to app and authenticate

---

## 🎯 Production URLs Checklist

### Google Cloud Console - Authorized Redirect URIs:
- [ ] `https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback`

### Supabase - Site URL:
- [ ] `coresense://`

### Supabase - Redirect URLs:
- [ ] `coresense://`
- [ ] `https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback`

### Apple Developer (if using web Apple OAuth):
- [ ] Service ID: `com.coresense.web`
- [ ] Return URLs: `https://ngcmutnfqelsqiuitcfw.supabase.co/auth/v1/callback`

---

## 🔧 Common Issues & Solutions

### Issue: "Invalid client" error
**Solution:** Check Google Client ID and Secret are correct in Supabase

### Issue: "Redirect URI mismatch"
**Solution:** Ensure redirect URLs in Google Console match Supabase exactly

### Issue: OAuth opens but doesn't return to app
**Solution:** Check app scheme `coresense://` is in redirect URLs

### Issue: Apple Sign-In not showing
**Solution:** Only works on iOS devices/simulator, not Expo Go web

### Issue: "Couldn't connect to server" still appears
**Solution:** This is likely the API URL issue, not OAuth. Fix API URL first.

---

## 📱 App Store Specific OAuth

### For App Store Submission:

1. **Bundle ID Consistency:**
   - App Bundle ID: `com.coresense.app`
   - Apple Service ID: `com.coresense.web` (if using web Apple OAuth)
   - Must match exactly in all configurations

2. **Privacy Policy URL:**
   - Required for App Store submission
   - Add to App Store Connect when submitting

3. **OAuth Testing:**
   - Test OAuth flow thoroughly on real devices
   - Use TestFlight for beta testing before App Store submission

---

## ✅ Success Indicators

Once OAuth is configured correctly:

1. ✅ **Google sign-in** works immediately
2. ✅ **Apple sign-in** works on iOS devices
3. ✅ **OAuth users** appear in Supabase auth.users
4. ✅ **Sessions** persist after app restart
5. ✅ **No more "OAuth failed" errors**

---

## 🚀 Quick Setup Summary

1. **Enable Google & Apple providers** in Supabase
2. **Get Google OAuth credentials** from Google Cloud Console
3. **Configure redirect URLs** in both Google Console and Supabase
4. **Add app scheme** to redirect URLs
5. **Test OAuth flow** thoroughly
6. **Use production build** for final testing

**The OAuth infrastructure is solid - we just need to configure the providers!** 🎉

---

## 💡 Pro Tips

- **Start with Google OAuth** (easier to configure)
- **Use TestFlight** for testing OAuth on real devices
- **Keep Apple OAuth optional** initially (can add later)
- **Monitor Supabase logs** for OAuth debugging
- **Test on multiple devices** to ensure consistency

OAuth configuration is the final step before App Store submission! 🚀

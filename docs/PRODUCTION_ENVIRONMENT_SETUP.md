# Production Environment Setup Guide

## 🔧 Environment Configuration Files

### 1. Production Environment File

**File:** `coresense/.env.production`

```env
# Production Environment Configuration for CoreSense

# Supabase Configuration (Production)
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY211dG5mcWVsc3FpdWl0Y2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA4MDIsImV4cCI6MjA4MDY5NjgwMn0.C0kjJBs5UbiEdXhB3_Hwe_TADZ8VkuBf2VpdTTsCVNo

# 🚨 CRITICAL: Update this to your PRODUCTION API URL
# Options:
# 1. Railway: https://coresense-api.railway.app
# 2. Heroku: https://coresense-api.herokuapp.com
# 3. Custom: https://your-api-domain.com
EXPO_PUBLIC_API_URL=https://coresense-api.railway.app

# Environment Indicator (optional)
EXPO_PUBLIC_ENV=production

# Bot Phone Number (if using messaging features)
# EXPO_PUBLIC_BOT_PHONE_NUMBER=+447417499989

# Development Note:
# - Keep EXPO_PUBLIC_ prefix for all variables that need to be accessible in the app
# - Remove EXPO_PUBLIC_ prefix for server-side only variables
# - Never put sensitive keys here (service keys, API secrets, etc.)
```

### 2. EAS Build Configuration

**File:** `coresense/eas.json`

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.coresense.app",
        "appleTeamId": "3RVGPKK5M8"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "3RVGPKK5M8"
      }
    }
  }
}
```

### 3. Current .env File to Update

**File:** `coresense/.env` (CURRENT - needs update)

**Change FROM:**
```env
EXPO_PUBLIC_API_URL=http://192.168.0.116:8000
```

**Change TO:**
```env
EXPO_PUBLIC_API_URL=https://coresense-api.railway.app
```

---

## 🚀 Quick Setup Steps

### Step 1: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
cd backend
railway login
railway init
railway up

# Get your production URL
railway domain
```

### Step 2: Update Environment Configuration

1. **Copy production environment file:**
   ```bash
   cp docs/PRODUCTION_ENVIRONMENT_SETUP.md coresense/.env.production
   ```

2. **Update the `.env.production` file with your actual production API URL**

3. **Replace current `.env` file:**
   ```bash
   cp .env.production .env
   ```

### Step 3: Test API Connection

```bash
cd coresense
npx expo start --clear

# Test in browser: http://localhost:8081
# Check that API calls work without "connection" errors
```

### Step 4: Build for Production

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

---

## 🔍 Environment Variables Reference

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://ngcmutnfqelsqiuitcfw.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `EXPO_PUBLIC_API_URL` | **CRITICAL** - Your production backend URL | `https://coresense-api.railway.app` |

### Optional Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `EXPO_PUBLIC_ENV` | Environment indicator | `production` |
| `EXPO_PUBLIC_BOT_PHONE_NUMBER` | For messaging features | `+447417499989` |

### ⚠️ Security Notes

- **Never put service keys** in environment files
- **Never commit** `.env` files to version control
- **Use `EXPO_PUBLIC_` prefix** only for variables that need to be accessible in the app
- **Keep sensitive keys** in Railway/Heroku environment variables instead

---

## 🔧 Troubleshooting

### "Couldn't connect to server" Error
**Cause:** Still using localhost IP in `EXPO_PUBLIC_API_URL`
**Solution:** Update to production API URL

### Build Fails
**Cause:** Missing EAS configuration
**Solution:** Ensure `eas.json` file exists with correct configuration

### OAuth Not Working
**Cause:** OAuth providers not configured in Supabase
**Solution:** Follow OAuth setup guide in next section

---

## 📱 App Store Submission

### Prerequisites
- [ ] Apple Developer Account ($99/year)
- [ ] Backend deployed and API URL working
- [ ] Environment variables configured
- [ ] OAuth providers configured
- [ ] App assets prepared (icon, screenshots)

### Build Commands
```bash
# Development build (for testing)
eas build --profile preview --platform ios

# Production build (for App Store)
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

### Success Indicators
- ✅ App builds without errors
- ✅ API connection works in production build
- ✅ OAuth sign-in functions properly
- ✅ All app features work as expected

---

## 🎯 Next Steps

1. **Deploy backend** to Railway/Heroku
2. **Update environment variables** with production URL
3. **Test API connectivity** thoroughly
4. **Configure OAuth providers** (Google/Apple)
5. **Prepare App Store assets**
6. **Build and submit** to App Store

The "couldn't connect to server" issue will be resolved once the API URL is updated to a production endpoint! 🚀

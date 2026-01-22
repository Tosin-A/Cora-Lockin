# CoreSense Cloud Deployment Plan

This plan eliminates all local IP/port dependencies by deploying the backend to a cloud platform and configuring the mobile app to use the public URL.

---

## Overview

| Component | Current State | Target State |
|-----------|--------------|--------------|
| Backend | Runs on `192.168.0.116:8000` | Deployed to Railway with public URL |
| Mobile App | Hardcoded local IP in 5+ files | Uses `EXPO_PUBLIC_API_URL` consistently |
| Database | Supabase (already cloud) | No change needed |

---

## Phase 1: Fix Hardcoded IP Addresses in Mobile App

**Files to fix** (these bypass the centralized API client):

| File | Issue |
|------|-------|
| `coresense/stores/goalsStore.ts` | Falls back to `192.168.0.116:8000` |
| `coresense/stores/authStore.ts` | Falls back to `192.168.0.116:8000` |
| `coresense/stores/wellnessStore.ts` | Falls back to `192.168.0.116:8000` |
| `coresense/screens/HealthLogScreen.tsx` | Hardcoded `192.168.0.116:8000` |
| `coresense/screens/PreferencesScreen.tsx` | Hardcoded `192.168.0.116:8000` |

**Solution**: Create a centralized config and update all files to use it.

### Step 1.1: Create API configuration utility

Create `coresense/utils/apiConfig.ts`:
```typescript
import { Platform } from 'react-native';

/**
 * Returns the base API URL for the backend.
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (production)
 * 2. Platform-specific development fallbacks
 */
export function getApiBaseUrl(): string {
  // Production: use environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('192.168') && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // Development fallbacks
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host machine
      return 'http://10.0.2.2:8000';
    }
    // iOS simulator shares network with host
    return 'http://localhost:8000';
  }

  // Production must have EXPO_PUBLIC_API_URL set
  if (envUrl) {
    return envUrl;
  }

  throw new Error('EXPO_PUBLIC_API_URL must be set for production builds');
}

export const API_BASE_URL = getApiBaseUrl();
```

### Step 1.2: Update all files to use centralized config

Replace hardcoded URLs in each file with:
```typescript
import { API_BASE_URL } from '../utils/apiConfig';
// or
import { API_BASE_URL } from '../../utils/apiConfig';
```

---

## Phase 2: Deploy Backend to Railway

Railway is the recommended platform (config already exists).

### Step 2.1: Prerequisites

- Railway account: https://railway.app
- Railway CLI (optional): `npm install -g @railway/cli`

### Step 2.2: Deploy via Railway Dashboard

1. **Connect Repository**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select `Tosin-A/CoraLock-in` repository
   - Railway will auto-detect the Dockerfile

2. **Configure Environment Variables**

   Add these in Railway Dashboard → Your Project → Variables:

   | Variable | Value | Required |
   |----------|-------|----------|
   | `SUPABASE_URL` | `https://ngcmutnfqelsqiuitcfw.supabase.co` | Yes |
   | `SUPABASE_SERVICE_KEY` | Your Supabase service key | Yes |
   | `OPENAI_API_KEY` | Your OpenAI API key | Yes |
   | `GPT_MODEL` | `gpt-4o-mini` | No (has default) |
   | `ENVIRONMENT` | `production` | No |
   | `PORT` | Leave blank (Railway sets this) | No |

3. **Configure Build Settings**
   - Root Directory: `/` (project root)
   - Dockerfile Path: `Dockerfile`
   - Railway will use the Procfile automatically

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

5. **Get Public URL**
   - Go to Settings → Networking → Generate Domain
   - You'll get a URL like: `https://coresense-production.up.railway.app`

### Step 2.3: Alternative - Deploy via CLI

```bash
# Login to Railway
railway login

# Initialize project (from /Users/ayanfex/Desktop/Projects/Ironamns)
railway init

# Link to existing project or create new
railway link

# Set environment variables
railway variables set SUPABASE_URL="https://ngcmutnfqelsqiuitcfw.supabase.co"
railway variables set SUPABASE_SERVICE_KEY="your-key"
railway variables set OPENAI_API_KEY="your-key"
railway variables set ENVIRONMENT="production"

# Deploy
railway up

# Get public URL
railway domain
```

### Step 2.4: Verify Deployment

```bash
# Test health endpoint
curl https://YOUR-RAILWAY-URL.up.railway.app/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}

# Test API docs
open https://YOUR-RAILWAY-URL.up.railway.app/docs
```

---

## Phase 3: Configure Mobile App for Production

### Step 3.1: Update Environment Variable

Edit `coresense/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

### Step 3.2: Configure EAS Build Environments

Edit `coresense/eas.json` to add environment-specific configs:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8000"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://YOUR-RAILWAY-URL.up.railway.app"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://YOUR-RAILWAY-URL.up.railway.app"
      }
    }
  }
}
```

### Step 3.3: Build the App

```bash
cd coresense

# For testing (internal distribution)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# For App Store / Play Store
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Step 3.4: Install on Device

**iOS (Preview Build)**:
1. EAS will provide a download link
2. Open link on your iPhone
3. Install the provisioning profile if prompted
4. App appears on home screen

**Android (Preview Build)**:
1. EAS provides APK download link
2. Download and install APK
3. Enable "Install from unknown sources" if needed

---

## Phase 4: Alternative Cloud Platforms

### Option A: Render (Free Tier Available)

1. Go to https://render.com
2. New → Web Service → Connect GitHub
3. Configure:
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables
5. Deploy

### Option B: Fly.io

```bash
# Install Fly CLI
brew install flyctl

# Login
fly auth login

# Launch from project root
fly launch

# Deploy
fly deploy

# Get URL
fly status
```

### Option C: Google Cloud Run

```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/coresense-backend

# Deploy
gcloud run deploy coresense-backend \
  --image gcr.io/PROJECT_ID/coresense-backend \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=...,OPENAI_API_KEY=..."
```

---

## Phase 5: Post-Deployment Checklist

### Backend Verification
- [ ] Health endpoint returns 200: `GET /health`
- [ ] API docs accessible: `GET /docs`
- [ ] Authentication works: `POST /api/v1/auth/login`
- [ ] AI coaching responds: `POST /api/v1/coach/chat`

### Mobile App Verification
- [ ] App launches without crashes
- [ ] Login/signup works
- [ ] Home screen loads data
- [ ] AI coach responds to messages
- [ ] Health data syncs (if HealthKit authorized)

### Security Checklist
- [ ] HTTPS enabled (Railway provides this by default)
- [ ] API keys not exposed in client code
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled

---

## Architecture After Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        CLOUD                                 │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐  │
│  │   Railway    │     │   Supabase   │    │   OpenAI     │  │
│  │   Backend    │────▶│   Postgres   │    │   API        │  │
│  │              │     │   + Auth     │    │              │  │
│  │ FastAPI      │     └──────────────┘    └──────────────┘  │
│  │ Port: $PORT  │                                ▲          │
│  └──────┬───────┘                                │          │
│         │                                        │          │
│         │ HTTPS                                  │          │
└─────────┼────────────────────────────────────────┼──────────┘
          │                                        │
          ▼                                        │
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE DEVICE                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  CoreSense App                        │   │
│  │                                                       │   │
│  │  EXPO_PUBLIC_API_URL = https://xxx.railway.app       │   │
│  │                                                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│  │  │  Home   │  │  Coach  │  │ Insights│  │ Profile │  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Estimates

| Platform | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Railway | $5 free credit/month | $5/month + usage |
| Render | 750 hrs/month free | $7/month |
| Fly.io | 3 shared VMs free | $1.94/month/VM |
| Supabase | 500MB DB, 50K auth | $25/month |

**Recommended**: Railway ($0-5/month for light usage)

---

## Troubleshooting

### Backend won't start on Railway
- Check logs: Railway Dashboard → Deployments → View Logs
- Verify all required env vars are set
- Ensure Dockerfile is at project root

### Mobile app can't connect to backend
- Verify `EXPO_PUBLIC_API_URL` is set correctly
- Check for CORS issues in backend logs
- Ensure URL uses HTTPS (not HTTP)

### Build fails on EAS
- Run `npx expo doctor` to check for issues
- Ensure all native dependencies are compatible
- Check EAS build logs for specific errors

---

## Quick Reference Commands

```bash
# Backend (Railway)
railway logs                    # View logs
railway status                  # Check deployment status
railway variables              # List env vars

# Mobile (EAS)
eas build --platform ios       # Build iOS
eas build --platform android   # Build Android
eas build:list                 # List all builds
eas submit                     # Submit to stores
```

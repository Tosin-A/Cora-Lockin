# Complete Deployment Guide for CoreSense

This guide will walk you through deploying the CoreSense backend to production and building the iOS mobile app for your iPhone.

---

## 📋 Overview

Your CoreSense application consists of:
1. **Backend**: FastAPI Python server (located in `/backend`)
2. **Mobile App**: React Native/Expo iOS app (located in `/coresense`)

You'll need to:
1. Deploy the backend to a cloud hosting service (Railway, Render, or Fly.io)
2. Build the iOS app using Expo Application Services (EAS)
3. Install the app on your iPhone

---

## 🎯 Prerequisites

### Required Accounts & Tools

- [ ] **Expo Account** (free) - [Create at expo.dev](https://expo.dev)
- [ ] **Apple Developer Account** ($99/year) - [Join at developer.apple.com](https://developer.apple.com/programs/)
  - ⚠️ **Note**: Required for installing on a physical iPhone. For simulator testing, this is optional.
- [ ] **Supabase Account** (free tier available) - Already configured
- [ ] **OpenAI API Key** - For AI coaching features
- [ ] **Backend Hosting Account** (choose one):
  - Railway (recommended, easiest) - [railway.app](https://railway.app)
  - Render (free tier) - [render.com](https://render.com)
  - Fly.io (free tier) - [fly.io](https://fly.io)

### Required Software

- [x] Python 3.8+ (already installed)
- [x] Node.js 16+ (already installed)
- [ ] Railway CLI (if using Railway) OR Render/Fly.io CLI
- [ ] EAS CLI for Expo builds
- [ ] Xcode (for iOS builds) - Already on macOS

---

## 🚀 PART 1: Backend Deployment

### Option A: Deploy to Railway (Recommended - Easiest)

Railway is the simplest option with automatic deployments from GitHub.

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

#### Step 3: Initialize Railway Project

```bash
cd /Users/ayanfex/Desktop/Projects/Ironamns/backend
railway init
```

- Choose "Create a new project" or "Link to existing project"
- Name it: `coresense-backend`

#### Step 4: Configure Environment Variables

⚠️ **SECURITY WARNING**: The keys shown below are examples. You must use your actual keys!

**Method A: Using Railway Dashboard (Recommended)**
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project → Your service
3. Click **"Variables"** tab
4. Click **"+ New Variable"** for each:
   - `SUPABASE_URL` = `https://ngcmutnfqelsqiuitcfw.supabase.co`
   - `SUPABASE_SERVICE_KEY` = [Get from Supabase Dashboard → Settings → API → **service_role** key]
   - `OPENAI_API_KEY` = [Your OpenAI API key]
   - `GPT_MODEL` = `gpt-4o-mini`
   - `PORT` = `8000`
   - `ENVIRONMENT` = `production`

**Method B: Using Railway CLI**
```bash
cd backend

# Set each variable (replace with your actual keys!)
railway variables set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_role_key_here
railway variables set OPENAI_API_KEY=your_openai_key_here
railway variables set GPT_MODEL=gpt-4o-mini
railway variables set PORT=8000
railway variables set ENVIRONMENT=production

# Verify
railway variables
```

**Method C: Using the helper script**
```bash
./SET_ENV_VARIABLES.sh
# Then manually set SUPABASE_SERVICE_KEY and OPENAI_API_KEY
```

**🔑 How to get your Supabase Service Key:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select project: `ngcmutnfqelsqiuitcfw`
3. Go to **Settings** → **API**
4. Find **"Project API keys"** section
5. Copy the **`service_role`** key (the secret one, NOT the anon/public key!)
6. This key should contain `"role":"service_role"` when decoded

**To get your Supabase Service Key:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `ngcmutnfqelsqiuitcfw`
3. Go to Settings → API
4. Copy the **`service_role`** key (NOT the anon key)

#### Step 5: Create Railway Configuration

Create a file `railway.json` in the `backend/` directory:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Step 6: Deploy

```bash
railway up
```

Railway will:
- Build your Docker image
- Deploy it
- Provide you with a URL like: `https://coresense-backend-production.up.railway.app`

#### Step 7: Get Your Production URL

```bash
railway domain
```

Or check in Railway dashboard → Settings → Generate Domain

**Save this URL** - you'll need it for the mobile app configuration!

#### Step 8: Test Your Backend

```bash
curl https://your-railway-url.up.railway.app/health
```

Should return: `{"status":"healthy","service":"coresense-backend"}`

---

### Option B: Deploy to Render (Free Tier)

#### Step 1: Connect GitHub Repository

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository

#### Step 2: Configure Service

- **Name**: `coresense-backend`
- **Environment**: `Docker`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `backend`

#### Step 3: Set Environment Variables

In Render dashboard → Environment tab:

```
SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
GPT_MODEL=gpt-4o-mini
PORT=8000
ENVIRONMENT=production
```

#### Step 4: Deploy

Render will automatically:
- Build from your Dockerfile
- Deploy to a URL like: `https://coresense-backend.onrender.com`

---

### Option C: Deploy to Fly.io

#### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login

```bash
fly auth login
```

#### Step 3: Create Fly App

```bash
cd backend
fly launch
```

Follow the prompts. Fly.io will detect your Dockerfile.

#### Step 4: Set Secrets (Environment Variables)

```bash
fly secrets set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
fly secrets set SUPABASE_SERVICE_KEY=your_service_key
fly secrets set OPENAI_API_KEY=your_openai_key
fly secrets set GPT_MODEL=gpt-4o-mini
fly secrets set ENVIRONMENT=production
```

#### Step 5: Deploy

```bash
fly deploy
```

Your app will be available at: `https://coresense-backend.fly.dev`

---

## 📱 PART 2: Mobile App Configuration

Now that your backend is deployed, configure the mobile app to connect to it.

### Step 1: Update Environment Variables

Navigate to the coresense directory and create/update `.env` file:

```bash
cd /Users/ayanfex/Desktop/Projects/Ironamns/coresense
```

Create `.env` file with:

```env
# Replace with your actual production backend URL from Part 1
EXPO_PUBLIC_API_URL=https://your-backend-url.up.railway.app

# Supabase Configuration (already configured)
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY211dG5mcWVsc3FpdWl0Y2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA4MDIsImV4cCI6MjA4MDY5NjgwMn0.C0kjJBs5UbiEdXhB3_Hwe_TADZ8VkuBf2VpdTTsCVNo

# Environment
EXPO_PUBLIC_ENV=production
```

**⚠️ IMPORTANT**: Replace `https://your-backend-url.up.railway.app` with your actual Railway/Render/Fly.io URL from Part 1!

### Step 2: Verify EAS Configuration

Your `eas.json` is already configured correctly. Verify it matches:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Update CORS in Backend (If Needed)

If you get CORS errors, update `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Or for better security, use specific origins:
```python
allow_origins=[
    "exp://localhost:8081",  # Expo development
    "https://coresense.app",  # Your app domain
]
```

---

## 🏗️ PART 3: Build iOS App

### Step 1: Install EAS CLI

```bash
npm install -g @expo/eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have one, create it at [expo.dev](https://expo.dev).

### Step 3: Configure EAS Project

```bash
cd coresense
eas build:configure
```

This will link your project to EAS (your `eas.json` is already set up).

### Step 4: Link Apple Developer Account (For Physical Device)

**Option A: Automatic (Recommended)**

```bash
eas device:create
```

Then:
```bash
eas build --profile development --platform ios
```

EAS will guide you through:
1. Linking your Apple Developer account
2. Selecting your Apple Team ID: `3RVGPKK5M8`
3. Creating necessary certificates

**Option B: Manual Certificate Management**

If automatic doesn't work:

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Create a Development Certificate
3. Download and configure in EAS

### Step 5: Build Development Version (For Testing)

```bash
eas build --profile development --platform ios
```

This will:
- Build your app in the cloud
- Take 10-20 minutes
- Provide a download link when complete

**What you'll get:**
- A `.ipa` file for installation on your iPhone
- Or a `.tar.gz` file for simulator installation

### Step 6: Alternative - Build for Simulator (Free, No Apple Developer Account Needed)

If you don't have an Apple Developer account yet:

```bash
eas build --profile preview --platform ios
```

Then select "simulator" when prompted.

---

## 📲 PART 4: Install App on iPhone

### Method A: Direct Installation (Development Build)

After your build completes, you'll receive a download link.

1. **Download the `.ipa` file** to your Mac
2. **Transfer to iPhone** using one of these methods:

   **Option 1: AirDrop (Easiest)**
   - Right-click the `.ipa` file on Mac
   - Select "Share" → "AirDrop"
   - Choose your iPhone
   - On iPhone, tap "Accept"

   **Option 2: Email**
   - Email the `.ipa` file to yourself
   - Open email on iPhone
   - Tap the attachment

   **Option 3: Cloud Storage**
   - Upload `.ipa` to iCloud Drive, Google Drive, or Dropbox
   - Download on iPhone

3. **Install the App**
   - On iPhone, tap the `.ipa` file
   - You may see "Untrusted Developer"
   - Go to: **Settings → General → VPN & Device Management**
   - Find your developer certificate
   - Tap "Trust [Your Name]"
   - Return and tap the `.ipa` again to install

4. **Launch the App**
   - Find "CoreSense" on your home screen
   - Tap to open
   - The app should connect to your production backend!

### Method B: TestFlight (Beta Testing - Recommended)

For a more professional beta testing experience:

1. **Build for TestFlight:**
   ```bash
   eas build --profile production --platform ios
   ```

2. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios
   ```

3. **Distribute:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Add testers
   - Send TestFlight invitation

### Method C: Simulator Installation (Mac Only)

If you built for simulator:

1. **Download the `.tar.gz` file** from EAS
2. **Extract it:**
   ```bash
   tar -xzf your-build.tar.gz
   ```

3. **Open iOS Simulator:**
   ```bash
   open -a Simulator
   ```

4. **Drag and drop the `.app` file** onto the simulator

---

## ✅ PART 5: Verification & Testing

### Test Backend Connection

1. Open the CoreSense app on your iPhone
2. Sign in with your account
3. Check that:
   - [ ] App loads without connection errors
   - [ ] Home screen displays data
   - [ ] Chat screen can send/receive messages
   - [ ] API calls work (no "couldn't connect to server" errors)

### Test Key Features

- [ ] Authentication works
- [ ] Home screen loads with data
- [ ] Chat with AI coach works
- [ ] Insights screen displays patterns
- [ ] Health data syncs (if enabled)
- [ ] Notifications work (if configured)

### Troubleshooting

**"Couldn't connect to server" Error:**
- ✅ Verify `EXPO_PUBLIC_API_URL` in `.env` is correct
- ✅ Check backend is running: `curl https://your-backend-url/health`
- ✅ Verify CORS settings allow your app
- ✅ Check backend logs in Railway/Render/Fly.io dashboard

**Build Fails:**
- ✅ Ensure all environment variables are set
- ✅ Check `eas.json` configuration
- ✅ Verify Apple Developer account is linked
- ✅ Check EAS build logs for specific errors

**App Crashes on Launch:**
- ✅ Check iOS version compatibility (requires iOS 13+)
- ✅ Verify all required permissions are configured
- ✅ Check Supabase keys are correct
- ✅ Review crash logs in Xcode Console

**Backend Not Responding:**
- ✅ Check Railway/Render/Fly.io service status
- ✅ Review backend logs for errors
- ✅ Verify environment variables are set correctly
- ✅ Check if service is sleeping (Render free tier sleeps after inactivity)

---

## 🔄 PART 6: Continuous Deployment

### Automatic Backend Deployment

**Railway (Automatic from GitHub):**
1. Connect your GitHub repo to Railway
2. Railway auto-deploys on every push to `main`

**Render:**
- Already configured for auto-deploy from GitHub

**Fly.io:**
```bash
fly deploy  # Manual deployment
```

### Update Mobile App

After backend changes:

1. **Update `.env` file** if API URL changed
2. **Rebuild app:**
   ```bash
   eas build --profile development --platform ios
   ```
3. **Reinstall on iPhone** using the new `.ipa`

---

## 📊 Cost Breakdown

### Free Tier Options

- **Railway**: $5/month (with $5 credit) OR pay-as-you-go
- **Render**: Free tier (sleeps after 15 min inactivity)
- **Fly.io**: Free tier with generous limits
- **Expo EAS**: Free tier includes builds
- **Supabase**: Free tier available
- **Apple Developer**: $99/year (required for device installation)

### Recommended Setup (Minimum Cost)

- Backend: **Render** (Free, sleeps when inactive)
- Mobile Builds: **EAS Free Tier**
- Database: **Supabase Free Tier**
- Total: **$99/year** (Apple Developer only)

---

## 🎯 Next Steps

After successful deployment:

1. **Monitor Backend:**
   - Set up error tracking (Sentry, LogRocket)
   - Monitor API response times
   - Set up uptime monitoring

2. **Optimize:**
   - Enable caching for frequently accessed data
   - Optimize database queries
   - Implement CDN for static assets

3. **Scale:**
   - Upgrade hosting plan as traffic grows
   - Implement rate limiting
   - Add database connection pooling

4. **Submit to App Store:**
   ```bash
   eas build --profile production --platform ios
   eas submit --platform ios
   ```

---

## 📞 Support & Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Railway Docs**: https://docs.railway.app
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Supabase Docs**: https://supabase.com/docs

---

## ✅ Deployment Checklist

### Backend
- [ ] Backend deployed to Railway/Render/Fly.io
- [ ] Health endpoint works: `/health`
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Domain URL saved for mobile app

### Mobile App
- [ ] `.env` file created with production API URL
- [ ] EAS CLI installed and logged in
- [ ] Apple Developer account linked (for device)
- [ ] App built successfully
- [ ] `.ipa` file downloaded

### Installation
- [ ] App installed on iPhone
- [ ] Developer certificate trusted
- [ ] App launches without errors
- [ ] Can connect to backend API
- [ ] Authentication works
- [ ] Core features tested

---

**Congratulations! 🎉 Your CoreSense app should now be running on your iPhone with a production backend!**

# CoreSense Deployment Guide

Complete deployment guide for the CoreSense backend (FastAPI) and mobile app (Expo/React Native).

> Backend is deployed on **Railway**. The mobile app is built with **EAS**. The backend repo at https://github.com/Tosin-A/Coresense-Backend- has files at the **root level** (not under `backend/`).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Backend Deployment](#backend-deployment)
4. [Mobile App Configuration](#mobile-app-configuration)
5. [iOS Build](#ios-build)
6. [Installation on iPhone](#installation-on-iphone)
7. [Verification](#verification)
8. [Continuous Deployment](#continuous-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Cost Breakdown](#cost-breakdown)
11. [Deployment Checklist](#deployment-checklist)

---

## Quick Start

Fastest path: ~30 min (mostly waiting on builds).

```bash
# 1. Backend (Railway)
npm install -g @railway/cli
railway login && cd backend && railway init && railway up

# 2. Mobile env
cd ../coresense
cat > .env <<EOF
EXPO_PUBLIC_API_URL=https://<railway-url>.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_ENV=production
EOF

# 3. iOS build
npm install -g @expo/eas-cli
eas login
eas build --profile development --platform ios

# 4. AirDrop the .ipa to your iPhone, trust the dev cert, launch.
```

Required before starting:
- Supabase service-role key (Settings → API)
- Groq API key
- Expo account
- Apple Developer account (only for physical device install)

---

## Project Structure

```
CoreSense/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Env config
│   ├── Dockerfile              # Railway uses this
│   ├── routers/                # API endpoints
│   ├── services/               # Business logic (Groq, coaching, wellness)
│   ├── database/               # Supabase client
│   └── migrations/             # SQL migrations
├── coresense/                  # Expo React Native app
│   ├── App.tsx
│   ├── app.json                # Expo config
│   ├── eas.json                # EAS build config
│   ├── .env                    # API URL, Supabase keys
│   ├── screens/ components/ stores/ utils/
│   └── ios/                    # Native iOS project
└── DEPLOYMENT.md               # This file
```

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app |
| `backend/routers/app_api.py` | Main API endpoints |
| `coresense/utils/coresenseApi.ts` | Mobile API client |
| `coresense/eas.json` | EAS build settings (Apple Team ID `3RVGPKK5M8`) |
| `coresense/app.json` | Bundle ID `com.coresense.app` |

---

## Backend Deployment

### Option A: Railway (recommended)

Railway auto-deploys on every push to the backend repo's `main` branch.

```bash
npm install -g @railway/cli
railway login
cd backend
railway init                       # pick "create new" or link existing
railway up                         # build + deploy
railway domain                     # get your prod URL
```

#### Environment variables

Set via **Railway Dashboard → Variables** or CLI:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://ngcmutnfqelsqiuitcfw.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service-role key from Supabase → Settings → API (**not** anon!) |
| `GROQ_API_KEY` | your Groq key (starts `gsk_…`) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `PORT` | `8000` |
| `ENVIRONMENT` | `production` |

```bash
# CLI method
railway variables --set SUPABASE_URL=... --set GROQ_API_KEY=... --set GROQ_MODEL=llama-3.3-70b-versatile
railway variables    # verify
```

**How to get the Supabase service-role key:**
1. https://app.supabase.com → project `ngcmutnfqelsqiuitcfw`
2. Settings → API → "Project API keys"
3. Copy the `service_role` key (decoded JWT contains `"role":"service_role"`)
4. Never expose this key in mobile/frontend code.

#### Health check

```bash
curl https://<your-url>.up.railway.app/health
# {"status":"healthy","service":"coresense-backend"}
```

### Option B: Render (free tier, sleeps after 15 min)

Dashboard → New → Web Service → connect GitHub → Environment: Docker → Root: `backend` → set env vars → deploy.

### Option C: Fly.io

```bash
curl -L https://fly.io/install.sh | sh
cd backend && fly auth login && fly launch
fly secrets set SUPABASE_URL=... GROQ_API_KEY=... GROQ_MODEL=llama-3.3-70b-versatile ENVIRONMENT=production
fly deploy
```

### CORS

If you see CORS errors, `backend/main.py` uses:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```
For production hardening, restrict `allow_origins` to known origins.

---

## Mobile App Configuration

Create `coresense/.env`:

```env
EXPO_PUBLIC_API_URL=https://<railway-url>.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_ENV=production
```

`eas.json` already configured:
```json
{
  "cli": { "version": ">= 16.28.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

### Local dev with iOS sim (LAN IP)

To talk to a backend running on your Mac from a physical iPhone on the same Wi-Fi, set `EXPO_PUBLIC_API_URL=http://<mac-LAN-IP>:8000` (e.g. `http://192.168.0.116:8000`) and set `NSAllowsArbitraryLoads=true` in `coresense/ios/CoreSense/Info.plist` to permit HTTP.

---

## iOS Build

```bash
npm install -g @expo/eas-cli
eas login
cd coresense
eas build:configure                                  # one-time
eas device:create                                    # register your iPhone
eas build --profile development --platform ios       # development build
# or
eas build --profile preview --platform ios           # simulator/internal
# or
eas build --profile production --platform ios        # TestFlight/App Store
```

Builds run in the cloud (10–20 min). EAS handles certs and provisioning when linked to your Apple Developer account (Team ID `3RVGPKK5M8`).

---

## Installation on iPhone

**Method A — Direct (development build):**
1. Download `.ipa` from EAS dashboard or email link.
2. AirDrop to iPhone (or email/cloud drive).
3. Tap the `.ipa`. If "Untrusted Developer": Settings → General → VPN & Device Management → Trust your developer.
4. Launch CoreSense.

**Method B — TestFlight (recommended for beta):**
```bash
eas build --profile production --platform ios
eas submit --platform ios
```
Then add testers in App Store Connect.

**Method C — Simulator (no Apple Dev account):**
1. `eas build --profile preview --platform ios` (pick simulator).
2. `tar -xzf <build>.tar.gz`
3. `open -a Simulator` and drag the `.app` onto the simulator.

---

## Verification

```bash
curl https://<your-url>.up.railway.app/health
```

In the app:
- [ ] Auth (Supabase) works
- [ ] Home screen loads data
- [ ] AI coach chat sends/receives via Groq
- [ ] Insights screen renders wellness score
- [ ] No "Couldn't connect to server" errors

---

## Continuous Deployment

- **Railway**: auto-deploys on push to the backend repo's `main` branch.
- **Render**: same, via GitHub integration.
- **Fly.io**: manual `fly deploy`.
- **Mobile app updates**: rebuild with EAS and reinstall, or use Expo OTA updates for JS-only changes.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Couldn't connect to server" | Verify `EXPO_PUBLIC_API_URL`; `curl <url>/health`; check CORS; check Railway logs |
| Build fails (certs) | `eas device:create`; verify Team ID `3RVGPKK5M8`; check EAS build logs |
| App crashes on launch | iOS 13+ required; check Supabase keys; review Xcode Console crash logs |
| Backend not responding | Render free tier sleeps; check service logs; verify env vars |
| Docker build import errors | Use `backend/Dockerfile` from `backend/`, or root `Dockerfile` from root; ensure `PYTHONPATH` correct |
| "Key is not valid" (Supabase) | You probably copied the **anon** key — need **service_role** |

---

## Cost Breakdown

**Free / minimum tier (~$0–5/mo + $99/yr Apple Developer):**
- Backend: Render free (sleeps) or Railway $5 credit
- Mobile builds: EAS free tier
- DB: Supabase free tier
- LLM: Groq pay-per-use (very low)

**Production (~$50/mo + $99/yr):**
- Backend: Railway Pro ($20) or Render Pro ($25)
- DB: Supabase Pro ($25)
- EAS free tier still sufficient

---

## Deployment Checklist

### Backend
- [ ] Railway/Render service deployed
- [ ] `/health` returns 200
- [ ] Env vars set: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `PORT`, `ENVIRONMENT`
- [ ] CORS configured
- [ ] Production URL saved

### Mobile app
- [ ] `coresense/.env` populated with prod URL + Supabase keys
- [ ] EAS CLI installed, `eas login` done
- [ ] Apple Developer linked (for device install)
- [ ] Build succeeded

### Install + smoke test
- [ ] App installed on iPhone, dev cert trusted
- [ ] Auth works, home screen loads
- [ ] Chat with coach works
- [ ] Core features tested

---

## Resources

- Expo: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Railway: https://docs.railway.app
- Supabase: https://supabase.com/docs
- FastAPI: https://fastapi.tiangolo.com
- Groq: https://console.groq.com/docs

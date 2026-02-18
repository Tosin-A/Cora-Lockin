# Quick Start Deployment Guide

## 🚀 Fastest Path to Deployment

### 1. Backend Deployment (Railway - 5 minutes)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway init
railway up

# Set environment variables (in Railway dashboard or via CLI)
railway variables set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_key
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set ENVIRONMENT=production

# Get your URL
railway domain
# Save this URL! (e.g., https://coresense-backend-production.up.railway.app)
```

### 2. Configure Mobile App (2 minutes)

```bash
cd coresense

# Create .env file with your production backend URL
cat > .env << EOF
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_ENV=production
EOF

# Replace your-railway-url with your actual Railway URL!
```

### 3. Build iOS App (15-20 minutes)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for iPhone
cd coresense
eas build --profile development --platform ios
```

### 4. Install on iPhone (5 minutes)

1. Wait for build to complete (check email or EAS dashboard)
2. Download the `.ipa` file
3. AirDrop to iPhone (or email to yourself)
4. On iPhone: Tap `.ipa` → Settings → General → VPN & Device Management → Trust Developer
5. Launch CoreSense app!

---

## ✅ Verify Everything Works

### Test Backend
```bash
curl https://your-railway-url.up.railway.app/health
# Should return: {"status":"healthy","service":"coresense-backend"}
```

### Test Mobile App
- [ ] App opens without crashing
- [ ] Can sign in
- [ ] Home screen loads
- [ ] Chat works
- [ ] No "connection error" messages

---

## 🔧 Troubleshooting

**Backend won't start?**
- Check environment variables in Railway dashboard
- Check logs: `railway logs`

**App can't connect to backend?**
- Verify `EXPO_PUBLIC_API_URL` in `.env` matches your Railway URL
- Check backend is running: `curl https://your-url/health`
- Check CORS in `backend/main.py`

**Build fails?**
- Make sure you're logged in: `eas whoami`
- Check Apple Developer account is linked
- Review build logs in EAS dashboard

---

## 📝 Required Information

Before starting, have these ready:
- [ ] Supabase Service Key (Settings → API → service_role key)
- [ ] OpenAI API Key
- [ ] Expo account email
- [ ] Apple Developer account (for device installation)

---

**Total Time: ~30 minutes** (mostly waiting for builds)

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

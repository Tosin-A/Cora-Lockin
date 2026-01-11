# CoreSense Deployment Summary

## 📁 Project Structure Overview

```
Ironamns/
├── backend/                    # FastAPI Python backend
│   ├── main.py                # Entry point (FastAPI app)
│   ├── Dockerfile             # For building from backend/ directory
│   ├── requirements.txt       # Python dependencies
│   ├── config.py              # Environment configuration
│   ├── routers/               # API endpoints
│   │   ├── app_api.py        # Main app routes (/api/v1/home, /insights, etc.)
│   │   ├── coaching_router.py # AI coach endpoints (/api/v1/coach/*)
│   │   ├── notifications.py   # Notification endpoints
│   │   └── patterns.py        # Pattern recognition endpoints
│   ├── services/              # Business logic
│   ├── database/              # Supabase client and models
│   └── middleware/            # Auth, rate limiting
│
├── coresense/                  # React Native/Expo mobile app
│   ├── app.json               # Expo configuration
│   ├── eas.json               # EAS Build configuration
│   ├── package.json           # Node dependencies
│   ├── .env                   # Environment variables (API URL, Supabase keys)
│   ├── screens/               # App screens (Home, Chat, Health, etc.)
│   ├── components/            # Reusable UI components
│   ├── stores/                # Zustand state management
│   └── utils/
│       └── coresenseApi.ts    # API client (connects to backend)
│
├── Dockerfile                  # Root-level Dockerfile (alternative build)
├── Procfile                   # For Heroku/Render deployment
└── DEPLOYMENT_GUIDE.md        # Detailed deployment instructions
```

---

## 🎯 Key Components

### Backend API (`/backend`)

**Technology Stack:**
- FastAPI (Python web framework)
- Supabase (Database & Auth)
- OpenAI API (AI coaching)
- Uvicorn (ASGI server)

**Main Endpoints:**
- `/health` - Health check
- `/api/v1/home/data` - Home screen data
- `/api/v1/coach/custom-gpt/chat` - AI chat endpoint
- `/api/v1/insights` - Health insights
- `/api/v1/streak` - Streak tracking
- `/api/v1/profile` - User profile
- And many more...

**Environment Variables Needed:**
```env
SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
GPT_MODEL=gpt-4o-mini
PORT=8000
ENVIRONMENT=production
```

### Mobile App (`/coresense`)

**Technology Stack:**
- React Native (Expo)
- TypeScript
- Zustand (State management)
- Supabase Auth
- Expo Application Services (EAS) for builds

**Key Features:**
- Authentication (Email/Password, OAuth)
- AI Coach Chat
- Health Insights
- Streak Tracking
- Notifications
- HealthKit Integration

**Environment Variables Needed:**
```env
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_ENV=production
```

---

## 🚀 Deployment Options

### Backend Hosting

| Platform | Free Tier | Ease of Use | Recommendation |
|----------|-----------|-------------|----------------|
| **Railway** | $5 credit/month | ⭐⭐⭐⭐⭐ | ✅ **Best for beginners** |
| **Render** | Free (sleeps) | ⭐⭐⭐⭐ | ✅ Good for development |
| **Fly.io** | Free tier | ⭐⭐⭐ | ✅ Good performance |
| **Heroku** | Paid only | ⭐⭐⭐ | ❌ Expensive |

**Recommended: Railway** - Easiest setup, auto-deploy from GitHub

### Mobile App Builds

| Method | Cost | Apple Dev Account | Use Case |
|--------|------|-------------------|----------|
| **EAS Build** | Free tier | Required | ✅ **Recommended** |
| **Local Build** | Free | Required | Development only |
| **TestFlight** | Free | Required | Beta testing |

---

## 📋 Quick Deployment Checklist

### Phase 1: Backend (15-20 min)
- [ ] Choose hosting platform (Railway recommended)
- [ ] Create account and project
- [ ] Set environment variables
- [ ] Deploy backend
- [ ] Test health endpoint
- [ ] **Save production URL**

### Phase 2: Mobile App Config (5 min)
- [ ] Create `.env` file in `coresense/`
- [ ] Add production backend URL
- [ ] Add Supabase credentials
- [ ] Verify `eas.json` configuration

### Phase 3: Build iOS App (20-30 min)
- [ ] Install EAS CLI: `npm install -g @expo/eas-cli`
- [ ] Login: `eas login`
- [ ] Link Apple Developer account
- [ ] Build: `eas build --profile development --platform ios`
- [ ] **Wait for build to complete**

### Phase 4: Install on iPhone (5 min)
- [ ] Download `.ipa` file
- [ ] Transfer to iPhone (AirDrop/email)
- [ ] Trust developer certificate
- [ ] Install and launch app
- [ ] **Test connection to backend**

---

## 🔧 Common Issues & Solutions

### Issue: "Couldn't connect to server"
**Solution:**
- ✅ Verify `EXPO_PUBLIC_API_URL` in `.env` matches your backend URL
- ✅ Test backend: `curl https://your-backend-url/health`
- ✅ Check CORS settings in `backend/main.py`

### Issue: Build fails with certificate errors
**Solution:**
- ✅ Ensure Apple Developer account is linked: `eas device:create`
- ✅ Verify Team ID in `eas.json`: `"appleTeamId": "3RVGPKK5M8"`
- ✅ Check EAS build logs for specific errors

### Issue: Backend not responding
**Solution:**
- ✅ Check hosting platform status (Render free tier sleeps after 15 min)
- ✅ Review backend logs in platform dashboard
- ✅ Verify environment variables are set correctly
- ✅ Check if service needs to be woken up

### Issue: Import errors in Docker build
**Solution:**
- ✅ Use root-level `Dockerfile` when building from project root
- ✅ Use `backend/Dockerfile` when building from backend directory
- ✅ Ensure PYTHONPATH is set correctly

---

## 📊 File Locations Reference

| File | Purpose | Location |
|------|---------|----------|
| Backend entry point | FastAPI app | `backend/main.py` |
| API routes | Endpoints | `backend/routers/app_api.py` |
| Mobile API client | Backend connection | `coresense/utils/coresenseApi.ts` |
| Backend Dockerfile | Container config | `backend/Dockerfile` or `Dockerfile` |
| Mobile env config | API URL, keys | `coresense/.env` |
| EAS config | Build settings | `coresense/eas.json` |
| Expo config | App metadata | `coresense/app.json` |

---

## 🔐 Security Notes

⚠️ **Important:**
- Never commit `.env` files to git
- Use service role key for backend (not anon key)
- Keep `EXPO_PUBLIC_` prefix only for client-accessible variables
- Use environment variables in hosting platform (not hardcoded)
- Enable CORS restrictions in production

---

## 📚 Documentation Files

- **`DEPLOYMENT_GUIDE.md`** - Complete step-by-step guide
- **`QUICK_START_DEPLOYMENT.md`** - Fast deployment instructions
- **`MOBILE_DEPLOYMENT_PLAN.md`** - Mobile-specific deployment plan
- **`docs/PRODUCTION_ENVIRONMENT_SETUP.md`** - Environment configuration
- **`backend/README.md`** - Backend setup and API docs
- **`coresense/README.md`** - Mobile app setup

---

## 🎓 Next Steps After Deployment

1. **Monitor & Optimize**
   - Set up error tracking (Sentry)
   - Monitor API response times
   - Optimize database queries

2. **Add Features**
   - Push notifications
   - Analytics
   - A/B testing

3. **Scale**
   - Upgrade hosting plan
   - Add CDN
   - Implement caching

4. **App Store Submission**
   ```bash
   eas build --profile production --platform ios
   eas submit --platform ios
   ```

---

## 💰 Estimated Costs

**Minimum Setup (Free Tier):**
- Backend: Render (Free, sleeps when inactive) OR Railway ($5/month)
- Mobile Builds: EAS Free tier
- Database: Supabase Free tier
- **Total: $0-5/month** (+ $99/year for Apple Developer)

**Recommended Production Setup:**
- Backend: Railway Pro ($20/month) OR Render Pro ($25/month)
- Mobile Builds: EAS Free tier (sufficient)
- Database: Supabase Pro ($25/month)
- **Total: ~$50/month** (+ $99/year for Apple Developer)

---

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Backend responds to `/health` endpoint
- ✅ Mobile app installs on iPhone without errors
- ✅ App can authenticate with Supabase
- ✅ Home screen loads with data
- ✅ Chat with AI coach works
- ✅ No "connection error" messages
- ✅ All API endpoints respond correctly

---

**Need help?** Refer to `DEPLOYMENT_GUIDE.md` for detailed instructions!

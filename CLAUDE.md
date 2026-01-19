# CoreSense

AI-powered personal coaching platform with React Native mobile app and FastAPI backend.

## Tech Stack

**Backend (Python)**
- FastAPI + Uvicorn server
- Supabase (PostgreSQL + Auth)
- OpenAI API for coaching
- Pydantic for validation

**Mobile (TypeScript)**
- React Native + Expo (SDK 54)
- Zustand for state management
- React Navigation (bottom tabs + stack)
- HealthKit integration via react-native-health

## Project Structure

```
/
├── backend/               # FastAPI Python backend
│   ├── routers/           # API endpoints by feature
│   ├── services/          # Business logic layer
│   ├── database/          # Supabase client & models
│   ├── middleware/        # Auth & rate limiting
│   ├── migrations/        # SQL migration scripts
│   └── utils/             # Shared utilities
├── coresense/             # React Native mobile app
│   ├── screens/           # Full-page screens
│   ├── components/        # Reusable UI components
│   ├── stores/            # Zustand state stores
│   ├── utils/             # API clients & helpers
│   ├── navigation/        # App routing
│   ├── constants/         # Theme & config
│   └── types/             # TypeScript definitions
├── docs/                  # Architecture documentation
└── plans/                 # Implementation plans
```

## Build & Run Commands

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py                              # Dev server (port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 # Production
```

API docs available at `http://localhost:8000/docs`

### Mobile App

```bash
cd coresense
npm install
npx expo start          # Dev server
npx expo run:ios        # iOS simulator
npx expo run:android    # Android emulator
eas build --platform ios/android  # Production builds
```

## Environment Variables

**Backend** (`.env` in `/backend/`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`, `GPT_MODEL`
- `PORT`, `ENVIRONMENT`

**Mobile** (`.env` in `/coresense/`):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_SERVICE_KEY`
- `EXPO_PUBLIC_API_URL`

## Key Entry Points

| Area | File | Purpose |
|------|------|---------|
| Backend | `backend/main.py:1` | FastAPI app initialization |
| Backend | `backend/config.py:1` | Environment configuration |
| Backend | `backend/routers/app_api.py:1` | Main API endpoints |
| Mobile | `coresense/App.tsx:1` | App entry point |
| Mobile | `coresense/navigation/AppNavigator.tsx:1` | Navigation setup |
| Mobile | `coresense/utils/coresenseApi.ts:1` | API client |

## API Structure

All endpoints prefixed with `/api/v1`:
- `/home/data` - Home screen aggregate data
- `/insights` - Wellness insights
- `/coach/chat` - AI coaching messages
- `/profile`, `/preferences` - User settings
- `/wellness/*` - Health analytics
- `/health` - Server health check

## Database

Supabase PostgreSQL with migrations in `backend/migrations/`. Key tables:
- `users`, `user_preferences` - User data
- `messages` - Coaching conversations
- `health_metrics` - Health data
- `insights`, `patterns` - Analytics data

## Additional Documentation

Check these files for specialized topics:

| Topic | File |
|-------|------|
| Architectural patterns | `.claude/docs/architectural_patterns.md` |
| Deployment guide | `DEPLOYMENT_GUIDE.md` |
| Mobile deployment | `MOBILE_DEPLOYMENT_PLAN.md` |
| Backend setup | `backend/README.md` |
| Wellness features | `WELLNESS_INSIGHTS_SETUP.md` |
| API architecture | `docs/` directory |

## Quick Reference

- **Auth**: JWT via `get_current_user_id` dependency (`backend/middleware/auth_helper.py`)
- **State stores**: One per feature in `coresense/stores/`
- **API responses**: Always `{ data: T | null, error: string | null }`
- **Custom exceptions**: Defined in `backend/utils/exceptions.py`
- **Theme colors**: `coresense/constants/theme.ts`

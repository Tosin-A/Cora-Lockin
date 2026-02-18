# CoreSense

AI-powered personal coaching platform with React Native mobile app and FastAPI backend.

**Repository**: https://github.com/Tosin-A/Coresense-Backend-

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

**Note:** The backend server is running on Railway. There is no need to start it locally.

**Important:** When making changes to the `backend/` folder, push to https://github.com/Tosin-A/Coresense-Backend-. Do not use the Cora-Lockin repo. Note: The backend repo has files at root level (not in a `backend/` subfolder).

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

When building or modifying UI components in the React Native app, follow these principles strictly:
Avoid AI-generated aesthetic clichés:

No glowing effects, neon accents, or shadowColor with high opacity/radius for decorative purposes. Use shadows only for subtle elevation (e.g., shadowOpacity: 0.06–0.1, shadowRadius: 2–6).
No gratuitous gradients. If a gradient is used, it should be subtle (e.g., two close shades) and purposeful, not decorative.
No rounded-rectangle cards with thick colored borders. Prefer borderless cards with light shadows or a single borderColor at very low opacity (rgba(0,0,0,0.06)).
No excessive border radius (avoid borderRadius: 20+ on non-pill elements). Use 8–12 for cards, 6–8 for inputs.
No purple/cyan/neon color palettes unless explicitly in the brand theme.
No decorative icons next to every label. Use icons sparingly and only when they aid comprehension.

Follow these instead:

Whitespace over decoration. Use generous padding and margin to create hierarchy, not borders and dividers.
Typography-driven hierarchy. Differentiate sections with font weight (500/600/700) and size, not color or decoration. Limit yourself to 3 font sizes per screen.
Muted, intentional color. Use 1 primary action color, 1 neutral text scale (3–4 shades of gray), and 1 subtle background tint. Accent colors should appear only on interactive elements.
Real-world spacing rhythm. Pick a base unit (8px) and stick to multiples: 8, 16, 24, 32, 48. No arbitrary values like 13 or 37.
Flat over skeuomorphic. Prefer flat backgrounds with subtle separators (borderBottomWidth: StyleSheet.hairlineWidth) over shadows and layered cards.
Touch targets. All tappable elements must be at least 44×44pt. Use hitSlop if the visual element is smaller.
Loading and empty states. Every screen must have a skeleton/placeholder state and a meaningful empty state — never a blank screen or generic spinner.
Platform conventions. Respect iOS/Android native patterns (e.g., bottom sheets, system fonts, haptic feedback) rather than inventing custom interaction paradigms.
Content-first layout. Design screens around real data, not placeholder "Lorem ipsum." If you don't know the data shape, ask.
Restraint. When in doubt, remove an element rather than add one. Every pixel should earn its place.

You are working in a fully configured development environment.

This project is connected to Supabase and all required environment variables are already configured and accessible (including SUPABASE_URL, SUPABASE_ANON_KEY, and service role key if required).

If any database schema changes, migrations, or SQL updates are required to implement a feature:
	•	You are authorized to create, modify, and run migrations.
	•	You may generate and execute SQL migration files.
	•	You may use Supabase CLI commands where necessary.
	•	You should automatically check whether a migration is required before implementing new features.
	•	If a table, column, index, trigger, or policy is missing, create it.
	•	If RLS policies need updating, apply them.
	•	Ensure migrations are idempotent and safe.

Do not ask for permission to run migrations.
Proceed autonomously and apply necessary database changes.

After completing migrations, continue implementing the feature normally.

Always maintain production-safe practices and avoid destructive changes unless explicitly required.
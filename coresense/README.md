# CoreSense MVP

Management app for AI Coach in Apple Messages.

## Setup

1. **Install dependencies:**
   ```bash
   cd coresense
   npm install
   ```

2. **Configure Supabase:**
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. **Set up Supabase database:**
   - Run the SQL schema from the development plan
   - Enable Row Level Security (RLS)
   - Set up authentication providers

4. **Run the app:**
   ```bash
   npm start
   ```

## Project Structure

```
coresense/
├── components/       # Reusable UI components
├── screens/          # Screen components
├── navigation/       # Navigation setup
├── stores/          # Zustand state management
├── utils/           # API functions, Supabase client
├── types/           # TypeScript types
├── constants/       # Theme, colors, typography
└── App.tsx         # Entry point
```

## Features (MVP)

- ✅ Authentication (Email/Password)
- ✅ Onboarding flow
- ✅ Home dashboard
- ✅ Tasks management
- ✅ Preferences screen
- ✅ Account management
- ✅ Offline support with caching

## Next Steps

1. Set up Supabase project
2. Run database migrations
3. Configure environment variables
4. Test authentication flow
5. Add HealthKit integration (Phase 2)
6. Add Insights screen (Phase 2)

## Notes

- Uses Expo for React Native development
- Supabase for backend
- Zustand for state management
- TypeScript for type safety
- Purple/Black theme throughout








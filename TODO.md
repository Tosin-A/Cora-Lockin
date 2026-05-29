# CoreSense — Consolidated TODO

Merged from `TODO.md`, `TODO_CHAT_FIX.md`, `TODO_IOS_CONNECTIVITY_FIX.md`, `DEPLOYMENT_TODO.md`, and `REFACTORING_TODO.md`.

---

## Completed work (kept for historical context)

### Chat message direction fix
- [x] Backend `coaching_router.py` returns `sender_type` (mapped from `direction`): `outbound → user`, `inbound → gpt`
- [x] Removed timestamp display from `coresense/components/ChatMessage.tsx`

### iOS backend connectivity fix
- [x] `EXPO_PUBLIC_API_URL=http://192.168.0.116:8000` in `coresense/.env` (Mac LAN IP for physical iPhone testing)
- [x] `NSAllowsArbitraryLoads=true` in `coresense/ios/CoreSense/Info.plist` (ATS bypass for HTTP dev)
- [x] Updated localhost → LAN IP fallbacks in:
  - `coresense/utils/coresenseApi.ts`
  - `coresense/stores/authStore.ts`
  - `coresense/stores/goalsStore.ts`
  - `coresense/stores/wellnessStore.ts`
  - `coresense/screens/PreferencesScreen.tsx`
  - `coresense/screens/HealthLogScreen.tsx`
- [x] Backend verified via `curl http://192.168.0.116:8000/health`

### LLM provider migration
- [x] Migrated backend from OpenAI Responses/Conversations API to Groq Chat Completions (`llama-3.3-70b-versatile`)
- [x] Updated `backend/config.py`, `conversation_management.py`, `model_router.py`, `start_server.py`, requirements
- [x] Pushed to `Coresense-Backend-` and local `Cora-Lockin` repos

---

## Phase 1 — Backend deployment

- [ ] Set Groq env vars on Railway: `GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile`
- [ ] Remove `OPENAI_API_KEY` / `OPENAI_ASSISTANT_ID` from Railway
- [ ] Verify `/health` and `/api/v1/coach/chat` after redeploy
- [ ] Confirm production API URL saved for mobile config

---

## Phase 2 — Mobile app configuration

- [ ] `coresense/.env` updated with production `EXPO_PUBLIC_API_URL`
- [ ] EAS build configuration verified (`eas.json`, Team ID `3RVGPKK5M8`, bundle `com.coresense.app`)
- [ ] iOS app builds and connects to production backend

---

## Phase 3 — App Store / TestFlight

- [ ] Build production IPA: `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios`
- [ ] Add testers in App Store Connect

---

## Refactoring backlog

> Note: items below reference an older codebase layout (`ai_coach.py`, `openai_coach.py`, `openai_coach_service.py`). The current code has already consolidated under `routers/coaching_router.py` + `services/coaching_service.py` + `services/conversation_management.py`. Review before acting.

### Router cleanup
- [ ] Verify only `coaching_router.py` is used; delete any leftover `ai_coach.py`, `openai_coach.py`, `openai_coach_service.py` references
- [ ] Confirm `main.py` imports the consolidated router only

### Documentation cleanup
- [ ] Delete old milestone docs in `backend/` (anything matching `*_COMPLETE.md`, `*_RESOLVED*.md`, `BACKEND_SETUP_COMPLETE.md`, etc.) — leave only active docs (`README.md`, `SETUP.md`, `OPTIMIZED_ARCHITECTURE.md`, `MIGRATION_GUIDE.md`)
- [ ] Move stray top-level `.md` plans to `docs/` or `plans/`
- [ ] Update root `README.md` to reflect Groq migration

### Legacy script cleanup
- [ ] Delete root-level legacy scripts if present: `messages_bot.py`, `whatsapp_bot.py`, `test_coach.py`, `runchat.py`, `Clean.py`, `therunfile.py`, `martin.txt`
- [ ] Delete duplicate SQL files (keep only the active schema under `backend/migrations/`)

### Service organization (optional)
- [ ] Group coach services into `backend/services/coach/` subpackage (coach_service, assistant_service, context_service, gpt_service)
- [ ] Group insights services into `backend/services/insights/`
- [ ] Group limits into `backend/services/limits/`

### Risk levels
| Phase | Risk | Mitigation |
|---|---|---|
| Router cleanup | Medium | Backup before deletion, test endpoints |
| Doc cleanup | Low | Files clearly old |
| Service regrouping | Medium | Careful import-path updates, run tests after |

---

## Open feature work

### iOS connectivity
- [ ] Verify iOS app loads home-screen data over LAN IP path (last item from connectivity fix)

### Wellness insights (see `WELLNESS_INSIGHTS.md`)
- [ ] Add `HealthLogScreen` to navigation stack
- [ ] Add monthly summary view
- [ ] Add goal-progress charts
- [ ] Optional: Google Fit / Fitbit integration
- [ ] Optional: push notifications for insights

---

## Quick reference

- Backend repo (root-level files): https://github.com/Tosin-A/Coresense-Backend-
- Umbrella repo: https://github.com/Tosin-A/Cora-Lockin
- Apple Team ID: `3RVGPKK5M8`
- Bundle ID: `com.coresense.app`
- Supabase project: `ngcmutnfqelsqiuitcfw`

# Ironamns Codebase Refactoring Plan

## Overview

Refactor the Ironamns codebase for better maintainability through cleanup, modularization, and improved readability.

## Progress Tracking

Last Updated: 2025-01-24

---

## PHASE 1: CRITICAL - Router Consolidation (HIGH PRIORITY)

### 1.1 Merge ai_coach.py and openai_coach.py

**Status:** IDENTIFIED - NOT STARTED

**Problem:** Both files have significant overlapping functionality:

| Feature                    | ai_coach.py | openai_coach.py |
| -------------------------- | ----------- | --------------- |
| `/chat` endpoint           | ✅          | ✅              |
| `/status` endpoint         | ✅          | ✅              |
| `/context` endpoint        | ✅          | ✅              |
| `/history` endpoint        | ❌          | ✅              |
| Custom GPT endpoints       | ✅          | ✅              |
| Assistant-Native endpoints | ❌          | ✅              |
| Message limit endpoints    | ❌          | ✅              |
| Signature phrases          | ✅          | ❌              |
| Pattern analysis           | ✅          | ❌              |

**File Sizes:**

- `ai_coach.py`: ~350 lines
- `openai_coach.py`: ~900 lines (more complete)

**Unique features in openai_coach.py:**

- Assistant-Native chat endpoints (`/assistant-native/chat`)
- Thread management endpoints (`/assistant-native/thread`)
- Message limit API endpoints (`/usage/{user_id}`, `/upgrade/{user_id}`)
- Conversation storage with proper schema

**Unique features in ai_coach.py:**

- Signature phrases endpoint (`/signature-phrases/{category}`)
- Pattern analysis endpoint (`/analyze-pattern`)

**Action:**

- [ ] Merge both files into `backend/routers/coach.py`
- [ ] Keep best implementations from each
- [ ] Add unique features (signature phrases, pattern analysis) from ai_coach.py
- [ ] Delete `backend/routers/openai_coach.py`
- [ ] Keep `backend/routers/ai_coach.py` renamed to `coach.py`
- [ ] Update `backend/main.py` imports

---

## PHASE 2: SERVICE CLEANUP (MEDIUM PRIORITY)

### 2.1 Memory Services - KEEP AS IS

**Status:** VERIFIED - NO ACTION NEEDED

Files are sequential pipeline stages (not duplication):

- `memory_service.py` - Main memory storage/retrieval
- `memory_extractor.py` - Extract commitments, wins, mood signals
- `memory_summarizer.py` - Summarize conversation periods

**Conclusion:** Keep separate for better maintainability.

### 2.2 Coach Services - KEEP AS IS

Files are complementary:

- `coach_responder.py` - Orchestrates response generation
- `enhanced_coach_prompts.py` - Prompt templates
- `custom_gpt_service.py` - Custom GPT integration
- `thread_management.py` - Thread management

**Conclusion:** Keep separate.

### 2.3 Insights Services - KEEP AS IS

Files are complementary:

- `health_insights_service.py` - Health data analysis
- `pattern_recognition.py` - Behavior pattern detection

**Conclusion:** Keep separate.

### 2.4 Missing Service - CREATE

**Status:** IDENTIFIED - ACTION NEEDED

`backend/routers/openai_coach.py` imports:

```python
from backend.services.openai_coach_service import openai_coach_service
```

**Problem:** `openai_coach_service.py` doesn't exist!

**Action:**

- [ ] Create `backend/services/openai_coach_service.py` with the service class
- [ ] Or remove the import if functionality is elsewhere

---

## PHASE 3: DOCUMENTATION CONSOLIDATION

### 3.1 Root-level .md files to review

- [ ] `README.md` - Update with current structure
- [ ] `DOCKER.md` - Move to docs/ or delete
- [ ] `REFACTORING_TODO.md` - This plan, can be archived when complete

### 3.2 plans/ directory cleanup

- [ ] Move `plans/ios_app_store_deployment_plan.md` to docs/
- [ ] Keep `plans/MESSAGE_LIMIT_SYSTEM_PLAN.md` (reference)
- [ ] Keep `plans/GOOGLE_SIGNIN_PLAN.md` (reference)

### 3.3 docs/ directory - Keep as is

- `docs/PRODUCTION_ENVIRONMENT_SETUP.md`
- `docs/OAUTH_PRODUCTION_SETUP_GUIDE.md`
- `docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
- `docs/APP_STORE_ASSETS_CHECKLIST.md`

---

## PHASE 4: BACKEND ROOT CLEANUP

### 4.1 Files to DELETE

- `backend/__init__.py` - Empty file
- `backend/OPENAI_ASSISTANT_IMPLE` - One-time implementation note
- `backend/PERSONALIZED_COACH_IMPLEMENTATION_COMPLETE.md` - Old milestone doc
- `backend/PERSONALIZED_COACH_INTEGRATION_PLAN.md` - Old plan doc
- `backend/ARCHITECTURAL_RESTUCTURE_BLUEPRINT.md` - Old blueprint
- `backend/DATABASE_SCHEMA_AND_FUNCTIONS.md` - Old schema doc
- `backend/DATABASE_ISSUES_COMPLETELY_RESOLVED.md` - Old issue doc
- `backend/CUSTOM_GPT_ARCHITECTURE_COMPLETE.md` - Old milestone doc
- `backend/BACKEND_SETUP_COMPLETE.md` - Old milestone doc
- `backend/BACKEND_ISSUES_RESOLVED_COMPLETE.md` - Old issue doc
- `backend/PERSONALIZED_COACH_INTEGRATION_PLAN.md` - Duplicate plan
- `backend/DATA_FLOW_QUICK_REFERENCE.md` - Reference doc (keep?)
- `backend/MESSAGES_SCHEMA_UPDATE_COMPLETE.md` - Old milestone doc
- `backend/HEALTH_DATA_INSIGHTS_COMPLETE.md` - Old milestone doc
- `backend/ASSISTANT_NATIVE_IMPLEMENTATION_COMPLETE.md` - Old milestone doc
- `backend/DATABASE_SCHEMA_MISMATCH_FIX_COMPLETE.md` - Old issue doc
- `backend/COMPLETE_DATABASE_FIX_SUMMARY.md` - Old issue doc
- `backend/FINAL_MESSAGES_SCHEMA.sql` - Keep (active schema)
- `backend/MESSAGE_LIMIT_SCHEMA.sql` - Keep (active schema)
- `backend/custom_gpt_database_schema.sql` - Keep (active schema)
- `backend/DATABASE_SCHEMA_COMPLETE.sql` - Keep (active schema)

### 4.2 Files to KEEP

- `backend/main.py` - Entry point
- `backend/config.py` - Configuration
- `backend/requirements.txt` - Python dependencies
- `backend/Dockerfile` - Docker config
- `backend/.dockerignore`
- `backend/start_server.py`
- `backend/start.sh`
- `backend/stop_server.sh`

---

## PHASE 5: CORESENSE CLEANUP (LOW PRIORITY)

### 5.1 Root-level .txt files to DELETE

- `martin.txt` - Old reference
- `therunfile.py` - Old reference
- `Clean.py` - Old reference
- `messages_bot.py` - Old bot reference
- `runchat.py` - Old runner
- `runchat.py` - Duplicate?

### 5.2 coresense/ directory - Keep as is

All coresense files appear active and needed.

---

## TARGET DIRECTORY STRUCTURE

```
ironamns/
├── README.md                          # Main documentation
├── TODO.md                            # This file
├── requirements.txt                   # Root requirements (if needed)
├── docs/
│   ├── PRODUCTION_ENVIRONMENT_SETUP.md
│   ├── OAUTH_PRODUCTION_SETUP_GUIDE.md
│   ├── GOOGLE_OAUTH_SETUP_GUIDE.md
│   ├── APP_STORE_ASSETS_CHECKLIST.md
│   └── ios_app_store_deployment_plan.md
├── backend/
│   ├── main.py                        # Entry point
│   ├── config.py                      # Configuration
│   ├── requirements.txt               # Python dependencies
│   ├── Dockerfile                     # Docker config
│   ├── .dockerignore
│   ├── database/
│   │   ├── supabase_client.py
│   │   └── models.py
│   ├── middleware/
│   │   ├── auth_helper.py
│   │   └── rate_limit_middleware.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── coach.py                   # Unified coach endpoints (MERGED)
│   │   ├── messages.py
│   │   ├── insights.py
│   │   ├── notifications.py
│   │   ├── patterns.py
│   │   └── app_api.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── coach_service.py           # (CREATE if needed)
│   │   ├── custom_gpt_service.py
│   │   ├── thread_management.py
│   │   ├── context_injector.py
│   │   ├── message_limit_service.py
│   │   ├── health_insights_service.py
│   │   ├── pattern_recognition.py
│   │   ├── memory_service.py
│   │   ├── memory_extractor.py
│   │   ├── memory_summarizer.py
│   │   ├── enhanced_coach_prompts.py
│   │   ├── coach_responder.py
│   │   ├── notification_service.py
│   │   ├── model_router.py
│   │   └── user_initialization_service.py
│   └── utils/
│       ├── exceptions.py
│       └── supabase_utils.py
├── coresense/                         # Expo React Native app
│   ├── App.tsx
│   ├── package.json
│   ├── screens/
│   ├── components/
│   ├── stores/
│   ├── navigation/
│   ├── utils/
│   └── constants/
└── plans/
    ├── MESSAGE_LIMIT_SYSTEM_PLAN.md
    └── GOOGLE_SIGNIN_PLAN.md
```

---

## EXECUTION ORDER

1. **Phase 1:** Create unified `coach.py` router (merge ai_coach + openai_coach)
2. **Phase 2:** Create missing `openai_coach_service.py`
3. **Phase 3:** Delete old milestone/plan .md files
4. **Phase 4:** Delete empty `__init__.py` and one-time scripts
5. **Phase 5:** Update imports in `main.py`
6. **Phase 6:** Test backend after changes

---

## RISK ASSESSMENT

| Phase                      | Risk Level | Mitigation                               |
| -------------------------- | ---------- | ---------------------------------------- |
| Phase 1 (Router Merge)     | Medium     | Backup files, test endpoints after merge |
| Phase 2 (Create Service)   | Low        | Follow existing service patterns         |
| Phase 3 (Delete .md files) | Low        | Files are clearly old/milestone docs     |
| Phase 4 (Delete scripts)   | Low        | One-time scripts not in active use       |
| Phase 5 (Update imports)   | Medium     | Careful import path updates              |

---

## ESTIMATED TIME

- Phase 1: 30 minutes (router merge)
- Phase 2: 10 minutes (create missing service)
- Phase 3: 15 minutes (delete old docs)
- Phase 4: 10 minutes (delete scripts)
- Phase 5: 15 minutes (update imports)
- Phase 6: 30 minutes (testing)

**Total: ~2 hours**

---

## QUICK START

### Step 1: Backup current router files

```bash
cp backend/routers/ai_coach.py backend/routers/ai_coach.py.backup
cp backend/routers/openai_coach.py backend/routers/openai_coach.py.backup
```

### Step 2: Create unified coach.py

Merge best of both files into `backend/routers/coach.py`

### Step 3: Test endpoints

```bash
cd backend && python main.py
# Test:
# - GET /api/ai-coach/status
# - POST /api/v1/coach/chat
# - GET /api/v1/coach/status/{user_id}
```

### Step 4: Delete backups after verification

```bash
rm backend/routers/ai_coach.py.backup
rm backend/routers/openai_coach.py.backup
rm backend/routers/openai_coach.py  # After merge verified
```

---

## NOTES

- All deletions should be committed with clear commit messages
- Create backups before major changes
- Test after each phase to ensure functionality
- Keep database schema files as single source of truth
- Update imports in `main.py` after router consolidation

---

## COMPLETED ITEMS

- [x] Analyzed codebase structure
- [x] Identified router overlap (ai_coach.py vs openai_coach.py)
- [x] Verified memory services are sequential pipeline (not duplication)
- [x] Verified coach services are complementary
- [x] Identified missing `openai_coach_service.py`
- [x] Created this TODO.md with accurate findings

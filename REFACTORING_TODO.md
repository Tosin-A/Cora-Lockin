# Codebase Refactoring Plan

## Overview
Refactor the Ironamns codebase for better maintainability through cleanup, modularization, and improved readability.

## Progress Tracking

### Phase 1: Remove Redundant Legacy Files
- [ ] Remove root-level legacy bot scripts (`messages_bot.py`, `whatsapp_bot.py`, `test_coach.py`, `runchat.py`, `Clean.py`, `therunfile.py`)
- [ ] Remove duplicate SQL schema files (keep only `DATABASE_SCHEMA_COMPLETE.sql`)
- [ ] Remove old WhatsApp training files (`training/` folder)
- [ ] Remove duplicate config/setup scripts in root

### Phase 2: Consolidate Documentation
- [ ] Merge deployment documentation
- [ ] Remove historical artifact files (`*_COMPLETE.md`, `*_FIXES.md`, `*_ISSUES_*.md`)
- [ ] Keep only essential documentation
- [ ] Update `README.md` with new project overview

### Phase 3: Consolidate Backend Services
- [ ] Consolidate memory services (`memory_service.py`, `memory_extractor.py`, `memory_summarizer.py`, `memory_cleanup.py`)
- [ ] Consolidate insights services (`health_insights_service.py`, `insights_service.py`)
- [ ] Consolidate coach services - keep one coherent coach architecture
- [ ] Merge overlapping router endpoints

### Phase 4: Rename/Move Files for Clarity
- [ ] Rename `backend/services/coach_responder.py` → `coach/response_builder.py`
- [ ] Rename `backend/services/failure_handler.py` → `coach/failure_handler.py`
- [ ] Create clear `__init__.py` exports for each service module
- [ ] Update imports across the codebase

## Target Structure

```
ironamns/
├── README.md                          # Main documentation
├── docs/
│   ├── PRODUCTION_ENVIRONMENT_SETUP.md
│   ├── GOOGLE_OAUTH_SETUP_GUIDE.md
│   └── APP_STORE_ASSETS_CHECKLIST.md
├── backend/
│   ├── main.py                        # Entry point
│   ├── config.py                      # Configuration
│   ├── requirements.txt
│   ├── database/
│   │   ├── __init__.py
│   │   ├── supabase_client.py
│   │   └── models.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth_helper.py
│   │   └── rate_limit_middleware.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── coach.py                   # Unified coach endpoints
│   │   ├── messages.py
│   │   ├── insights.py                # Unified insights endpoints
│   │   ├── notifications.py
│   │   └── app_api.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── coach/
│   │   │   ├── __init__.py
│   │   │   ├── coach_service.py       # Main coach logic
│   │   │   ├── assistant_service.py   # Thread management
│   │   │   ├── context_service.py     # Memory & context
│   │   │   └── gpt_service.py         # Custom GPT
│   │   ├── insights/
│   │   │   ├── __init__.py
│   │   │   ├── insights_service.py    # Unified insights
│   │   │   └── patterns.py            # Pattern recognition
│   │   ├── limits/
│   │   │   ├── __init__.py
│   │   │   ├── message_limit.py
│   │   │   └── rate_limit.py
│   │   ├── notifications.py
│   │   └── user_initialization.py
│   └── utils/
│       ├── __init__.py
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
├── data/
├── docker-compose.yml
└── Dockerfile
```

## Notes
- All changes should be committed with clear commit messages
- Create backup before major deletions
- Test after each phase to ensure functionality


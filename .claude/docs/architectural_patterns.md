# Architectural Patterns

Design decisions and conventions used throughout the CoreSense codebase.

## Backend Patterns

### Router Organization

Each feature has a dedicated router with consistent structure:

- Routers in `backend/routers/` with naming: `{feature}_router.py`
- Included in `main.py` with `/api/v1` prefix
- Tags for Swagger documentation grouping

**Examples**: `coaching_router.py:1`, `wellness_router.py:1`, `app_api.py:1`

### Dependency Injection

Protected routes use FastAPI's `Depends()` for authentication:

```python
@router.get("/endpoint")
async def endpoint(user_id: str = Depends(get_current_user_id)):
```

**Reference**: `backend/middleware/auth_helper.py:get_current_user_id`

### Service Layer

Business logic isolated in service classes with:
- Enum-based response types (e.g., `CoachingResponseType`)
- Dataclass context objects (e.g., `CoachingContext`, `CoachingResponse`)
- Service composition (services depend on other services)

**Examples**: `backend/services/coaching_service.py`, `backend/services/wellness_analytics_service.py`

### Database Access Pattern

Supabase client singleton with fluent query API:

```python
get_supabase_client().table('table_name')
    .select('*')
    .eq('field', value)
    .execute()
```

- Singleton: `backend/database/supabase_client.py:get_supabase_client`
- Upsert pattern for preferences/settings updates

### Custom Exception Hierarchy

All exceptions inherit from `CoreSenseException`:
- `DatabaseError`, `AuthenticationError`, `ValidationError`, `NotFoundError`
- Each maps to appropriate HTTP status code
- Original errors logged for debugging

**Reference**: `backend/utils/exceptions.py`

### Graceful Degradation

Endpoints return default values on non-critical failures:

```python
except Exception as e:
    logger.warning(f"Could not fetch: {e}")
    return {"data": None}  # Fallback instead of 500
```

**Seen in**: `app_api.py`, `wellness_router.py`, `coaching_router.py`

## Frontend Patterns

### State Management (Zustand)

One store per feature with consistent structure:

```typescript
export const useFeatureStore = create<StoreInterface>((set, get) => ({
    // State fields
    field: initialValue,

    // Actions
    action: async () => {
        set({ field: newValue });
    }
}));
```

**Stores**: `authStore.ts`, `chatStore.ts`, `healthStore.ts`, `userStore.ts`, `wellnessStore.ts`, `goalsStore.ts`

### Cross-Store Communication

Stores access each other via `getState()`:

```typescript
const { userId } = useAuthStore.getState();
```

No circular dependencies - unidirectional data flow.

### Optimistic Updates

Chat messages use three-phase reconciliation (`coresense/stores/chatStore.ts`):

1. Create temp message with `client_temp_id`, `isOptimistic: true`
2. Poll `/history` for server confirmation
3. Replace temp with real DB data once confirmed

### API Client Pattern

Typed API client in `coresense/utils/coresenseApi.ts`:

- Helper function `apiRequest<T>()` handles auth, timeout, errors
- Every endpoint returns: `{ data: T | null, error: string | null }`
- Exported object organizes functions by feature

```typescript
export const coresenseApi = {
    getHomeData,
    getInsights,
    sendChatMessage,
};
```

### Component Organization

```
components/     # Reusable UI (Card, Button, etc.)
screens/        # Full-page views
```

- Naming: `{Feature}Screen.tsx`, `{ComponentName}.tsx`
- Barrel export: `components/index.ts`

### Navigation Structure

Stack + Tab navigator composition (`coresense/navigation/AppNavigator.tsx`):
- 4-tab bottom navigation
- Stack navigators for detail screens
- Type-safe route names

## Common Conventions

### File Naming

| Layer | Pattern | Example |
|-------|---------|---------|
| Router | `{feature}_router.py` | `coaching_router.py` |
| Service | `{feature}_service.py` | `wellness_analytics_service.py` |
| Screen | `{Feature}Screen.tsx` | `HomeScreen.tsx` |
| Store | `{feature}Store.ts` | `chatStore.ts` |

### Import Order

1. Framework imports (React, FastAPI)
2. Third-party libraries
3. Local imports (stores, components, utils)
4. Type imports

### Logging

Backend uses module-level logger:

```python
logger = logging.getLogger(__name__)
logger.info(f"Context: {variable}")
logger.error(f"Error: {e}", exc_info=True)
```

Frontend uses prefixed console logs:

```typescript
console.log("[ComponentName]", message);
```

### Section Comments

Large files use ASCII dividers for organization:

```python
# ============================================
# SECTION NAME
# ============================================
```

### Pydantic Models

Request/response models defined at top of router files:
- Separate request vs response models
- Optional fields for partial updates

**Example**: `backend/routers/app_api.py:ProfileUpdateRequest`

## Design Principles

1. **Feature-based organization** - Routers, services, stores organized by feature
2. **Type safety** - Pydantic (backend) + TypeScript (frontend)
3. **Single responsibility** - Each file has one clear purpose
4. **Graceful degradation** - Return defaults over crashing
5. **Dependency injection** - Auth and services injected via framework
6. **Optimistic UI** - Immediate feedback, reconcile with server

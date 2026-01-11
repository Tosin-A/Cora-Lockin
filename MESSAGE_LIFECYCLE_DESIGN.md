# Message Lifecycle Design - Duplicate Elimination

## 1. High-Level Architecture

The message system follows a **single source of truth** approach:

- **Backend (Supabase)** is the authoritative source for persisted messages
- **Frontend** maintains only ephemeral "pending" state for optimistic UI
- **Reconciliation** replaces temp messages with DB messages immediately after sending

```
┌─────────────────────────────────────────────────────────────────┐
│                        MESSAGE LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. USER TYPES MESSAGE                                          │
│     ┌─────────────────┐                                         │
│     │ Temp Message    │ ← Generated client-side                 │
│     │ ID: temp-xxx    │   (pending confirmation)                │
│     │ Status: sending │                                         │
│     └────────┬────────┘                                         │
│              │                                                  │
│              ▼                                                  │
│  2. API SEND (POST /chat)                                       │
│     ┌─────────────────┐                                         │
│     │ Send temp_id    │ → Backend stores with client_temp_id    │
│     │ content         │   Returns DB ID in response             │
│     └─────────────────┘                                         │
│              │                                                  │
│              ▼                                                  │
│  3. BACKEND RESPONSE                                            │
│     ┌─────────────────┐                                         │
│     │ Returns DB ID   │ ← { messages: [...], saved_ids: [...] } │
│     │ + all messages  │                                         │
│     └────────┬────────┘                                         │
│              │                                                  │
│              ▼                                                  │
│  4. RECONCILIATION                                              │
│     ┌─────────────────┐                                         │
│     │ Remove matching │ ← Only remove temp with matching ID     │
│     │ temp message    │   Preserve other pending messages       │
│     │ + fetch /history│   Full replace from authoritative source│
│     └────────┬────────┘                                         │
│              │                                                  │
│              ▼                                                  │
│  5. PERSISTENT STATE                                            │
│     ┌─────────────────┐                                         │
│     │ DB-owned only   │ ← /history is authoritative             │
│     │ No temp IDs     │                                         │
│     └─────────────────┘                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Message Flow

### Phase 1: User Sends Message (Optimistic)

```typescript
// User hits send
const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const tempMessage: ChatMessage = {
  id: tempId, // Temp ID for local tracking
  client_temp_id: tempId, // Mirrored for reconciliation
  text: userInput,
  sender: "user",
  timestamp: new Date(),
  status: "sending", // Shows loading state
  isOptimistic: true, // Flag for reconciliation
};

// Add to local state immediately
set((state) => ({
  messages: [...state.messages, tempMessage],
}));
```

**Why this approach?**

- Temp IDs use timestamp + random suffix for uniqueness
- `isOptimistic` flag clearly marks unconfirmed messages
- `client_temp_id` allows backend to associate the temp ID with DB record

### Phase 2: API Call

```typescript
// POST /api/v1/coach/custom-gpt/chat
{
  message: userInput,
  user_id: userId,
  context: {...},
  client_temp_id: tempId  // ← Critical: tells backend our temp ID
}
```

**Backend expectation:**

- Backend stores message in Supabase with `client_temp_id`
- Returns response with:
  ```json
  {
    "messages": ["coach response"],
    "personality_score": 0.8,
    "saved_ids": {
      "user_message": "db-uuid-1",
      "coach_message": "db-uuid-2"
    },
    "client_temp_id": "temp-xxx"
  }
  ```

### Phase 3: Reconciliation (Critical)

```typescript
// After API response
async function handleSendResponse(response, clientTempId) {
  const { saved_ids, messages } = response;

  // Step 1: Remove ONLY the optimistic message matching client_temp_id
  // This preserves other pending messages (user may have sent multiple quickly)
  set((state) => ({
    messages: state.messages.filter((m) => m.client_temp_id !== clientTempId),
  }));

  // Step 2: Fetch fresh from /history (authoritative source)
  await loadChatHistory({ useFullReplace: true });
}
```

**Why only remove matching temp ID?**

- User can send multiple messages quickly
- Network latency varies between messages
- Each message has its own `client_temp_id`
- Preserves other in-flight messages while reconciling this one

**Why full replace over merge?**

- Simpler: no complex merge logic
- Safer: /history is always correct
- Faster: single operation vs. diffing

### Phase 4: Screen Focus / Reload

```typescript
// CoachChatScreen.tsx - useEffect
useEffect(() => {
  const unsubscribe = navigation.addListener("focus", () => {
    loadChatHistory({ forceRefresh: true });
  });
  return unsubscribe;
}, [navigation, loadChatHistory]);
```

**loadChatHistory behavior:**

```typescript
async function loadChatHistory(options = {}) {
  const { useFullReplace = true, since = null } = options;

  // Prevent concurrent loads
  if (get().isLoadingHistory) {
    console.log("Already loading, skipping");
    return;
  }

  set({ loading: true, isLoadingHistory: true });

  try {
    // If since provided, fetch only new messages
    if (since) {
      const newMessages = await fetchMessagesSince(since);
      set((state) => ({
        messages: [...state.messages, ...newMessages],
      }));
    } else {
      // Full replace - /history is authoritative
      const freshMessages = await fetchAllMessages();
      set({ messages: freshMessages });
    }
  } finally {
    set({ loading: false, isLoadingHistory: false });
  }
}
```

---

## 3. Backend Requirements

### 3.1 `/chat` Endpoint Response

```python
# backend/routers/coaching_router.py

class CoachingChatResponse(BaseModel):
    messages: List[str]  # Coach responses
    personality_score: float
    context_used: List[str]
    variation_applied: bool
    response_type: CoachingResponseType
    thread_id: Optional[str] = None
    function_calls: List[Dict[str, Any]] = Field(default_factory=list)
    usage_stats: Optional[Dict[str, Any]] = None
    # NEW: Reconciliation data
    saved_ids: Dict[str, str]  # {"user_message": "db-uuid", "coach_message": "db-uuid"}
    client_temp_id: Optional[str] = None  # Echo back the client's temp ID
```

### 3.2 Backend Message Storage

```python
# When storing message in Supabase
supabase.table("messages").insert({
    "userid": user_id,
    "content": message_content,
    "direction": "incoming" if user else "outgoing",
    "sender_type": "user" if user else "coach",
    "client_temp_id": client_temp_id,  # ← Store for reconciliation
    "chat_id": chat_id,
    "created_at": datetime.now().isoformat()
})
```

### 3.3 `/history` Endpoint is Authoritative

```python
@router.get("/history/{user_id}")
async def get_chat_history(user_id: str, limit: int = 50, offset: int = 0):
    # Returns ONLY database-persisted messages
    # No optimistic messages included
    # Ordered chronologically (oldest first)
```

---

## 4. Frontend Changes Checklist

### 4.1 chatStore.ts ✅ DONE

- [x] Add `isOptimistic` flag to `ChatMessage` interface
- [x] Add `client_temp_id` to `ChatMessage` interface
- [x] Add `isLoadingHistory` and `currentLoadId` for concurrency guard
- [x] Modify `sendMessage()`:
  - Generate temp ID with timestamp + random suffix
  - Set `isOptimistic: true` on temp message
  - Send `client_temp_id` in API request
- [x] Modify `sendMessage()` response handling:
  - Remove ONLY the optimistic message matching `client_temp_id`
  - Call `loadChatHistory({ useFullReplace: true })`
- [x] Modify `loadChatHistory()`:
  - Add `isLoading` flag to prevent concurrent loads
  - Add `useFullReplace` option (default: true)
  - Full replace behavior: fetch all, replace all
  - Incremental behavior: fetch since timestamp, append

### 4.2 CoachChatScreen.tsx ✅ DONE

- [x] Remove direct `loadChatHistory()` call from initial useEffect
- [x] Use navigation focus event for reload
- [x] Add loading indicator for focus reloads

### 4.3 API Layer (coresenseApi.ts) ✅ DONE

- [x] Update `sendChatMessage()` to include `client_temp_id` in request body

---

## 5. Backend Changes Checklist

### 5.1 coaching_router.py ✅ DONE

- [x] Add `client_temp_id` to `CoachingChatRequest`
- [x] Add `saved_ids` and `client_temp_id` to `CoachingChatResponse`
- [x] Update `/custom-gpt/chat` endpoint to pass `client_temp_id` and return `saved_ids`
- [x] Update `/chat` endpoint to pass `client_temp_id` and return `saved_ids`

### 5.2 coaching_service.py ✅ DONE

- [x] Update `CoachingResponse` dataclass to include `saved_ids` and `client_temp_id`
- [x] Update `chat()` method to accept `client_temp_id` parameter
- [x] Update `chat()` method to return `saved_ids`

### 5.3 message_storage_service.py ✅ DONE

- [x] Update `store_user_message()` to accept and store `client_temp_id`

---

## 6. Message Object Shape

```typescript
interface ChatMessage {
  // DB-owned fields (set after reconciliation)
  id: string; // DB UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
  text: string;
  sender: "user" | "coach";
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read";

  // Optimistic/pending fields (set before reconciliation)
  client_temp_id?: string; // Original temp ID for reconciliation
  isOptimistic?: boolean; // true if pending DB confirmation

  // Streaming fields
  isStreaming?: boolean;
  streamingText?: string;
}
```

---

## 7. Concurrency & Idempotency

### 7.1 Prevent Duplicate Loads

The `isLoadingHistory` flag and `currentLoadId` counter prevent concurrent loads and discard stale results.

### 7.2 Fast Navigation Protection

The navigation focus event handler automatically cleans up on unmount, preventing stale loads from completing.

---

## 8. Summary of Design Decisions

| Decision                       | Rationale                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| Full replace vs merge          | Simpler, fewer edge cases, /history is always correct      |
| No deduplication by content    | Content can repeat legitimately; ID-based is more reliable |
| Temp IDs with timestamp+random | Timestamp for ordering, random for uniqueness              |
| Client sends `client_temp_id`  | Enables backend to track which DB ID maps to which temp ID |
| `/history` is authoritative    | Single source of truth, already exists                     |
| Incremental via timestamp      | More reliable than offset for live data                    |
| Remove matching temp only      | Preserves other in-flight messages during reconciliation   |

---

## 9. Implementation Status

### Completed ✅

1. Backend: Updated `/chat` response to include `saved_ids` and `client_temp_id`
2. Backend: Store `client_temp_id` in Supabase messages table
3. Frontend: Updated `ChatMessage` interface with `isOptimistic` and `client_temp_id`
4. Frontend: Modified `sendMessage()` to use temp IDs and reconciliation
5. Frontend: Updated `loadChatHistory()` with loading guard and full replace
6. Frontend: Updated API layer to send `client_temp_id`
7. Frontend: Updated CoachChatScreen to use navigation focus for reload

### Next Steps

- Test: Verify no duplicates on send, reload, and focus events
- Monitor production for any remaining edge cases

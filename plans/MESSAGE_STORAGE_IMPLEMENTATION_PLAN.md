# Message Storage Implementation Plan

## Overview

The messaging system currently only stores messages in OpenAI's thread storage, not in the Supabase `messages` table. This plan outlines all changes needed to persist messages to the database.

## Current State

- **User messages** → Sent to OpenAI thread only
- **Assistant responses** → Retrieved from OpenAI only
- **No persistence** to Supabase `messages` table

## Target State

- **User messages** → Sent to OpenAI AND stored in `messages` table (direction='incoming', sender_type='user')
- **Assistant responses** → Retrieved from OpenAI AND stored in `messages` table (direction='outgoing', sender_type='gpt')

---

## Implementation Plan

### Phase 1: Create Message Storage Service

**File:** `backend/services/message_storage_service.py`

Create a new service to handle message persistence:

```python
class MessageStorageService:
    """Service for storing messages in the messages table"""

    async def store_user_message(
        self,
        user_id: str,
        content: str,
        thread_id: str
    ) -> str:
        """Store user message in database, return message ID"""

    async def store_assistant_message(
        self,
        user_id: str,
        content: str,
        thread_id: str,
        chat_id: str  # Links to user message
    ) -> str:
        """Store assistant response in database"""
```

### Phase 2: Modify Thread Management Service

**File:** `backend/services/thread_management.py`

#### Changes:

1. Import the new `MessageStorageService`
2. In `_process_completed_run()`, return the assistant message ID for linking
3. Add optional database storage parameter to methods

### Phase 3: Modify Coaching Service

**File:** `backend/services/coaching_service.py`

#### In `chat()` method:

1. After line 199 (`add_message_to_thread`):

   - Call message storage service to persist user message
   - Get the returned `chat_id`

2. After lines 202-207 (assistant response):
   - Call message storage service to persist assistant message
   - Pass the `chat_id` to link messages

### Phase 4: Update Router (Optional)

**File:** `backend/routers/coaching_router.py`

The router doesn't need changes - it just returns the response from the service.

---

## Database Schema Mapping

### messages table → Python dict

| Column         | Type        | Python Field   | Notes                                 |
| -------------- | ----------- | -------------- | ------------------------------------- |
| `id`           | uuid        | `id`           | Auto-generated UUID                   |
| `chat_id`      | uuid        | `chat_id`      | Links user ↔ assistant messages       |
| `userid`       | uuid        | `user_id`      | Foreign key to users                  |
| `direction`    | text        | `direction`    | 'incoming' (user) or 'outgoing' (gpt) |
| `sender_type`  | text        | `sender_type`  | 'user' or 'gpt'                       |
| `content`      | text        | `content`      | The message text                      |
| `message_type` | text        | `message_type` | Default 'text'                        |
| `read_in_app`  | boolean     | `read_in_app`  | Default False                         |
| `created_at`   | timestamptz | `created_at`   | Auto-generated                        |
| `metadata`     | jsonb       | `metadata`     | Optional extra data                   |

---

## Implementation Steps

### Step 1: Create Message Storage Service

```python
# backend/services/message_storage_service.py

from datetime import datetime
from database.supabase_client import get_supabase_client
import uuid

class MessageStorageService:
    def __init__(self):
        pass

    async def store_user_message(
        self,
        user_id: str,
        content: str,
        thread_id: str
    ) -> str:
        """Store user message and return chat_id for linking"""
        supabase = get_supabase_client()
        chat_id = str(uuid.uuid4())

        supabase.table("messages").insert({
            "chat_id": chat_id,
            "userid": user_id,
            "direction": "incoming",
            "sender_type": "user",
            "content": content,
            "message_type": "text",
            "read_in_app": False,
            "created_at": datetime.now().isoformat(),
            "metadata": {"thread_id": thread_id}
        }).execute()

        return chat_id

    async def store_assistant_message(
        self,
        user_id: str,
        content: str,
        thread_id: str,
        chat_id: str
    ) -> str:
        """Store assistant message linked to user message"""
        supabase = get_supabase_client()
        message_id = str(uuid.uuid4())

        supabase.table("messages").insert({
            "id": message_id,
            "chat_id": chat_id,
            "userid": user_id,
            "direction": "outgoing",
            "sender_type": "gpt",
            "content": content,
            "message_type": "text",
            "read_in_app": False,
            "delivered": True,
            "created_at": datetime.now().isoformat(),
            "metadata": {"thread_id": thread_id}
        }).execute()

        return message_id
```

### Step 2: Update Coaching Service

```python
# In backend/services/coaching_service.py

# Add import
from .message_storage_service import message_storage

class UnifiedCoachingService:
    def __init__(self):
        # ... existing init
        self.message_storage = message_storage

    async def chat(self, user_id, message, response_type, context) -> CoachingResponse:
        # ... existing code

        # Get user thread
        thread_id = await self.thread_manager.get_or_create_user_thread(user_id)

        # Add user message to OpenAI thread
        await self.thread_manager.add_message_to_thread(thread_id, message, "user")

        # NEW: Store user message in database
        chat_id = await self.message_storage.store_user_message(
            user_id=user_id,
            content=message,
            thread_id=thread_id
        )

        # Run assistant
        result = await self.thread_manager.run_assistant(
            thread_id=thread_id,
            user_id=user_id,
            response_type=response_type.value
        )

        # NEW: Store assistant messages in database
        for msg_content in result["messages"]:
            await self.message_storage.store_assistant_message(
                user_id=user_id,
                content=msg_content,
                thread_id=thread_id,
                chat_id=chat_id
            )

        # ... rest of method
```

---

## Files to Modify

| File                                          | Changes                                |
| --------------------------------------------- | -------------------------------------- |
| `backend/services/message_storage_service.py` | **CREATE** - New service file          |
| `backend/services/coaching_service.py`        | **MODIFY** - Add message storage calls |
| `backend/services/__init__.py`                | **MODIFY** - Export new service        |

---

## Testing Checklist

- [ ] User messages appear in `messages` table with direction='incoming', sender_type='user'
- [ ] Assistant responses appear in `messages` table with direction='outgoing', sender_type='gpt'
- [ ] `chat_id` correctly links user and assistant messages
- [ ] `thread_id` stored in metadata for debugging
- [ ] Timestamps are correctly set
- [ ] Existing chat history endpoint still works

---

## Rollback Plan

If issues arise:

1. Disable message storage by adding a feature flag in config
2. The system will continue to work (messages only in OpenAI threads)
3. Fix issues and re-enable storage

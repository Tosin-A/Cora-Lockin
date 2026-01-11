# Chat Message Fix Plan

## Issues

1. **Messages displayed on wrong side (User vs Coach)** - Backend returns `direction` but frontend expects `sender_type`
2. **Remove timestamp display on coach screen**

## Steps to Complete

### Step 1: Fix Backend - Update `sender_type` field in chat history

- [x] File: `backend/routers/coaching_router.py`
- [x] Change `direction` field to `sender_type`
- [x] Map: `outbound` → `user`, `inbound` → `gpt`

### Step 2: Fix Frontend - Remove timestamp display

- [x] File: `coresense/components/ChatMessage.tsx`
- [x] Remove the timestamp section from the message footer

## Status: ✅ Complete

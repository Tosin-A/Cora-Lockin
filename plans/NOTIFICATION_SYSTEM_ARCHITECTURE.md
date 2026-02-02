# Notification System Architecture

## Overview

A comprehensive push notification system for CoreSense that enables the coach and app to nudge users about their tasks, insights, and engagement.

## Components

### 1. Infrastructure

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Native   │────▶│  Backend API     │────▶│  Push Services  │
│  (Expo)         │     │  (FastAPI)       │     │  (APNs/FCM)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │               ┌──────────────────┐            │
        │               │    Supabase      │            │
        │               │  (PostgreSQL)    │            │
        │               └──────────────────┘            │
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                ▼
                        ┌──────────────────┐
                        │   User Device    │
                        └──────────────────┘
```

### 2. Database Schema

#### `device_tokens` table (already exists via migration 017)
```sql
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios' | 'android'
    expo_push_token TEXT, -- Expo push token format
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);
```

#### `notification_preferences` table (already exists via migration 016)
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Master toggle
    notifications_enabled BOOLEAN DEFAULT true,

    -- Category toggles
    task_reminders_enabled BOOLEAN DEFAULT true,
    coach_nudges_enabled BOOLEAN DEFAULT true,
    insights_enabled BOOLEAN DEFAULT true,
    streak_reminders_enabled BOOLEAN DEFAULT true,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',

    -- Frequency limits
    max_daily_notifications INTEGER DEFAULT 10,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### NEW: `notification_history` table
```sql
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification details
    type VARCHAR(50) NOT NULL, -- 'task_reminder' | 'coach_nudge' | 'insight' | 'streak'
    title TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Reference to source (optional)
    reference_type VARCHAR(50), -- 'todo' | 'insight' | 'streak'
    reference_id UUID,

    -- Delivery tracking
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_history_user_status ON notification_history(user_id, status);
CREATE INDEX idx_notification_history_scheduled ON notification_history(scheduled_for) WHERE status = 'pending';
```

### 3. Notification Types

| Type | Trigger | Example Content |
|------|---------|-----------------|
| **Task Reminder** | Task due date/time approaching | "Your task 'Morning workout' is due in 30 mins" |
| **Coach Nudge** | Periodic check-in, inactivity, task overdue | "Hey, you mentioned wanting to work out. Did you get to it?" |
| **Daily Insight** | New insight generated | "New insight: You sleep better after walking 8k+ steps" |
| **Streak Alert** | Streak at risk (no activity today) | "Don't break your 5-day streak! Check in today" |
| **Coach Task** | Coach creates a task | "Cora suggested a task: 'Take a 10-min break'" |

### 4. Backend Service Architecture

#### `backend/services/notification_service.py`

```python
"""
Notification Service - Handles push notification delivery
"""

from dataclasses import dataclass
from typing import Optional, List
from enum import Enum
from datetime import datetime, timedelta
import httpx
import logging

from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    TASK_REMINDER = "task_reminder"
    COACH_NUDGE = "coach_nudge"
    INSIGHT = "insight"
    STREAK_ALERT = "streak_alert"
    COACH_TASK = "coach_task"


@dataclass
class NotificationPayload:
    user_id: str
    type: NotificationType
    title: str
    body: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    data: Optional[dict] = None  # Extra data for deep linking


class NotificationService:
    """
    Handles push notification delivery via Expo Push API
    """

    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

    def __init__(self):
        self.supabase = get_supabase_client()

    async def send_notification(self, payload: NotificationPayload) -> bool:
        """Send a push notification to a user"""
        try:
            # Check user preferences
            if not await self._should_send(payload.user_id, payload.type):
                logger.info(f"Notification blocked by preferences for {payload.user_id}")
                return False

            # Get user's push tokens
            tokens = await self._get_user_tokens(payload.user_id)
            if not tokens:
                logger.warning(f"No push tokens for user {payload.user_id}")
                return False

            # Record notification attempt
            notification_id = await self._record_notification(payload, "pending")

            # Send via Expo Push API
            success = await self._send_expo_push(tokens, payload)

            # Update status
            await self._update_notification_status(
                notification_id,
                "sent" if success else "failed"
            )

            return success

        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False

    async def schedule_task_reminders(self, user_id: str):
        """Schedule reminders for user's pending tasks with due dates"""
        try:
            # Get tasks with reminders enabled
            response = self.supabase.table("shared_todos").select(
                "id, title, due_date, due_time, reminder_minutes_before"
            ).eq("user_id", user_id).eq("reminder_enabled", True).in_(
                "status", ["pending", "in_progress"]
            ).execute()

            for task in response.data or []:
                await self._schedule_task_reminder(user_id, task)

        except Exception as e:
            logger.error(f"Error scheduling task reminders: {e}")

    async def send_coach_nudge(self, user_id: str, nudge_type: str):
        """Send a coach nudge notification"""
        # Get context for personalized message
        context = await self._get_nudge_context(user_id, nudge_type)

        # Generate nudge message based on type
        messages = {
            "task_overdue": self._generate_overdue_nudge(context),
            "daily_checkin": self._generate_checkin_nudge(context),
            "inactivity": self._generate_inactivity_nudge(context),
            "streak_risk": self._generate_streak_nudge(context),
        }

        title, body = messages.get(nudge_type, ("Check in", "Your coach wants to hear from you"))

        await self.send_notification(NotificationPayload(
            user_id=user_id,
            type=NotificationType.COACH_NUDGE,
            title=title,
            body=body
        ))

    # Private helper methods...

    async def _should_send(self, user_id: str, notification_type: NotificationType) -> bool:
        """Check if notification should be sent based on preferences"""
        prefs = self.supabase.table("notification_preferences").select(
            "*"
        ).eq("user_id", user_id).execute()

        if not prefs.data:
            return True  # Default to enabled

        pref = prefs.data[0]

        # Check master toggle
        if not pref.get("notifications_enabled", True):
            return False

        # Check category toggle
        category_map = {
            NotificationType.TASK_REMINDER: "task_reminders_enabled",
            NotificationType.COACH_NUDGE: "coach_nudges_enabled",
            NotificationType.INSIGHT: "insights_enabled",
            NotificationType.STREAK_ALERT: "streak_reminders_enabled",
            NotificationType.COACH_TASK: "task_reminders_enabled",
        }

        category_key = category_map.get(notification_type)
        if category_key and not pref.get(category_key, True):
            return False

        # Check quiet hours
        if pref.get("quiet_hours_enabled"):
            if self._is_quiet_hours(pref):
                return False

        # Check daily limit
        if await self._exceeded_daily_limit(user_id, pref.get("max_daily_notifications", 10)):
            return False

        return True

    async def _get_user_tokens(self, user_id: str) -> List[str]:
        """Get active push tokens for user"""
        response = self.supabase.table("device_tokens").select(
            "expo_push_token"
        ).eq("user_id", user_id).eq("is_active", True).execute()

        return [t["expo_push_token"] for t in response.data or [] if t.get("expo_push_token")]

    async def _send_expo_push(self, tokens: List[str], payload: NotificationPayload) -> bool:
        """Send push notification via Expo Push API"""
        messages = [
            {
                "to": token,
                "title": payload.title,
                "body": payload.body,
                "data": {
                    "type": payload.type.value,
                    "reference_type": payload.reference_type,
                    "reference_id": payload.reference_id,
                    **(payload.data or {})
                },
                "sound": "default",
                "badge": 1,
            }
            for token in tokens
        ]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200


# Global instance
notification_service = NotificationService()
```

### 5. Mobile Integration

#### `coresense/utils/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { coresenseApi } from './coresenseApi';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register token with backend
  await coresenseApi.registerDeviceToken(token, Platform.OS);

  return token;
}

export function setupNotificationListeners(navigation: any) {
  // Handle notification when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
    }
  );

  // Handle notification tap
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;

      // Deep link based on notification type
      switch (data.type) {
        case 'task_reminder':
        case 'coach_task':
          navigation.navigate('Tasks');
          break;
        case 'coach_nudge':
          navigation.navigate('Coach');
          break;
        case 'insight':
          navigation.navigate('Insights');
          break;
        default:
          navigation.navigate('Home');
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
```

### 6. API Endpoints

#### New endpoints in `backend/routers/notifications.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/devices/token` | Register device push token |
| DELETE | `/api/v1/devices/token` | Unregister device token |
| GET | `/api/v1/notifications/preferences` | Get notification preferences |
| PUT | `/api/v1/notifications/preferences` | Update notification preferences |
| GET | `/api/v1/notifications/history` | Get notification history |
| POST | `/api/v1/notifications/test` | Send test notification (dev only) |

### 7. Scheduled Jobs (Background Workers)

Use a task scheduler (e.g., Celery, APScheduler, or Railway cron) for:

1. **Task Reminder Check** (every 5 mins)
   - Query tasks with due dates approaching
   - Send reminders based on `reminder_minutes_before`

2. **Daily Engagement Check** (daily at user's preferred time)
   - Check if user has been active today
   - Send streak reminder if streak at risk
   - Send coach check-in if enabled

3. **Overdue Task Nudge** (every hour)
   - Find overdue tasks
   - Send coach nudge about overdue items

4. **Insight Delivery** (when new insight generated)
   - Triggered by insights engine
   - Send notification about new personalized insight

### 8. Implementation Phases

#### Phase 1: Foundation
- [ ] Create `notification_history` migration
- [ ] Implement `NotificationService` base class
- [ ] Add device token registration endpoints
- [ ] Set up Expo push notification in app

#### Phase 2: Task Reminders
- [ ] Implement task reminder scheduling
- [ ] Add reminder time to task creation UI
- [ ] Send reminders at scheduled times

#### Phase 3: Coach Nudges
- [ ] Implement nudge generation logic
- [ ] Add coach nudge triggers (inactivity, overdue, streak risk)
- [ ] Integrate with coaching service for personalized messages

#### Phase 4: Insights & Streaks
- [ ] Connect insights engine to notification service
- [ ] Implement streak risk detection
- [ ] Add daily engagement notifications

#### Phase 5: Preferences & Polish
- [ ] Build notification preferences UI in Settings
- [ ] Add quiet hours support
- [ ] Implement notification history view
- [ ] Add analytics tracking

### 9. Security Considerations

1. **Token Security**: Device tokens are sensitive - store securely, never log
2. **Rate Limiting**: Enforce daily notification limits per user
3. **User Control**: Always respect user preferences, easy opt-out
4. **Data Privacy**: Notification content shouldn't contain sensitive data
5. **Token Cleanup**: Regularly clean up inactive/invalid tokens

### 10. Testing Strategy

1. **Unit Tests**: NotificationService methods
2. **Integration Tests**: Full notification flow with mock push service
3. **Device Testing**: Real push notifications on physical devices
4. **Load Testing**: Ensure system handles batch notifications

---

## Next Steps

1. Review and approve architecture
2. Create database migration for `notification_history`
3. Implement Phase 1: Foundation
4. Iterate through remaining phases

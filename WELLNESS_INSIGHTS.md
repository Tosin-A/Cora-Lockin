# Wellness Insights — Implementation & Setup

Combined reference for the wellness insights feature (analytics, scoring, goals, manual logging).

---

## Status

✅ Backend and frontend implementation **complete**. Database migration needs to be run in Supabase.

---

## Architecture

### Backend services

| File | Purpose |
|---|---|
| `backend/services/wellness_analytics_service.py` | Calculates overall + component wellness scores, trend detection |
| `backend/services/insight_generation_service.py` | Generates personalized, prioritized, actionable insights |
| `backend/services/goal_management_service.py` | CRUD + progress tracking + goal suggestions |
| `backend/routers/wellness_router.py` | API endpoints (wired into `main.py`) |
| `backend/routers/app_api.py` | `/api/v1/insights` enhanced to include wellness score |

### Frontend

| File | Purpose |
|---|---|
| `coresense/stores/wellnessStore.ts` | Wellness score state (Zustand) |
| `coresense/stores/goalsStore.ts` | Goals state |
| `coresense/components/WellnessScoreCard.tsx` | Score + breakdown UI |
| `coresense/screens/HealthLogScreen.tsx` | Manual logging (mood, stress, water, notes) |
| `coresense/screens/InsightsScreen.tsx` | Updated to render score card |
| `coresense/utils/coresenseApi.ts` | `getWellnessScore`, `logManualHealthData`, `getWellnessGoals`, `createWellnessGoal` |

---

## Database

Migration file: `backend/migrations/create_wellness_tables.sql`

Tables created:
- `wellness_goals` — user goals (type, target, period, status)
- `manual_health_logs` — manual entries (mood, stress, water, notes)
- `wellness_scores` — computed scores per day

Tables updated:
- `insights` — adds `wellness_score`, goal references
- `health_metrics` — adds new metric types

**Setup:** paste the migration into the Supabase SQL Editor and run.

---

## Wellness score formula

Overall score (0–100) is a weighted average of five component scores:

| Component | Weight |
|---|---|
| Sleep | 25% |
| Activity | 25% |
| Nutrition | 20% |
| Mental wellbeing | 20% |
| Hydration | 10% |

Trend is derived by comparing the most recent window to the prior window — `improving`, `stable`, or `declining`.

---

## Insight examples

| Category | Sample body |
|---|---|
| Sleep | "You slept 6.2 hours on average this week; aim for 7–8 to improve recovery." |
| Activity | "You averaged 7,500 steps. Aim for 10,000 daily." |
| Nutrition | "Start tracking nutrition to improve your wellness score." |
| Mental | "Your stress levels averaged 7/10 this week. Try stress-reduction techniques." |
| Hydration | "You're averaging 1500ml of water daily. Aim for 2000ml." |

Each insight carries `priority`, `actionable`, `action_text`, and `trend` so the UI can sort and badge them.

---

## API reference

All endpoints require auth (JWT via `Authorization: Bearer <token>`).

### Wellness score
- `GET /api/v1/wellness/score` — current score
- `GET /api/v1/wellness/score/history?days=7` — score history

### Insights
- `GET /api/v1/wellness/insights?period=weekly` — generated insights

### Manual logging
- `POST /api/v1/wellness/logs` — body: `{ "log_type": "mood|stress|water", "value": <number>, "notes": "..." }`
- `GET /api/v1/wellness/logs?log_type=mood&days=7`

### Goals
- `GET /api/v1/wellness/goals?status=active`
- `POST /api/v1/wellness/goals` — body: `{ "goal_type": "steps", "target_value": 10000, "unit": "steps", "period": "daily" }`
- `PUT /api/v1/wellness/goals/{goal_id}`
- `DELETE /api/v1/wellness/goals/{goal_id}`
- `GET /api/v1/wellness/goals/suggestions`

### Example payloads

**Wellness score response:**
```json
{
  "overall_score": 78.5,
  "sleep_score": 85.0,
  "activity_score": 72.0,
  "nutrition_score": 75.0,
  "mental_wellbeing_score": 80.0,
  "hydration_score": 70.0,
  "trend": "improving",
  "date": "2026-05-30"
}
```

**Insight response:**
```json
{
  "title": "Sleep Improvement Opportunity",
  "body": "You slept 6.2 hours on average this week; try to aim for 7-8 hours to improve recovery.",
  "category": "sleep",
  "trend": "down",
  "trend_value": "-1.5h",
  "actionable": true,
  "action_text": "Set bedtime reminder for 10 PM",
  "priority": 85
}
```

---

## Setup steps

1. **Run the migration** in the Supabase SQL Editor (`backend/migrations/create_wellness_tables.sql`).
2. **Backend** services and router are already wired into `main.py` — restart Railway after the migration runs.
3. **Frontend** components are already exported and consumed by `InsightsScreen`. `HealthLogScreen` is built but **needs to be added to the navigation stack**:
   ```tsx
   import HealthLogScreen from './screens/HealthLogScreen';
   <Stack.Screen name="HealthLog" component={HealthLogScreen} />
   ```
4. **Smoke test** with curl:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://<api>/api/v1/wellness/score
   curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d '{"log_type":"mood","value":7}' https://<api>/api/v1/wellness/logs
   curl -H "Authorization: Bearer $TOKEN" https://<api>/api/v1/wellness/insights
   ```

### Frontend usage example

```typescript
import { useGoalsStore } from '../stores/goalsStore';

const { goals, fetchGoals, createGoal } = useGoalsStore();
await fetchGoals('active');
await createGoal({
  goal_type: 'steps',
  target_value: 10000,
  unit: 'steps',
  period: 'daily'
});
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Wellness score empty | No health data in `health_metrics`, or migration didn't run |
| Insights not generating | Need ≥ 3–7 days of data; check `wellness_analytics_service` logs |
| Manual log POST 401 | Token expired |
| Manual log POST 500 | Table missing — verify migration ran |
| Wellness card not visible | Verify `WellnessScoreCard` is exported via `components/index.ts` |

---

## Optional enhancements (not yet implemented)

- Google Fit / Fitbit integration
- Push notifications for insights
- Monthly summary view
- Goal-progress charts
- Nutrition tracking UI

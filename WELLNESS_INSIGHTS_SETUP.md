# Wellness Insights Feature - Setup Instructions

## Quick Setup Guide

The wellness insights feature has been implemented! Follow these steps to get it running:

### 1. Database Setup

Run the migration SQL file in your Supabase SQL Editor:

```bash
# File: backend/migrations/create_wellness_tables.sql
```

This creates:
- `wellness_goals` table
- `manual_health_logs` table  
- `wellness_scores` table
- Updates to `insights` table
- Updates to `health_metrics` table

### 2. Backend Setup

The backend services are already created:
- `backend/services/wellness_analytics_service.py` - Calculates wellness scores
- `backend/services/insight_generation_service.py` - Generates actionable insights
- `backend/services/goal_management_service.py` - Manages wellness goals
- `backend/routers/wellness_router.py` - API endpoints

The router is already added to `main.py`.

### 3. Frontend Setup

New components and stores:
- `coresense/stores/wellnessStore.ts` - Wellness score state
- `coresense/stores/goalsStore.ts` - Goals state
- `coresense/components/WellnessScoreCard.tsx` - Score display component
- `coresense/screens/HealthLogScreen.tsx` - Manual logging screen

The `InsightsScreen` has been updated to show wellness scores.

### 4. API Endpoints

New endpoints available:

**Wellness Score:**
- `GET /api/v1/wellness/score` - Get current wellness score
- `GET /api/v1/wellness/score/history?days=7` - Get score history

**Insights:**
- `GET /api/v1/wellness/insights?period=weekly` - Get generated insights

**Manual Logging:**
- `POST /api/v1/wellness/logs` - Log mood, stress, water, nutrition
- `GET /api/v1/wellness/logs?log_type=mood&days=7` - Get logs

**Goals:**
- `GET /api/v1/wellness/goals?status=active` - Get goals
- `POST /api/v1/wellness/goals` - Create goal
- `PUT /api/v1/wellness/goals/{goal_id}` - Update goal
- `DELETE /api/v1/wellness/goals/{goal_id}` - Delete goal
- `GET /api/v1/wellness/goals/suggestions` - Get goal suggestions

### 5. Testing

1. **Test Wellness Score:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/wellness/score
   ```

2. **Test Manual Logging:**
   ```bash
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"log_type": "mood", "value": 7}' \
     http://localhost:8000/api/v1/wellness/logs
   ```

3. **Test Insights:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/wellness/insights
   ```

### 6. Frontend Usage

**View Wellness Score:**
- The wellness score automatically appears on the Insights screen
- It shows overall score and component breakdowns

**Log Health Data:**
- Navigate to HealthLogScreen (add to navigation if needed)
- Log mood (1-10 scale)
- Log stress level (1-10 scale)
- Log water intake (ml)

**Manage Goals:**
```typescript
import { useGoalsStore } from '../stores/goalsStore';

const { goals, fetchGoals, createGoal } = useGoalsStore();

// Fetch goals
await fetchGoals('active');

// Create goal
await createGoal({
  goal_type: 'steps',
  target_value: 10000,
  unit: 'steps',
  period: 'daily'
});
```

### 7. Navigation Setup

Add HealthLogScreen to your navigation:

```typescript
// In your navigation file
import HealthLogScreen from './screens/HealthLogScreen';

// Add to stack navigator
<Stack.Screen name="HealthLog" component={HealthLogScreen} />
```

### 8. Features Implemented

✅ Wellness score calculation (0-100)
✅ Component scores (Sleep, Activity, Nutrition, Mental, Hydration)
✅ Trend detection (improving, stable, declining)
✅ Actionable insights generation
✅ Manual health logging (mood, stress, water)
✅ Goal management (create, update, delete)
✅ Goal suggestions based on wellness data
✅ Integration with existing Insights screen

### 9. Next Steps (Optional Enhancements)

- Add Google Fit integration
- Add Fitbit integration
- Add push notifications for insights
- Add monthly summary view
- Add goal progress charts
- Add nutrition tracking UI

### 10. Troubleshooting

**Wellness score not showing:**
- Check if health data exists in `health_metrics` table
- Verify database migration ran successfully
- Check backend logs for errors

**Insights not generating:**
- Ensure health data exists for at least 3-7 days
- Check `wellness_analytics_service.py` logs
- Verify database permissions

**Manual logging failing:**
- Check authentication token
- Verify API endpoint URL
- Check database table exists

## Support

For issues or questions, check:
- Backend logs: `backend/logs/`
- Database: Supabase dashboard
- API docs: `http://localhost:8000/docs`

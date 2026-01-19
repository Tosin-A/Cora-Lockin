# Wellness Insights - Quick Start Guide

## Overview

This guide provides a quick reference for implementing the Wellness Insights feature. For detailed information, see `WELLNESS_INSIGHTS_IMPLEMENTATION_PLAN.md`.

## Current State

✅ **Already Built:**
- Basic Insights screen UI
- HealthKit integration (iOS)
- Health data syncing to Supabase
- Basic pattern recognition
- Insights database schema
- API endpoints for insights

❌ **Needs to be Built:**
- Multi-source health data aggregation
- Wellness score calculation
- Enhanced insight generation with actionable recommendations
- Goal management system
- Manual health logging
- Connected apps integration (Google Fit, Fitbit)
- Push notifications
- Monthly summaries
- Enhanced UI components

## Implementation Priority

### 🔴 High Priority (MVP)
1. **Wellness Score Calculation** - Core feature for Insights screen
2. **Enhanced Insight Generation** - Actionable recommendations
3. **Manual Health Logging** - Mood, stress, water intake
4. **Goal Management** - Basic goal setting and tracking

### 🟡 Medium Priority
5. **Monthly Summaries** - Extended time period analysis
6. **Connected Apps** - Google Fit integration
7. **Push Notifications** - Insight alerts

### 🟢 Low Priority (Future)
8. **Fitbit Integration** - Additional data source
9. **Advanced Analytics** - ML-based correlations
10. **Social Features** - Share insights (if applicable)

## Quick Implementation Checklist

### Database Setup
- [ ] Create `wellness_goals` table
- [ ] Create `manual_health_logs` table
- [ ] Create `connected_health_apps` table
- [ ] Create `wellness_scores` table
- [ ] Add columns to `insights` table (wellness_score, related_goal_id)

### Backend Services
- [ ] `health_aggregation_service.py` - Aggregate data from multiple sources
- [ ] `wellness_analytics_service.py` - Calculate scores and trends
- [ ] `insight_generation_service.py` - Generate actionable insights
- [ ] `goal_management_service.py` - Manage goals

### API Endpoints
- [ ] `GET /api/v1/insights/wellness-score` - Get wellness score
- [ ] `POST /api/v1/health/logs/manual` - Log manual data
- [ ] `GET /api/v1/goals` - List goals
- [ ] `POST /api/v1/goals` - Create goal
- [ ] `GET /api/v1/insights/monthly-summary` - Monthly summary

### Frontend Components
- [ ] `WellnessScoreCard.tsx` - Display wellness score
- [ ] `HealthLogScreen.tsx` - Manual logging screen
- [ ] `GoalsScreen.tsx` - Goals management
- [ ] `MoodPicker.tsx` - Mood selection component
- [ ] `GoalCard.tsx` - Goal display component

### Stores
- [ ] `wellnessStore.ts` - Wellness score state
- [ ] `goalsStore.ts` - Goals state management
- [ ] Update `healthStore.ts` - Add manual logging

## Key Algorithms

### Wellness Score Calculation
```
Overall Score = 
  (Sleep Score × 0.25) +
  (Activity Score × 0.25) +
  (Nutrition Score × 0.20) +
  (Mental Wellbeing Score × 0.20) +
  (Hydration Score × 0.10)
```

### Insight Generation Example
```python
if avg_sleep < 7:
    insight = {
        "title": "Sleep Improvement Opportunity",
        "body": f"You slept {avg_sleep:.1f} hours on average this week; try to aim for 7-8 hours to improve recovery.",
        "actionable": True,
        "action_text": "Set bedtime reminder for 10 PM",
        "priority": calculate_priority(avg_sleep, 7)
    }
```

## Testing Strategy

### Unit Tests
- Wellness score calculations
- Insight generation logic
- Goal progress tracking
- Data aggregation

### Integration Tests
- API endpoint responses
- Database operations
- External API integrations

### User Acceptance Tests
- Insight relevance
- Goal suggestions quality
- UI/UX flow
- Notification timing

## Common Patterns

### Insight Format
```typescript
interface Insight {
  id: string;
  title: string;
  body: string; // Actionable recommendation
  category: 'sleep' | 'activity' | 'nutrition' | 'mental' | 'hydration';
  trend: 'up' | 'down' | 'stable';
  trendValue?: string; // e.g., "+15%", "-2 hours"
  actionable: boolean;
  actionText?: string;
  priority: number; // 0-100
  wellnessScore?: number;
  relatedGoalId?: string;
}
```

### Goal Format
```typescript
interface WellnessGoal {
  id: string;
  goalType: 'steps' | 'sleep' | 'water' | 'mood' | 'stress' | 'nutrition';
  targetValue: number;
  currentValue: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  progressPercentage: number;
  status: 'active' | 'completed' | 'paused';
}
```

## Environment Variables Needed

```bash
# Google Fit API
GOOGLE_FIT_CLIENT_ID=...
GOOGLE_FIT_CLIENT_SECRET=...

# Fitbit API
FITBIT_CLIENT_ID=...
FITBIT_CLIENT_SECRET=...

# Push Notifications
EXPO_PUSH_NOTIFICATION_KEY=...
```

## Database Migrations

Run migrations in order:
1. `create_wellness_tables.sql`
2. `add_insights_columns.sql`
3. `create_indexes.sql`

## API Rate Limits

- Google Fit: 10,000 requests/day
- Fitbit: 150 requests/hour
- Internal APIs: No limit (but implement caching)

## Performance Targets

- Wellness score calculation: < 500ms
- Insight generation: < 5 seconds
- API response times: < 500ms
- Data sync: < 30 seconds

## Security Considerations

- Encrypt OAuth tokens
- Validate all user inputs
- Rate limit API endpoints
- Audit health data access
- Comply with health data regulations

## Next Steps

1. **Review the detailed plan** (`WELLNESS_INSIGHTS_IMPLEMENTATION_PLAN.md`)
2. **Set up development branch**: `git checkout -b feature/wellness-insights`
3. **Start with Phase 1**: Database schema updates
4. **Set up testing environment**
5. **Begin implementation**

## Questions?

Refer to:
- Detailed plan: `WELLNESS_INSIGHTS_IMPLEMENTATION_PLAN.md`
- Database schema: `DATABASE_SCHEMA_COMPLETE.sql`
- Existing insights code: `backend/routers/app_api.py` (insights endpoints)
- Frontend insights: `coresense/screens/InsightsScreen.tsx`

# Wellness Insights Implementation Plan

## Executive Summary

This plan outlines the implementation of a comprehensive wellness Insights screen that analyzes user health data from multiple sources and provides personalized, actionable feedback. The feature builds on existing infrastructure while adding new capabilities for data aggregation, analytics, and insight generation.

## Current State Analysis

### ✅ What Already Exists

**Database Schema:**
- `insights` table - stores generated insights with categories, trends, priorities
- `health_metrics` table - stores health data (steps, sleep, heart rate, etc.)
- `daily_stats` table - aggregated daily statistics
- `weekly_summaries` table - weekly summary text
- `health_sync_status` table - tracks sync status

**Frontend:**
- `InsightsScreen.tsx` - basic UI with charts and pattern cards
- `healthStore.ts` - HealthKit integration (iOS only)
- `insightsStore.ts` - insights state management
- Health data syncing to Supabase

**Backend:**
- `/api/v1/insights` endpoint - returns insights data
- `/api/v1/health/summary` endpoint - health summary
- `pattern_recognition.py` - pattern analysis service
- Health metrics storage and retrieval

### ❌ What's Missing

1. **Multi-source health data aggregation**
   - Apple Health integration (partial - iOS only)
   - Google Fit integration
   - Fitbit integration
   - Manual input forms

2. **Comprehensive analytics engine**
   - Wellness score calculation
   - Trend analysis across multiple metrics
   - Correlation detection (e.g., sleep vs mood)
   - Predictive insights

3. **Enhanced insight generation**
   - Actionable recommendations with specific targets
   - Context-aware suggestions
   - Goal-based insights

4. **Additional data types**
   - Nutrition tracking
   - Mood logging
   - Stress levels
   - Water intake
   - Heart rate variability

5. **Goal management**
   - Goal setting interface
   - Progress tracking
   - Goal-based recommendations

6. **Notifications**
   - Push notification service
   - Insight alerts
   - Progress notifications

7. **Enhanced UI**
   - Wellness score visualization
   - Monthly summaries
   - Drill-down detail views
   - Goal management UI

---

## Implementation Plan

### Phase 1: Database Schema Enhancements (Week 1)

#### 1.1 Extend Health Metrics Table
```sql
-- Add new metric types to health_metrics
ALTER TABLE health_metrics 
ADD CONSTRAINT metric_type_check CHECK (
  metric_type IN (
    'steps', 'sleep_duration', 'active_energy', 
    'heart_rate', 'distance', 'heart_rate_variability',
    'water_intake', 'mood', 'stress_level', 'nutrition_calories',
    'nutrition_protein', 'nutrition_carbs', 'nutrition_fat'
  )
);
```

#### 1.2 Create Wellness Goals Table
```sql
CREATE TABLE IF NOT EXISTS wellness_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'steps', 'sleep', 'water', 'mood', 'stress', 'nutrition', 'activity'
  )),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  period TEXT DEFAULT 'daily' CHECK (period IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wellness_goals_user ON wellness_goals(user_id, status);
```

#### 1.3 Create Manual Health Logs Table
```sql
CREATE TABLE IF NOT EXISTS manual_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  log_type TEXT NOT NULL CHECK (log_type IN (
    'mood', 'stress', 'water', 'nutrition', 'custom'
  )),
  value NUMERIC,
  text_value TEXT,
  unit TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_logs_user ON manual_health_logs(user_id, logged_at DESC);
CREATE INDEX idx_manual_logs_type ON manual_health_logs(user_id, log_type, logged_at DESC);
```

#### 1.4 Create Connected Apps Table
```sql
CREATE TABLE IF NOT EXISTS connected_health_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  app_name TEXT NOT NULL CHECK (app_name IN (
    'apple_health', 'google_fit', 'fitbit', 'strava', 'myfitnesspal'
  )),
  connected BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'daily',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  permissions_granted TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_name)
);

CREATE INDEX idx_connected_apps_user ON connected_health_apps(user_id, connected);
```

#### 1.5 Enhance Insights Table
```sql
-- Add wellness score and goal references
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS wellness_score NUMERIC,
ADD COLUMN IF NOT EXISTS related_goal_id UUID REFERENCES wellness_goals(id),
ADD COLUMN IF NOT EXISTS recommendation_type TEXT CHECK (
  recommendation_type IN ('improvement', 'maintenance', 'celebration', 'warning')
);
```

#### 1.6 Create Wellness Scores Table
```sql
CREATE TABLE IF NOT EXISTS wellness_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  score_date DATE NOT NULL,
  overall_score NUMERIC NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  sleep_score NUMERIC CHECK (sleep_score >= 0 AND sleep_score <= 100),
  activity_score NUMERIC CHECK (activity_score >= 0 AND activity_score <= 100),
  nutrition_score NUMERIC CHECK (nutrition_score >= 0 AND nutrition_score <= 100),
  mental_wellbeing_score NUMERIC CHECK (mental_wellbeing_score >= 0 AND mental_wellbeing_score <= 100),
  hydration_score NUMERIC CHECK (hydration_score >= 0 AND hydration_score <= 100),
  score_components JSONB DEFAULT '{}'::jsonb,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);

CREATE INDEX idx_wellness_scores_user ON wellness_scores(user_id, score_date DESC);
```

---

### Phase 2: Backend Services (Weeks 2-3)

#### 2.1 Health Data Aggregation Service
**File:** `backend/services/health_aggregation_service.py`

**Responsibilities:**
- Aggregate health data from multiple sources
- Normalize data formats across sources
- Handle data conflicts (priority: manual > device > connected apps)
- Cache aggregated data for performance

**Key Functions:**
```python
async def aggregate_health_data(user_id: str, start_date: date, end_date: date) -> Dict
async def get_health_data_by_category(user_id: str, category: str, period: str) -> List[Dict]
async def sync_connected_apps(user_id: str) -> Dict[str, bool]
async def normalize_health_metric(source: str, metric_type: str, value: float) -> Dict
```

#### 2.2 Wellness Analytics Engine
**File:** `backend/services/wellness_analytics_service.py`

**Responsibilities:**
- Calculate wellness scores
- Detect trends and patterns
- Generate correlations between metrics
- Identify improvement opportunities

**Key Functions:**
```python
async def calculate_wellness_score(user_id: str, date: date) -> Dict[str, float]
async def analyze_trends(user_id: str, metric_type: str, days: int) -> Dict
async def detect_correlations(user_id: str, days: int) -> List[Dict]
async def generate_insights(user_id: str, period: str) -> List[Dict]
async def get_improvement_opportunities(user_id: str) -> List[Dict]
```

#### 2.3 Insight Generation Service
**File:** `backend/services/insight_generation_service.py`

**Responsibilities:**
- Generate personalized insights
- Create actionable recommendations
- Link insights to goals
- Prioritize insights by impact

**Key Functions:**
```python
async def generate_insights(user_id: str, period: str) -> List[Insight]
async def create_actionable_recommendation(
    user_id: str, 
    metric_type: str, 
    current_value: float, 
    target_value: float
) -> Dict
async def generate_weekly_summary(user_id: str, week_start: date) -> Dict
async def generate_monthly_summary(user_id: str, month: int, year: int) -> Dict
```

#### 2.4 Goal Management Service
**File:** `backend/services/goal_management_service.py`

**Responsibilities:**
- Create and manage wellness goals
- Track goal progress
- Generate goal-based insights
- Suggest goal adjustments

**Key Functions:**
```python
async def create_goal(user_id: str, goal_data: Dict) -> Dict
async def update_goal_progress(user_id: str, goal_id: str) -> Dict
async def get_active_goals(user_id: str) -> List[Dict]
async def suggest_goals(user_id: str) -> List[Dict]
async def check_goal_achievements(user_id: str) -> List[Dict]
```

#### 2.5 Connected Apps Integration Service
**File:** `backend/services/connected_apps_service.py`

**Responsibilities:**
- Handle OAuth flows for connected apps
- Sync data from external sources
- Manage tokens and refresh logic
- Handle API rate limits

**Key Functions:**
```python
async def connect_google_fit(user_id: str, auth_code: str) -> Dict
async def connect_fitbit(user_id: str, auth_code: str) -> Dict
async def sync_google_fit_data(user_id: str) -> Dict
async def sync_fitbit_data(user_id: str) -> Dict
async def disconnect_app(user_id: str, app_name: str) -> bool
```

---

### Phase 3: Backend API Endpoints (Week 4)

#### 3.1 Enhanced Insights Endpoints
**File:** `backend/routers/insights_router.py`

```python
@router.get("/insights/wellness-score")
async def get_wellness_score(user_id: str, date: Optional[date] = None)

@router.get("/insights/detailed/{insight_id}")
async def get_insight_details(insight_id: str, user_id: str)

@router.get("/insights/monthly-summary")
async def get_monthly_summary(user_id: str, month: int, year: int)

@router.post("/insights/generate")
async def trigger_insight_generation(user_id: str, period: str = "weekly")
```

#### 3.2 Health Data Endpoints
**File:** `backend/routers/health_data_router.py`

```python
@router.post("/health/logs/manual")
async def log_manual_health_data(user_id: str, log_data: ManualHealthLog)

@router.get("/health/data/aggregated")
async def get_aggregated_health_data(
    user_id: str, 
    start_date: date, 
    end_date: date,
    categories: Optional[List[str]] = None
)

@router.get("/health/data/categories")
async def get_health_data_by_category(
    user_id: str, 
    category: str, 
    period: str = "week"
)
```

#### 3.3 Goals Endpoints
**File:** `backend/routers/goals_router.py`

```python
@router.post("/goals")
async def create_goal(user_id: str, goal: WellnessGoalCreate)

@router.get("/goals")
async def get_goals(user_id: str, status: Optional[str] = "active")

@router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, user_id: str, updates: WellnessGoalUpdate)

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str)

@router.get("/goals/suggestions")
async def get_goal_suggestions(user_id: str)

@router.get("/goals/{goal_id}/progress")
async def get_goal_progress(goal_id: str, user_id: str)
```

#### 3.4 Connected Apps Endpoints
**File:** `backend/routers/connected_apps_router.py`

```python
@router.get("/connected-apps")
async def get_connected_apps(user_id: str)

@router.post("/connected-apps/{app_name}/connect")
async def connect_app(user_id: str, app_name: str, auth_data: Dict)

@router.post("/connected-apps/{app_name}/sync")
async def sync_app_data(user_id: str, app_name: str)

@router.delete("/connected-apps/{app_name}/disconnect")
async def disconnect_app(user_id: str, app_name: str)
```

---

### Phase 4: Frontend Implementation (Weeks 5-7)

#### 4.1 Enhanced Insights Screen
**File:** `coresense/screens/InsightsScreen.tsx`

**New Features:**
- Wellness score display (circular progress ring)
- Category tabs (Sleep, Activity, Nutrition, Mental Wellbeing)
- Monthly summary view toggle
- Goal progress indicators
- Drill-down detail modals

**Components to Create:**
- `WellnessScoreCard.tsx` - displays overall wellness score
- `CategoryInsightsList.tsx` - filtered insights by category
- `MonthlySummaryView.tsx` - monthly summary display
- `InsightDetailModal.tsx` - detailed insight view
- `GoalProgressCard.tsx` - goal progress visualization

#### 4.2 Manual Health Logging
**File:** `coresense/screens/HealthLogScreen.tsx` (new)

**Features:**
- Mood logging (1-10 scale with emoji)
- Stress level logging
- Water intake tracking
- Nutrition quick log
- Custom health notes

**Components:**
- `MoodPicker.tsx`
- `StressLevelSlider.tsx`
- `WaterIntakeTracker.tsx`
- `QuickNutritionLog.tsx`

#### 4.3 Goals Management Screen
**File:** `coresense/screens/GoalsScreen.tsx` (new)

**Features:**
- View active goals
- Create new goals
- Edit/delete goals
- Goal progress visualization
- Goal suggestions

**Components:**
- `GoalCard.tsx`
- `GoalCreationForm.tsx`
- `GoalProgressChart.tsx`
- `GoalSuggestionsList.tsx`

#### 4.4 Connected Apps Screen
**File:** `coresense/screens/ConnectedAppsScreen.tsx` (new)

**Features:**
- List available apps
- Connect/disconnect apps
- Sync status indicators
- Last sync timestamps

**Components:**
- `AppConnectionCard.tsx`
- `SyncStatusIndicator.tsx`

#### 4.5 Enhanced Stores
**Files:**
- `coresense/stores/wellnessStore.ts` (new)
- `coresense/stores/goalsStore.ts` (new)
- `coresense/stores/connectedAppsStore.ts` (new)

**Updates:**
- `coresense/stores/healthStore.ts` - add manual logging support
- `coresense/stores/insightsStore.ts` - add wellness score, monthly summaries

---

### Phase 5: Analytics & Insight Generation Logic (Week 8)

#### 5.1 Wellness Score Calculation

**Algorithm:**
```python
def calculate_wellness_score(user_id: str, date: date) -> Dict:
    """
    Calculate overall wellness score (0-100) based on:
    - Sleep quality (25%)
    - Activity level (25%)
    - Nutrition (20%)
    - Mental wellbeing (20%)
    - Hydration (10%)
    """
    scores = {
        'sleep': calculate_sleep_score(user_id, date),
        'activity': calculate_activity_score(user_id, date),
        'nutrition': calculate_nutrition_score(user_id, date),
        'mental': calculate_mental_score(user_id, date),
        'hydration': calculate_hydration_score(user_id, date)
    }
    
    weights = {
        'sleep': 0.25,
        'activity': 0.25,
        'nutrition': 0.20,
        'mental': 0.20,
        'hydration': 0.10
    }
    
    overall = sum(scores[k] * weights[k] for k in scores)
    return {
        'overall': overall,
        'components': scores,
        'trend': calculate_trend(user_id, date)
    }
```

#### 5.2 Insight Generation Rules

**Sleep Insights:**
- If average sleep < 7 hours: "You slept 6 hours on average this week; try to aim for 7-8 hours to improve recovery."
- If sleep variance > 2 hours: "Your sleep schedule varies significantly. Consistency improves sleep quality."
- If sleep quality declining: "Your sleep duration has decreased 15% this week. Consider earlier bedtime."

**Activity Insights:**
- If steps < 10,000/day average: "You averaged 7,500 steps this week. Aim for 10,000 steps daily for optimal health."
- If activity declining: "Your activity decreased 20% this week. Try adding a 10-minute walk to your routine."

**Nutrition Insights:**
- If calories consistently low: "Your calorie intake is below recommended levels. Ensure balanced nutrition."
- If protein intake low: "Increase protein intake to support muscle recovery and energy levels."

**Mental Wellbeing Insights:**
- If stress levels high: "Your stress levels averaged 7/10 this week. Try 5-minute breathing exercises daily."
- If mood declining: "Your mood has been lower this week. Consider activities that bring you joy."

**Correlation Insights:**
- "When you sleep 8+ hours, your mood scores are 30% higher."
- "Days with 10,000+ steps correlate with better sleep quality."

#### 5.3 Goal-Based Recommendations

**Logic:**
- If user has active goal for steps: "You're 500 steps away from your daily goal. A 5-minute walk will get you there!"
- If goal progress declining: "Your progress toward [goal] has slowed. Here's a small step to get back on track..."
- If goal achieved: "Congratulations! You've achieved your [goal] goal. Ready to set a new challenge?"

---

### Phase 6: Notifications (Week 9)

#### 6.1 Push Notification Service
**File:** `backend/services/insight_notification_service.py`

**Features:**
- Daily insight summaries
- Goal progress updates
- Achievement notifications
- Weekly summary notifications

**Implementation:**
- Use Expo Push Notifications for mobile
- Schedule notifications based on user preferences
- Personalize notification content

#### 6.2 Notification Preferences
**Add to user_preferences table:**
```sql
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS insight_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS insight_notification_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS goal_reminders_enabled BOOLEAN DEFAULT true;
```

---

### Phase 7: Testing & Optimization (Week 10)

#### 7.1 Unit Tests
- Test wellness score calculations
- Test insight generation logic
- Test data aggregation
- Test goal tracking

#### 7.2 Integration Tests
- Test API endpoints
- Test data sync flows
- Test connected apps integration

#### 7.3 Performance Optimization
- Cache wellness scores
- Optimize database queries
- Implement pagination for insights
- Add data compression for large datasets

#### 7.4 User Testing
- Gather feedback on UI/UX
- Test insight relevance
- Validate goal suggestions
- Check notification timing

---

## Technical Considerations

### Data Privacy & Security
- Encrypt sensitive health data
- Secure OAuth tokens for connected apps
- Implement data retention policies
- Comply with HIPAA/GDPR if applicable

### Performance
- Cache wellness scores (recalculate daily)
- Use database indexes for queries
- Implement pagination for large datasets
- Background processing for insight generation

### Scalability
- Queue-based insight generation for large user base
- Batch processing for data aggregation
- Horizontal scaling for analytics service

### Error Handling
- Graceful degradation when external APIs fail
- Fallback to cached data when sync fails
- User-friendly error messages
- Retry logic for failed syncs

---

## Success Metrics

### User Engagement
- Daily active users on Insights screen
- Time spent viewing insights
- Insight save rate
- Goal creation rate

### Health Outcomes
- Improvement in wellness scores over time
- Goal completion rates
- Correlation between insights and behavior change

### Technical Metrics
- API response times < 500ms
- Insight generation time < 5 seconds
- Data sync success rate > 95%
- Notification delivery rate > 90%

---

## Dependencies

### Backend
- `pandas` - data analysis
- `numpy` - numerical calculations
- `scikit-learn` - ML for correlations (optional)
- `google-api-python-client` - Google Fit integration
- `fitbit` - Fitbit API client

### Frontend
- `react-native-chart-kit` - charts (already installed)
- `@react-native-async-storage/async-storage` - local storage
- `expo-notifications` - push notifications
- `date-fns` - date utilities (already installed)

### Database
- Supabase (already configured)
- PostgreSQL extensions for analytics (if needed)

---

## Risk Mitigation

### Data Quality
- Validate data from external sources
- Handle missing data gracefully
- Provide data quality indicators

### External API Failures
- Implement retry logic
- Cache last successful sync
- Show sync status to users

### Performance Issues
- Monitor query performance
- Implement caching strategies
- Optimize database indexes

### User Adoption
- Onboarding flow for Insights
- Tooltips and help text
- Progressive disclosure of features

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Database | 1 week | Schema updates, migrations |
| Phase 2: Backend Services | 2 weeks | Core services implementation |
| Phase 3: API Endpoints | 1 week | REST API endpoints |
| Phase 4: Frontend | 3 weeks | UI components and screens |
| Phase 5: Analytics | 1 week | Insight generation logic |
| Phase 6: Notifications | 1 week | Push notification system |
| Phase 7: Testing | 1 week | Tests and optimization |

**Total: 10 weeks**

---

## Next Steps

1. **Review and approve plan**
2. **Set up development environment**
3. **Create feature branch**
4. **Begin Phase 1: Database schema updates**
5. **Set up CI/CD for testing**

---

## Appendix: Example API Responses

### Wellness Score Response
```json
{
  "overall_score": 78,
  "sleep_score": 85,
  "activity_score": 72,
  "nutrition_score": 75,
  "mental_wellbeing_score": 80,
  "hydration_score": 70,
  "trend": "improving",
  "date": "2024-01-15"
}
```

### Insight Response
```json
{
  "id": "insight-123",
  "title": "Sleep Improvement Opportunity",
  "body": "You slept 6 hours on average this week; try to aim for 7-8 hours to improve recovery.",
  "category": "sleep",
  "trend": "down",
  "trend_value": "-15%",
  "actionable": true,
  "action_text": "Set bedtime reminder for 10 PM",
  "priority": 85,
  "related_goal_id": "goal-456"
}
```

### Goal Response
```json
{
  "id": "goal-456",
  "goal_type": "steps",
  "target_value": 10000,
  "current_value": 7500,
  "unit": "steps",
  "period": "daily",
  "progress_percentage": 75,
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z"
}
```

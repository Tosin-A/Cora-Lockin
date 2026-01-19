# Insights Screen Redesign

## Overview

The Insights screen has been redesigned to present personalized health insights in a clear, user-friendly layout with natural, conversational language that feels human-written rather than AI-generated.

## Key Design Principles

### 1. **Clear Visual Hierarchy**
- **Wellness Score** appears first (most important metric)
- **Key Insights** follow immediately (prioritized by importance)
- **Weekly Summary** provides context
- **Detailed Health Data** appears lower (supporting information)

### 2. **Natural Language**
- Technical phrases transformed into conversational language
- Uses "you" language instead of clinical descriptions
- Feels like a friend sharing insights, not a dashboard
- Examples:
  - ❌ "You slept 6.2 hours on average this week; try to aim for 7-8 hours to improve recovery"
  - ✅ "You've been getting about 6 hours of sleep. Try for 7-8 hours to feel more rested"

### 3. **Prioritized Insights**
- High-priority insights (declining trends, important categories) shown first
- Top 5 most important insights displayed prominently
- Additional insights grouped by category below

### 4. **Better Component Design**
- New `InsightCard` component with:
  - Category-based color coding
  - Clear visual hierarchy
  - Actionable buttons when applicable
  - Priority indicators (high priority cards have accent border)

## Components Created

### 1. `InsightCard` Component
**Location:** `coresense/components/InsightCard.tsx`

A new card component specifically designed for displaying insights:
- Category icons with color-coded backgrounds
- Natural language messages
- Trend indicators
- Action buttons for actionable insights
- Priority-based styling

### 2. `insightFormatter` Utility
**Location:** `coresense/utils/insightFormatter.ts`

Transforms technical insights into natural language:
- `formatInsight()` - Converts pattern data to formatted insight
- `makeConversational()` - Replaces technical phrases with natural ones
- `determinePriority()` - Assigns priority based on trend and category
- `groupInsightsByCategory()` - Organizes insights by category
- `getWellnessGreeting()` - Provides contextual greeting based on score

## Layout Structure

```
┌─────────────────────────────────┐
│ Header                          │
│ "Insights"                      │
│ "You're doing great!"           │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Wellness Score Card             │
│ Overall: 78/100                 │
│ [Component breakdowns]          │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ What I Noticed                  │
│ Here's what stands out...       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Insight Card 1 (High)       │ │
│ │ "You've been getting..."   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Insight Card 2 (Medium)     │ │
│ └─────────────────────────────┘ │
│ ...                             │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Weekly Summary Card             │
│ [Summary text]                  │
│ [Focus areas]                   │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Your Data                       │
│ Detailed breakdown...           │
│                                 │
│ Today's Stats                   │
│ Weekly Averages                 │
│ Charts                          │
└─────────────────────────────────┘
```

## Language Transformations

The formatter transforms technical language into natural conversation:

| Technical | Natural |
|-----------|---------|
| "aim for 7-8 hours" | "shoot for 7-8 hours" |
| "to improve recovery" | "to feel more rested" |
| "optimal health" | "feeling your best" |
| "excellent sleep patterns" | "really solid sleep" |
| "improvement opportunity" | "something to work on" |
| "helps identify patterns" | "helps you see what's working" |
| "stress-reduction techniques" | "ways to unwind" |
| "essential for health" | "super important" |

## Priority System

Insights are prioritized based on:
1. **Trend**: Declining trends get higher priority
2. **Category**: Sleep and mental health prioritized over others
3. **Actionability**: Insights with clear actions prioritized

Priority levels:
- **High**: Declining trends in sleep/mental health
- **Medium**: Stable trends in important categories
- **Low**: Positive trends or less critical categories

## User Experience Improvements

1. **Less Overwhelming**: Key insights shown first, details available below
2. **More Actionable**: Clear action buttons on relevant insights
3. **More Personal**: Language feels like a friend, not a medical report
4. **Better Scannable**: Visual hierarchy makes it easy to find what matters
5. **Contextual**: Greeting changes based on wellness score

## Technical Details

### Data Flow
1. Backend generates technical insights via `InsightGenerationService`
2. Frontend receives patterns via `coresenseApi.getInsights()`
3. `formatInsight()` transforms each pattern
4. Insights sorted by priority
5. Top 5 displayed prominently, rest grouped by category

### Performance
- Uses `useMemo` for expensive transformations
- Insights formatted only when data changes
- Grouping and prioritization cached

## Future Enhancements

Potential improvements:
1. **Personalization**: Learn user preferences for insight presentation
2. **Interactions**: Allow users to dismiss or customize insights
3. **Deep Linking**: Action buttons navigate to relevant screens
4. **Animations**: Smooth transitions when insights update
5. **Contextual Actions**: More specific action suggestions based on user history

## Files Modified

1. `coresense/screens/InsightsScreen.tsx` - Main screen redesign
2. `coresense/components/InsightCard.tsx` - New component
3. `coresense/utils/insightFormatter.ts` - New utility
4. `coresense/components/index.ts` - Export new component

## Testing Checklist

- [ ] Insights display correctly with natural language
- [ ] Priority ordering works (high → medium → low)
- [ ] Wellness score greeting changes based on score
- [ ] Action buttons appear on actionable insights
- [ ] Category grouping works correctly
- [ ] Empty states display properly
- [ ] Health data section appears below insights
- [ ] Refresh functionality works
- [ ] Save insight functionality works

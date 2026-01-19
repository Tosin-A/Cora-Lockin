# Apple Health Integration Plan

## Overview

This plan outlines the complete integration of Apple Health (HealthKit) into the CoreSense app, building on existing partial integration to create a robust, production-ready health data connection.

## Current State Analysis

### ✅ What Already Exists

1. **Basic HealthKit Integration**
   - `react-native-health` package installed (v1.19.0)
   - Basic health service (`coresense/utils/healthService.ts`)
   - Health store (`coresense/stores/healthStore.ts`)
   - HealthKit permission screen (`coresense/screens/HealthKitPermissionScreen.tsx`)
   - Info.plist has usage descriptions

2. **Current Capabilities**
   - Steps reading
   - Sleep duration reading
   - Active energy reading
   - Basic permission requests

### ❌ What's Missing

1. **iOS Configuration**
   - HealthKit capability not enabled in entitlements
   - Missing HealthKit background delivery setup
   - No background sync configuration

2. **Enhanced Data Types**
   - Heart rate
   - Heart rate variability
   - Blood pressure
   - Body measurements
   - Workout data
   - Nutrition data
   - Water intake

3. **Advanced Features**
   - Background data sync
   - Real-time updates
   - Data source prioritization
   - Error handling and retry logic
   - Data validation and sanitization

4. **User Experience**
   - Granular permission requests
   - Permission status checking
   - Settings deep linking
   - Better error messages

---

## Implementation Plan

### Phase 1: iOS Configuration (Day 1)

#### 1.1 Enable HealthKit Capability

**File:** `coresense/ios/CoreSense/CoreSense.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.applesignin</key>
    <array>
      <string>Default</string>
    </array>
    <!-- ADD THIS -->
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
  </dict>
</plist>
```

**Steps:**
1. Open Xcode project
2. Select project → Signing & Capabilities
3. Click "+ Capability"
4. Add "HealthKit"
5. Enable "HealthKit" checkbox

#### 1.2 Update Info.plist

**File:** `coresense/ios/CoreSense/Info.plist`

Add more detailed usage descriptions:

```xml
<key>NSHealthShareUsageDescription</key>
<string>CoreSense needs access to your health data to provide personalized coaching insights, track your wellness progress, and deliver actionable recommendations based on your activity, sleep, and health patterns.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>CoreSense needs permission to update your health data for tracking purposes, allowing you to log workouts, nutrition, and other wellness activities directly from the app.</string>
```

#### 1.3 Configure Background Modes

**File:** `coresense/ios/CoreSense/Info.plist`

Add background modes for health data updates:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>processing</string>
  <string>fetch</string>
</array>
```

#### 1.4 Update app.json

**File:** `coresense/app.json`

Ensure HealthKit is properly configured:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "CoreSense needs access to your health data to provide personalized coaching insights.",
        "NSHealthUpdateUsageDescription": "CoreSense needs access to update your health data for tracking purposes.",
        "UIBackgroundModes": ["processing", "fetch"]
      }
    },
    "plugins": [
      [
        "expo-health",
        {
          "healthSharePermission": "CoreSense needs access to your health data to provide personalized coaching insights.",
          "healthUpdatePermission": "CoreSense needs access to update your health data for tracking purposes."
        }
      ]
    ]
  }
}
```

---

### Phase 2: Enhanced Health Service (Day 1-2)

#### 2.1 Expand Health Data Types

**File:** `coresense/utils/healthService.ts`

Add support for additional health metrics:

```typescript
// New permissions
const extendedPermissions = {
  permissions: {
    read: [
      // Existing
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
      
      // New additions
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
      AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.BodyMassIndex,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.RespiratoryRate,
      AppleHealthKit.Constants.Permissions.OxygenSaturation,
      AppleHealthKit.Constants.Permissions.WorkoutType,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.FlightsClimbed,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      AppleHealthKit.Constants.Permissions.DietaryWater,
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
      AppleHealthKit.Constants.Permissions.DietaryProtein,
      AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
      AppleHealthKit.Constants.Permissions.DietaryFatTotal,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.WorkoutType,
      AppleHealthKit.Constants.Permissions.DietaryWater,
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
    ],
  },
};
```

#### 2.2 Add New Data Fetching Functions

```typescript
/**
 * Get heart rate data
 */
export const getHeartRate = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; value: number }>> => {
  // Implementation
};

/**
 * Get heart rate variability
 */
export const getHeartRateVariability = async (
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; value: number }>> => {
  // Implementation
};

/**
 * Get workout data
 */
export const getWorkouts = async (
  startDate: Date,
  endDate: Date
): Promise<Array<Workout>> => {
  // Implementation
};

/**
 * Get body measurements
 */
export const getBodyMeasurements = async (): Promise<BodyMeasurements> => {
  // Implementation
};

/**
 * Get nutrition data
 */
export const getNutritionData = async (
  startDate: Date,
  endDate: Date
): Promise<NutritionData> => {
  // Implementation
};

/**
 * Write water intake to HealthKit
 */
export const writeWaterIntake = async (
  amount: number,
  unit: 'ml' | 'fl oz',
  date?: Date
): Promise<boolean> => {
  // Implementation
};

/**
 * Write workout to HealthKit
 */
export const writeWorkout = async (
  workoutType: string,
  startDate: Date,
  endDate: Date,
  calories?: number,
  distance?: number
): Promise<boolean> => {
  // Implementation
};
```

#### 2.3 Add Permission Management

```typescript
/**
 * Check specific permission status
 */
export const checkPermissionStatus = async (
  permission: string
): Promise<'authorized' | 'denied' | 'not_determined'> => {
  // Implementation
};

/**
 * Request specific permissions
 */
export const requestSpecificPermissions = async (
  permissions: string[]
): Promise<Record<string, boolean>> => {
  // Implementation
};

/**
 * Open Health app settings
 */
export const openHealthSettings = async (): Promise<void> => {
  Linking.openURL('x-apple-health://');
};
```

#### 2.4 Add Background Sync Support

```typescript
/**
 * Set up background delivery for health data
 */
export const setupBackgroundDelivery = async (
  dataTypes: string[],
  callback: (data: any) => void
): Promise<boolean> => {
  // Implementation using HealthKit observer queries
};

/**
 * Enable background sync for specific data types
 */
export const enableBackgroundSync = async (
  dataTypes: string[]
): Promise<boolean> => {
  // Implementation
};
```

---

### Phase 3: Enhanced Health Store (Day 2)

#### 3.1 Expand Health Store

**File:** `coresense/stores/healthStore.ts`

Add new state and actions:

```typescript
interface HealthState {
  // Existing...
  
  // New data types
  heartRate: Array<{ date: Date; value: number }>;
  heartRateVariability: Array<{ date: Date; value: number }>;
  workouts: Workout[];
  bodyMeasurements: BodyMeasurements | null;
  nutritionData: NutritionData | null;
  
  // Permission management
  permissionStatus: Record<string, 'authorized' | 'denied' | 'not_determined'>;
  
  // Actions
  fetchHeartRate: (startDate: Date, endDate: Date) => Promise<void>;
  fetchWorkouts: (startDate: Date, endDate: Date) => Promise<void>;
  fetchBodyMeasurements: () => Promise<void>;
  fetchNutritionData: (startDate: Date, endDate: Date) => Promise<void>;
  writeWaterIntake: (amount: number, unit: string) => Promise<boolean>;
  writeWorkout: (workoutData: WorkoutData) => Promise<boolean>;
  checkPermissionStatus: (permission: string) => Promise<string>;
  requestSpecificPermissions: (permissions: string[]) => Promise<void>;
  openHealthSettings: () => Promise<void>;
}
```

---

### Phase 4: Enhanced Permission Screen (Day 2-3)

#### 4.1 Improve HealthKitPermissionScreen

**File:** `coresense/screens/HealthKitPermissionScreen.tsx`

**Enhancements:**
1. **Granular Permission Requests**
   - Show checkboxes for each data type
   - Allow users to select what to share
   - Explain why each permission is needed

2. **Better Error Handling**
   - Show specific error messages
   - Provide retry options
   - Link to iOS Settings

3. **Permission Status Display**
   - Show which permissions are granted/denied
   - Visual indicators for each data type
   - "Grant Missing Permissions" button

4. **Onboarding Flow**
   - Step-by-step permission requests
   - Educational content about each data type
   - Preview of how data will be used

**New Component Structure:**

```typescript
<HealthKitPermissionScreen>
  <PermissionCategory 
    title="Activity"
    description="Track your steps, workouts, and active energy"
    permissions={['steps', 'workouts', 'activeEnergy']}
  />
  <PermissionCategory 
    title="Sleep"
    description="Understand your sleep patterns for better recovery"
    permissions={['sleep']}
  />
  <PermissionCategory 
    title="Heart Health"
    description="Monitor heart rate and cardiovascular health"
    permissions={['heartRate', 'heartRateVariability']}
  />
  <PermissionCategory 
    title="Body Measurements"
    description="Track weight, BMI, and body composition"
    permissions={['weight', 'height', 'bmi']}
  />
  <PermissionCategory 
    title="Nutrition"
    description="Log meals and track nutritional intake"
    permissions={['nutrition', 'water']}
  />
</HealthKitPermissionScreen>
```

---

### Phase 5: Background Sync Service (Day 3)

#### 5.1 Create Background Sync Service

**File:** `coresense/services/healthBackgroundSync.ts`

```typescript
/**
 * Background Health Data Sync Service
 * Handles background updates and syncs data to backend
 */

import { AppState } from 'react-native';
import { getTodayHealthData, getWeeklyHealthData } from '../utils/healthService';
import { syncHealthMetrics } from '../utils/api';

class HealthBackgroundSync {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  /**
   * Start background sync
   */
  start(userId: string) {
    // Sync immediately
    this.sync(userId);

    // Set up periodic sync (every 15 minutes when app is active)
    this.syncInterval = setInterval(() => {
      if (AppState.currentState === 'active' && !this.isSyncing) {
        this.sync(userId);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Listen for app state changes
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !this.isSyncing) {
        this.sync(userId);
      }
    });
  }

  /**
   * Stop background sync
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync health data to backend
   */
  private async sync(userId: string) {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    try {
      const todayData = await getTodayHealthData();
      const weeklyData = await getWeeklyHealthData();

      // Prepare metrics for sync
      const metrics = [
        {
          metric_type: 'steps',
          value: todayData.steps,
          unit: 'count',
          recorded_at: new Date().toISOString(),
          source: 'healthkit',
        },
        {
          metric_type: 'sleep_duration',
          value: todayData.sleepHours,
          unit: 'hour',
          recorded_at: new Date().toISOString(),
          source: 'healthkit',
        },
        // Add more metrics...
      ];

      await syncHealthMetrics(metrics, userId);
    } catch (error) {
      console.error('Background sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const healthBackgroundSync = new HealthBackgroundSync();
```

---

### Phase 6: Data Validation & Error Handling (Day 3-4)

#### 6.1 Add Data Validation

**File:** `coresense/utils/healthDataValidator.ts`

```typescript
/**
 * Validate health data before syncing
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateHealthData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate steps
  if (data.steps !== undefined) {
    if (data.steps < 0) {
      errors.push('Steps cannot be negative');
    }
    if (data.steps > 100000) {
      warnings.push('Steps value seems unusually high');
    }
  }

  // Validate sleep
  if (data.sleepHours !== undefined) {
    if (data.sleepHours < 0) {
      errors.push('Sleep hours cannot be negative');
    }
    if (data.sleepHours > 24) {
      errors.push('Sleep hours cannot exceed 24');
    }
    if (data.sleepHours < 3) {
      warnings.push('Sleep duration is very low');
    }
  }

  // Validate heart rate
  if (data.heartRate !== undefined) {
    if (data.heartRate < 30 || data.heartRate > 220) {
      warnings.push('Heart rate value seems outside normal range');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
```

#### 6.2 Add Error Handling

**File:** `coresense/utils/healthErrorHandler.ts`

```typescript
/**
 * Handle HealthKit errors gracefully
 */

export enum HealthErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DATA_UNAVAILABLE = 'DATA_UNAVAILABLE',
  INVALID_DATA = 'INVALID_DATA',
  SYNC_FAILED = 'SYNC_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class HealthError extends Error {
  constructor(
    public type: HealthErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'HealthError';
  }
}

export const handleHealthError = (error: any): HealthError => {
  if (error.code === 'HKErrorAuthorizationNotDetermined') {
    return new HealthError(
      HealthErrorType.PERMISSION_DENIED,
      'HealthKit permissions not granted',
      error
    );
  }

  if (error.code === 'HKErrorAuthorizationDenied') {
    return new HealthError(
      HealthErrorType.PERMISSION_DENIED,
      'HealthKit access denied',
      error
    );
  }

  if (error.message?.includes('network')) {
    return new HealthError(
      HealthErrorType.NETWORK_ERROR,
      'Network error while syncing health data',
      error
    );
  }

  return new HealthError(
    HealthErrorType.SYNC_FAILED,
    'Failed to sync health data',
    error
  );
};
```

---

### Phase 7: Enhanced UI Components (Day 4)

#### 7.1 Create Permission Status Component

**File:** `coresense/components/HealthPermissionStatus.tsx`

```typescript
/**
 * Display HealthKit permission status
 */

export function HealthPermissionStatus() {
  // Show which permissions are granted/denied
  // Allow users to request missing permissions
  // Link to iOS Settings
}
```

#### 7.2 Create Health Data Source Component

**File:** `coresense/components/HealthDataSource.tsx`

```typescript
/**
 * Show data sources for health metrics
 * Display which apps/devices are providing data
 */
```

#### 7.3 Create Sync Status Component

**File:** `coresense/components/HealthSyncStatus.tsx`

```typescript
/**
 * Display sync status and last sync time
 * Show sync errors if any
 * Allow manual sync trigger
 */
```

---

### Phase 8: Testing & Documentation (Day 5)

#### 8.1 Testing Checklist

- [ ] Test permission requests on fresh install
- [ ] Test permission denial flow
- [ ] Test data reading for all data types
- [ ] Test data writing (water, workouts)
- [ ] Test background sync
- [ ] Test error handling
- [ ] Test data validation
- [ ] Test on physical device (HealthKit doesn't work in simulator)
- [ ] Test with real HealthKit data
- [ ] Test permission revocation and re-granting

#### 8.2 Documentation

- [ ] Update README with HealthKit setup instructions
- [ ] Document all available health data types
- [ ] Create troubleshooting guide
- [ ] Document permission flow
- [ ] Add code comments

---

## Technical Requirements

### Dependencies

**Already Installed:**
- `react-native-health` (v1.19.0) ✅

**May Need Updates:**
- Ensure latest version: `npm install react-native-health@latest`

### iOS Requirements

- **Minimum iOS Version:** 12.0 (already set)
- **HealthKit Availability:** iOS 8.0+
- **Device:** Physical device required (HealthKit doesn't work in simulator)
- **Capabilities:** HealthKit capability must be enabled

### Permissions Required

**Read Permissions:**
- Steps
- Active Energy
- Sleep Analysis
- Heart Rate
- Heart Rate Variability
- Blood Pressure
- Weight
- Height
- BMI
- Workouts
- Distance Walking/Running
- Flights Climbed
- Exercise Time
- Water Intake
- Nutrition (calories, protein, carbs, fat)

**Write Permissions:**
- Workouts
- Water Intake
- Nutrition

---

## Implementation Checklist

### Configuration
- [ ] Enable HealthKit capability in Xcode
- [ ] Update entitlements file
- [ ] Update Info.plist with detailed descriptions
- [ ] Configure background modes
- [ ] Update app.json

### Code Implementation
- [ ] Expand health service with new data types
- [ ] Add permission management functions
- [ ] Add background sync service
- [ ] Enhance health store
- [ ] Improve permission screen
- [ ] Add data validation
- [ ] Add error handling
- [ ] Create UI components

### Testing
- [ ] Test on physical iOS device
- [ ] Test all permission flows
- [ ] Test data reading/writing
- [ ] Test background sync
- [ ] Test error scenarios

### Documentation
- [ ] Update setup guide
- [ ] Document API
- [ ] Create troubleshooting guide

---

## Success Metrics

1. **Permission Grant Rate:** > 70% of users grant permissions
2. **Data Sync Success Rate:** > 95% successful syncs
3. **Background Sync:** Works reliably when app is backgrounded
4. **Error Rate:** < 5% error rate for health data operations
5. **User Satisfaction:** Users can easily understand and manage permissions

---

## Troubleshooting Guide

### Common Issues

1. **HealthKit not available**
   - Check if running on physical device (not simulator)
   - Verify iOS version >= 12.0
   - Check HealthKit capability is enabled

2. **Permissions denied**
   - User needs to grant in iOS Settings → Privacy → Health
   - Provide deep link to settings
   - Show clear instructions

3. **Data not syncing**
   - Check network connection
   - Verify backend API is accessible
   - Check error logs
   - Ensure user is authenticated

4. **Background sync not working**
   - Verify background modes are enabled
   - Check app state handling
   - Ensure sync service is started

---

## Next Steps

1. **Review and approve plan**
2. **Set up Xcode project**
3. **Enable HealthKit capability**
4. **Start with Phase 1 (Configuration)**
5. **Test incrementally**
6. **Deploy to TestFlight for testing**

---

## Timeline

- **Day 1:** iOS Configuration + Enhanced Health Service (basic)
- **Day 2:** Enhanced Health Store + Permission Screen improvements
- **Day 3:** Background Sync + Data Validation
- **Day 4:** UI Components + Error Handling
- **Day 5:** Testing + Documentation

**Total: 5 days**

---

## References

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [react-native-health Documentation](https://github.com/agencyenterprise/react-native-health)
- [HealthKit Best Practices](https://developer.apple.com/documentation/healthkit/protecting_user_privacy_in_healthkit)

# In-App Purchase (StoreKit) Setup

CoreSense uses **In-App Purchase** on iOS to comply with App Store guidelines. Android and web continue to use Stripe.

## App Store Connect Setup

### 1. Create the subscription product

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Your App → **Subscriptions**
2. Create a **Subscription Group** (e.g. "CoreSense Pro")
3. Create a **Subscription** with:
   - **Product ID**: `com.coresense.app.pro_monthly` (must match `coresense/constants/iap.ts`)
   - **Reference Name**: CoreSense Pro Monthly
   - **Duration**: 1 month
   - **Price**: £8.99 (or your chosen price)
4. Set status to **Ready to Submit** — products must be in this state for the app to fetch them. "SKU not found" usually means the product isn't created or isn't Ready to Submit.

### 2. App-Specific Shared Secret

1. App Store Connect → Your App → **App Information** → **App-Specific Shared Secret**
2. Generate a new secret
3. Add to your backend environment:
   ```
   APPLE_SHARED_SECRET=your_shared_secret_here
   ```

### 3. In-App Purchase capability

The `react-native-iap` plugin should add this. If not:

1. Open `coresense/ios/CoreSense.xcworkspace` in Xcode
2. Select the app target → **Signing & Capabilities**
3. Click **+ Capability** → add **In-App Purchase**

## Backend

1. Run the migration:
   ```bash
   # Apply backend/migrations/031_subscriptions_iap_columns.sql
   ```

2. Set `APPLE_SHARED_SECRET` in your production environment (Railway, etc.)

## Testing

- Use **Sandbox** test accounts (App Store Connect → Users and Access → Sandbox)
- Receipts are verified against Apple's sandbox first, then production
- Test the full flow: purchase → verify → Pro access

## Troubleshooting: "Pro subscription not found"

When the app can't load the product, verify:

| Check | Where |
|-------|-------|
| Product exists | App Store Connect → Your App → **Subscriptions** → Subscription Group → Subscription |
| Product ID exact match | `com.coresense.app.pro_monthly` (no typos) |
| Status is Ready to Submit | Product must not be in "Missing Metadata" or "Prepare for Submission" |
| Paid Apps Agreement | App Store Connect → **Agreements, Tax, and Banking** → Paid Apps (must be Active) |
| Banking & tax | Complete in Agreements section |
| In-App Purchase capability | Xcode → Target → Signing & Capabilities → **In-App Purchase** |
| Bundle ID matches | App uses `com.coresense.app`; product ID should start with that |
| Physical device | Simulator does not support IAP |
| Sandbox account | Sign out of App Store on device; use Sandbox tester when prompted |

**First-time setup:** Products can take a few hours to propagate. If everything is correct, wait and retry.

## Flow summary

| Platform | Purchase flow | Manage/Cancel |
|----------|---------------|---------------|
| iOS | StoreKit IAP → backend verify receipt → Pro | App Store Settings |
| Android | Not available — shows "Pro on iOS" | — |

**IAP only.** No Stripe. Pro limits: 10 messages/day, 30/week (vs Free: 5/day, 15/week).

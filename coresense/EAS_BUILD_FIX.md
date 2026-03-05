# Fix EAS Build Exit Code 65 (Code Signing)

## Error
```
"CoreSense" has entitlements that require signing with a development certificate.
Enable development signing in the Signing & Capabilities editor.
```

## Cause
The provisioning profile doesn't include all required entitlements (HealthKit, In-App Purchase, Push Notifications). This often happens after adding new capabilities like IAP.

## Fix: Regenerate Provisioning Profile

1. **Open credentials:**
   ```bash
   cd coresense
   eas credentials --platform ios
   ```

2. **Regenerate provisioning profile:**
   - Select **Production** (or **Preview** if building for TestFlight)
   - Choose **Provisioning Profile**
   - Select **Remove** (or **Set up a new provisioning profile**)
   - Run a new build — EAS will create a fresh profile with all entitlements

3. **Ensure App ID has capabilities:**
   - Go to [Apple Developer Portal](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers**
   - Select your App ID (`com.coresense.app`)
   - Ensure these are enabled:
     - **HealthKit**
     - **In-App Purchase**
     - **Push Notifications**
   - If you added any, click **Save**

4. **Rebuild:**
   ```bash
   eas build --platform ios --profile production
   ```

## Alternative: Clear and Rebuild Credentials

```bash
eas credentials --platform ios
# Choose Production → Provisioning Profile → Remove
# Then run build — EAS will regenerate
eas build --platform ios --profile production
```

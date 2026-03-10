# App Store Resubmission Checklist (v1.0.1)

Based on Apple's rejection of v1.0 (March 10, 2026).

---

## Code Changes (Done)

- [x] Display subscription price prominently in Pro section (fetched from StoreKit)
- [x] Show full subscription terms (billing amount, renewal, cancellation policy)
- [x] Add functional Terms of Use link (`https://coresense.online/terms`)
- [x] Add functional Privacy Policy link (`https://coresense.online/privacy`)
- [x] Upgrade button shows billed amount ("Subscribe for $X.XX/month")
- [x] Fix icon rendering — preload Ionicons font in App.tsx
- [x] Bundle Ionicons.ttf natively via expo-font plugin
- [x] Bump version to 1.0.1

## App Store Connect — Before Submitting

- [ ] **IAP Product**: Ensure `com.coresense.app.pro_monthly` subscription is created with pricing, description, and review screenshot
- [ ] **Link IAP to version**: Go to version 1.0.1 page → "In-App Purchases and Subscriptions" section → attach the subscription product
- [ ] **Privacy Policy URL**: Add `https://coresense.online/privacy` in the Privacy Policy field
- [ ] **Terms of Use (EULA)**: Add `https://coresense.online/terms` in the EULA field or App Description
- [ ] **Verify links work**: Open both URLs in a browser and confirm they load correctly

## App Preview Video

- [ ] Re-record or re-edit app preview to remove device frames/images
- [ ] Use only raw screen capture (narration and text overlays are fine)
- [ ] Upload updated preview in App Store Connect → Previews and Screenshots

## Build & Submit

- [ ] Run `eas build --platform ios --profile production`
- [ ] Run `eas submit --platform ios` after build completes
- [ ] Verify new binary appears as version 1.0.1 in App Store Connect

## Final Checks Before Submitting for Review

- [ ] IAP product is linked to version 1.0.1
- [ ] App preview has no device frames
- [ ] Privacy Policy and Terms URLs are in metadata and functional
- [ ] Test the subscription flow on a physical device with a sandbox account
- [ ] Confirm icons render correctly in the new build

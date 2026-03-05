# Pro Features Implementation Plan

## Overview (Implemented)

In-app Pro features:
1. **Higher usage limits** for Pro users: 10/day, 30/week (vs Free: 5/day, 15/week)
2. **No customizable limits** — fixed Pro limits
3. **Bright Blue "Pro" pill** on the account card in Settings when subscribed
4. **IAP only** — no Stripe; Pro via In-App Purchase on iOS

---

## Implemented

| Area | Implementation |
|------|----------------|
| Backend | `upgrade_to_pro`, `downgrade_from_pro` in `message_limit_service.py`; Pro: 10/day, 30/week |
| Subscription | IAP only; Android shows "Pro on iOS" |
| Settings | Pro pill (#007AFF) on account card when `isPro` |
| AppNavigator | Loads subscription status on auth |

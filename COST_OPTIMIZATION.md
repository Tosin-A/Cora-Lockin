# LLM Cost Optimization

> **Status update:** CoreSense has migrated from OpenAI to **Groq** (`llama-3.3-70b-versatile`). Groq is roughly **20–60× cheaper** than the GPT-4 family that the original plan below assumed, so most of the Week-1 savings ideas no longer apply. The Groq-era priorities are at the top; the historical OpenAI plan is preserved further down for context.

---

## Part 1 — Groq-era optimization (current)

### What the migration already changed

| Before (OpenAI) | After (Groq) |
|---|---|
| OpenAI Responses + Conversations API | Groq Chat Completions |
| Assistant API overhead (~3–5× completions) | Single completion per turn |
| Threads grew forever | Manual replay capped at `MAX_HISTORY_MESSAGES = 20` |
| Function defs sent every call | Tool schemas still sent — same overhead |
| Model: GPT-4o-mini / GPT-4 | `llama-3.3-70b-versatile` (~$0.59/M in, $0.79/M out) |

Estimated baseline cost on Groq: ≪ $0.001/message at typical traffic.

### Remaining levers worth pulling

1. **Trim history more aggressively** — `MAX_HISTORY_MESSAGES` in `backend/services/conversation_management.py` is currently 20. Drop to 10 for short conversations; summarize older turns into a single system note when crossing a threshold.

2. **Two-tier model routing** — `model_router.py` already classifies messages:
   - `llama-3.1-8b-instant` for greetings, check-ins, celebrations, support (~10× cheaper)
   - `llama-3.3-70b-versatile` for deep coaching, pattern analysis, goal setting
   It is **not currently wired** into `conversation_management.send_message()`. Hooking it in is a ~30-line change.

3. **Tool schema diet** — five function defs (~500 tokens) ship on every request. For greetings/check-ins, send `tools=[]`.

4. **Skip the LLM for trivial messages** — return canned replies for "hi", "thanks", "ok" (~15% of traffic typically).

5. **Cache near-duplicate responses** — Groq is fast, but cache hits are still free. A simple hash-of-last-message cache with a short TTL covers retries and double-taps.

### Recommended order

| Optimization | Effort | Expected impact |
|---|---|---|
| Wire `model_router` into `send_message` | 1 hr | ~50% on routed traffic |
| Trim tool schema for cheap tiers | 30 min | ~5% tokens |
| Pattern responder for trivial messages | 2–4 hrs | ~15% of calls free |
| Lower `MAX_HISTORY_MESSAGES` to 10 | 5 min | ~20% input tokens |
| Response cache (Supabase or in-memory) | 4 hrs | depends on retry rate |

---

## Part 2 — Historical OpenAI plan (for context)

> Kept verbatim-in-spirit so the rationale and metric-tracking SQL are not lost. **Cost numbers and Assistant-API tactics are obsolete under Groq.**

### What was happening on OpenAI

- Assistant API for **all** messages (3–5× cost of completions)
- Persistent threads, never pruned → growing input tokens
- 500+ tokens of function defs sent every request
- Likely GPT-4 for everything (vs the much cheaper GPT-4o-mini)

### Original short-term plan (2 weeks, ~55–60% savings target)

| Optimization | Savings | Effort |
|---|---|---|
| Remove unused function defs | 5% | 2 hrs |
| Pattern-based responses for "hey", "done", "sup" | 15% | 1 day |
| Hybrid API: Assistant for deep, Completions for simple | 35% | 2 days |
| Integrate `model_router` | 20% | 2 days |
| Thread pruning | 10% | 3 days |

### Original long-term plan (3–6 months, additional 30–40%)

| Optimization | Savings | Timeline |
|---|---|---|
| Fine-tuned model | 50% | 3–6 months |
| Semantic caching | 10% | 2–3 months |
| Context optimization | 5% | 2 months |
| Batch processing | 5% | 4 months |

### Original cost projection (1,000 messages/day)

```
Baseline:               $9/day  → $270/mo  → $3,285/yr
After Week 1 plan:      $2.70/day → $81/mo  → $986/yr     (70% reduction)
After Month 6 plan:     $0.83/day → $25/mo  → $303/yr     (91% reduction)
```

Under Groq, **even the unoptimized baseline is well below the Week-1 OpenAI target.**

### Monitoring SQL (still useful, schema-dependent)

```sql
-- Daily call volume and cost
SELECT DATE(created_at) AS date,
       COUNT(*)                                     AS total_calls,
       COUNT(*) FILTER (WHERE cached = true)        AS cache_hits,
       SUM(estimated_cost)                          AS daily_cost
FROM ai_call_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

(Requires an `ai_call_logs` table; not currently created in `backend/migrations/`. If you want cost tracking under Groq, that table needs to be added and `conversation_management.send_message()` needs to log per-call.)

### Risk mitigation principles (still valid)

- Keep a fallback path so any optimization can be disabled via a feature flag.
- Roll out gradually (10% → 50% → 100%) and monitor.
- Quality > cost — if reply quality degrades, dial back routing aggressiveness.
- Don't cache responses with user-specific data without per-user scoping.

---

## TL;DR

- **Don't** copy-paste the OpenAI Week-1 plan; the assumptions don't apply anymore.
- **Do** wire `model_router` into the Groq call path — it's the only remaining ~50% lever and it's already half-built.
- **Maybe** add a pattern responder for trivial messages if traffic grows; otherwise it isn't worth the complexity at current Groq prices.

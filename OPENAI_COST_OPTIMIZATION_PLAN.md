# OpenAI Cost Optimization Plan

## Executive Summary

**Current State:** The backend uses OpenAI Assistant API (`asst_vb5GaGjEUo5REgjBrTYADHKf`) with persistent threads for every user. Each interaction incurs Assistant API costs, function calling overhead, and thread context management costs.

**Projected Savings:**
- **Short-term (0-2 weeks):** 40-60% cost reduction
- **Long-term (2-6 months):** 70-85% cost reduction

---

## Current Cost Drivers (Analysis)

### 1. **Assistant API Overhead** ⚠️ HIGH IMPACT
- **Problem:** Assistant API charges for:
  - Thread storage and retrieval
  - Function calling overhead
  - Full thread context on every run
  - Assistant configuration overhead
- **Cost:** ~3-5x more expensive than Completions API for simple messages
- **Volume:** 100% of messages use Assistant API

### 2. **Persistent Thread Context** ⚠️ HIGH IMPACT
- **Problem:** Every user has a persistent thread that grows indefinitely
- **Location:** `thread_management.py:107-132`
- **Cost:** Input tokens grow with each message (context window pollution)
- **Current Behavior:** No thread pruning or context window management

### 3. **Model Router Not Integrated** ⚠️ MEDIUM IMPACT
- **Problem:** `model_router.py` exists but isn't used by assistant
- **Location:** `coaching_service.py:217-222` - hardcoded assistant ID
- **Cost:** All messages use the same model (likely GPT-4 or GPT-4-turbo)
- **Opportunity:** 80% of messages could use GPT-4o-mini or GPT-3.5-turbo

### 4. **Function Calling Overhead** ⚠️ MEDIUM IMPACT
- **Problem:** Function definitions sent with every request
- **Location:** `thread_management.py:47-105` (3 function definitions)
- **Cost:** ~500 tokens per request for function schemas
- **Usage:** Functions rarely called but always declared

### 5. **Minimal Caching** ⚠️ MEDIUM IMPACT
- **Problem:** Response cache exists but underutilized
- **Location:** `response_cache.py` - only 24hr TTL, no aggressive strategies
- **Current:** Hash-based caching only
- **Opportunity:** Semantic similarity caching, pattern-based responses

### 6. **No Token Tracking** ⚠️ LOW IMPACT
- **Problem:** Cost control service doesn't track actual API token usage
- **Location:** `cost_control.py:141-210` - uses estimates only
- **Effect:** Can't optimize based on real usage patterns

---

## Short-Term Optimizations (0-2 weeks)
**Target: 40-60% cost reduction**

### Priority 1: Hybrid API Approach (IMMEDIATE - 35% savings)

**Strategy:** Use Completions API for 80% of messages, Assistant API for 20%

**Implementation:**

```python
# New service: services/api_selector.py

class APISelector:
    """Intelligently routes between Completions and Assistant API"""
    
    def should_use_assistant_api(self, message: str, user_context: dict) -> bool:
        """
        Use Assistant API ONLY for:
        1. First 3 messages (relationship building)
        2. Complex coaching (goal setting, pattern analysis)
        3. When user explicitly asks for memory recall
        4. When function calling needed
        """
        
        # Simple pattern matching for complex topics
        complex_indicators = [
            'why do i', 'help me understand', 'analyze', 
            'pattern', 'goal', 'plan', 'strategy'
        ]
        
        if any(indicator in message.lower() for indicator in complex_indicators):
            return True
            
        # Check message count - use Assistant for first 3 messages
        if user_context.get('message_count', 0) < 3:
            return True
            
        # Default to Completions API (cheaper)
        return False
```

**Changes Required:**
1. Create `services/api_selector.py` ✅
2. Create `services/completions_service.py` for simple messages ✅
3. Modify `coaching_service.py:168-280` to route between APIs ✅
4. Update `thread_management.py` to support both modes ✅

**Estimated Savings:** 35% (80% of messages at 1/5th the cost)

---

### Priority 2: Aggressive Response Caching (IMMEDIATE - 15% savings)

**Strategy:** Cache common patterns and similar questions

**Implementation:**

```python
# Enhance: services/response_cache.py

class EnhancedResponseCache:
    """Multi-strategy caching for cost reduction"""
    
    def __init__(self):
        self.pattern_cache = {
            # Pre-populate common responses
            'greeting_morning': ["What's the plan today?", "Morning. What u working on?"],
            'greeting_evening': ["How'd today go?", "What got done today?"],
            'check_in_simple': ["Talk to me", "What's up?", "What's going on?"],
            'celebration_streak': ["Nice streak bro", "Keep it going", "U got this"],
        }
        
    def get_pattern_match(self, message: str, context: dict) -> Optional[str]:
        """Match message to common patterns"""
        message_lower = message.lower()
        
        # Morning greeting
        if any(word in message_lower for word in ['morning', 'hello', 'hey']) and \
           context.get('time_of_day') == 'morning':
            return random.choice(self.pattern_cache['greeting_morning'])
            
        # Evening check-in
        if any(word in message_lower for word in ['evening', 'tonight', 'today']) and \
           context.get('time_of_day') == 'evening':
            return random.choice(self.pattern_cache['greeting_evening'])
            
        # Simple check-ins
        if message_lower in ['hi', 'hey', 'hello', 'sup', 'yo']:
            return random.choice(self.pattern_cache['check_in_simple'])
            
        # Celebration for streaks
        if context.get('current_streak', 0) >= 7 and \
           any(word in message_lower for word in ['done', 'did it', 'completed']):
            return random.choice(self.pattern_cache['celebration_streak'])
            
        return None
    
    def cache_with_similarity(self, message: str, response: str):
        """Cache with semantic similarity (future: use embeddings)"""
        # For now, use simple keyword-based similarity
        keywords = self._extract_keywords(message)
        cache_key = '_'.join(sorted(keywords))
        # Store in existing cache with longer TTL for patterns
```

**Changes Required:**
1. Enhance `response_cache.py` with pattern matching ✅
2. Add pattern-based responses to avoid API calls ✅
3. Increase cache TTL to 7 days for common patterns ✅
4. Add cache hit tracking to `cost_control.py` ✅

**Estimated Savings:** 15% (catching 20-30% of messages with patterns)

---

### Priority 3: Integrate Model Router (WEEK 1 - 20% savings)

**Strategy:** Actually use the model router you already built!

**Problem:** `model_router.py` exists but `coaching_service.py` doesn't use it

**Implementation:**

```python
# Modify: services/coaching_service.py

async def chat(self, user_id: str, message: str, ...):
    # ... existing code ...
    
    # BEFORE: Always use same assistant
    # result = await self.thread_manager.run_assistant(thread_id, user_id, ...)
    
    # AFTER: Route based on complexity
    message_type = model_router.classify_message(message, context)
    
    if model_router.should_use_assistant_api(message_type):
        # Use Assistant API (current behavior)
        result = await self.thread_manager.run_assistant(...)
    else:
        # Use cheaper Completions API
        result = await completions_service.get_response(
            user_id=user_id,
            message=message,
            model="gpt-4o-mini",  # 60x cheaper than GPT-4
            max_tokens=150
        )
```

**Changes Required:**
1. Modify `coaching_service.py:216-222` to use model_router ✅
2. Update `thread_management.py` to accept model parameter ✅
3. Add Completions API fallback in new service ✅

**Estimated Savings:** 20% (most messages use GPT-4o-mini instead of GPT-4)

---

### Priority 4: Thread Context Pruning (WEEK 2 - 10% savings)

**Strategy:** Limit thread context to last 20 messages + summary

**Problem:** Threads grow indefinitely, input tokens increase over time

**Implementation:**

```python
# Enhance: services/thread_management.py

class ThreadManagementService:
    
    MAX_THREAD_MESSAGES = 20  # Keep last 20 messages
    
    async def prune_thread_if_needed(self, thread_id: str, user_id: str):
        """Prune old messages from thread to reduce token usage"""
        
        # Get all messages
        messages = self.client.beta.threads.messages.list(thread_id=thread_id)
        
        if len(messages.data) <= self.MAX_THREAD_MESSAGES:
            return  # No pruning needed
            
        # Keep last 20 messages
        messages_to_keep = messages.data[:self.MAX_THREAD_MESSAGES]
        
        # Summarize older messages
        older_messages = messages.data[self.MAX_THREAD_MESSAGES:]
        summary = await self._summarize_old_messages(older_messages)
        
        # Store summary in user_memories table
        await self._store_conversation_summary(user_id, summary)
        
        # Delete old messages from thread (OpenAI doesn't support this)
        # Alternative: Create new thread and copy last 20 messages + summary
        new_thread_id = await self._create_thread_with_summary(
            user_id, messages_to_keep, summary
        )
        
        # Update thread mapping
        await self._update_thread_mapping(user_id, new_thread_id)
        
        logger.info(f"Pruned thread for {user_id}: {len(older_messages)} messages archived")
        
    async def _create_thread_with_summary(self, user_id: str, recent_messages: list, summary: str):
        """Create new thread with summary + recent messages"""
        new_thread = self.client.beta.threads.create()
        
        # Add summary as system message
        self.client.beta.threads.messages.create(
            thread_id=new_thread.id,
            role="assistant",
            content=f"[Conversation History Summary]\n{summary}"
        )
        
        # Add recent messages (in reverse order to maintain chronology)
        for msg in reversed(recent_messages):
            self.client.beta.threads.messages.create(
                thread_id=new_thread.id,
                role=msg.role,
                content=msg.content[0].text.value
            )
            
        return new_thread.id
```

**Changes Required:**
1. Add `prune_thread_if_needed()` to `thread_management.py` ✅
2. Call pruning before each run if thread > 20 messages ✅
3. Add conversation summarization to `memory_summarizer.py` ✅

**Estimated Savings:** 10% (reduce average input tokens by 40%)

---

### Priority 5: Remove Unnecessary Function Definitions (QUICK WIN - 5% savings)

**Strategy:** Only include function definitions when needed

**Problem:** 3 function definitions (~500 tokens) sent with EVERY request

**Implementation:**

```python
# Modify: services/thread_management.py

async def run_assistant(self, thread_id: str, user_id: str, include_functions: bool = False):
    """Run assistant with optional function calling"""
    
    tools = []
    if include_functions:
        tools = self.functions  # Only include when needed
    
    run = self.client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=self.assistant_id,
        tools=tools  # Empty list most of the time
    )
```

**Changes Required:**
1. Modify `thread_management.py:163-168` to conditionally include functions ✅
2. Only include functions for deep coaching sessions ✅

**Estimated Savings:** 5% (500 tokens saved per simple request)

---

## Long-Term Optimizations (2-6 months)
**Target: Additional 30-40% cost reduction (70-85% total)**

### Priority 6: Fine-Tuned Model (3-6 months - 50% additional savings)

**Strategy:** Train custom GPT-4o-mini on your coaching style

**Benefits:**
- 10x cheaper than GPT-4 ($0.30 vs $30 per 1M tokens)
- Faster response times
- Consistent personality without complex prompts
- No function calling needed (internalize memory access patterns)

**Implementation:**

1. **Data Collection (Month 1-2):**
   ```sql
   -- Extract successful coaching conversations
   SELECT m.content, m.direction, m.sender_type, m.created_at
   FROM messages m
   WHERE m.userid IN (
     SELECT user_id FROM user_message_limits WHERE messages_used > 5
   )
   ORDER BY m.userid, m.created_at;
   ```

2. **Format for Fine-tuning (Month 2):**
   ```python
   # Create training data in OpenAI format
   def create_fine_tuning_data():
       conversations = get_successful_conversations()
       
       training_data = []
       for conv in conversations:
           # Extract user message -> coach response pairs
           for user_msg, coach_response in extract_pairs(conv):
               training_data.append({
                   "messages": [
                       {"role": "system", "content": COACH_SYSTEM_PROMPT},
                       {"role": "user", "content": user_msg},
                       {"role": "assistant", "content": coach_response}
                   ]
               })
       
       # Save to JSONL
       with open('coach_training_data.jsonl', 'w') as f:
           for item in training_data:
               f.write(json.dumps(item) + '\n')
   ```

3. **Train Model (Month 3):**
   ```python
   # Upload training data
   openai.files.create(
       file=open("coach_training_data.jsonl", "rb"),
       purpose="fine-tune"
   )
   
   # Start fine-tuning job
   openai.fine_tuning.jobs.create(
       training_file="file-abc123",
       model="gpt-4o-mini-2024-07-18",
       hyperparameters={
           "n_epochs": 3
       }
   )
   ```

4. **A/B Test (Month 4-5):**
   - Route 10% of traffic to fine-tuned model
   - Compare quality metrics (user satisfaction, streak retention)
   - Gradually increase to 100%

**Estimated Savings:** 50% additional (10x cheaper model for 80% of messages)

---

### Priority 7: Semantic Caching with Embeddings (2-3 months - 10% additional savings)

**Strategy:** Use embeddings to cache semantically similar responses

**Implementation:**

```python
# New service: services/semantic_cache.py

import openai
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SemanticCache:
    """Cache responses based on semantic similarity"""
    
    SIMILARITY_THRESHOLD = 0.85  # High similarity required
    
    async def get_similar_cached_response(self, message: str, user_id: str) -> Optional[str]:
        """Find cached response for semantically similar message"""
        
        # Get embedding for current message (cheap: $0.00002 per 1K tokens)
        embedding = await self._get_embedding(message)
        
        # Query cached embeddings from DB
        cached_items = await self._get_cached_embeddings(user_id)
        
        # Calculate similarities
        best_match = None
        best_similarity = 0
        
        for cached_item in cached_items:
            similarity = cosine_similarity(
                [embedding], 
                [cached_item['embedding']]
            )[0][0]
            
            if similarity > best_similarity and similarity >= self.SIMILARITY_THRESHOLD:
                best_similarity = similarity
                best_match = cached_item
        
        if best_match:
            logger.info(f"Semantic cache hit: {best_similarity:.2f} similarity")
            return best_match['response']
            
        return None
    
    async def _get_embedding(self, text: str) -> list:
        """Get embedding from OpenAI (text-embedding-3-small)"""
        response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
```

**Database Changes:**
```sql
-- Add embeddings to cache table
ALTER TABLE ai_response_cache ADD COLUMN embedding vector(1536);

-- Create index for similarity search
CREATE INDEX ON ai_response_cache USING ivfflat (embedding vector_cosine_ops);
```

**Estimated Savings:** 10% additional (catch semantically similar queries)

---

### Priority 8: Context Window Optimization (2 months - 5% additional savings)

**Strategy:** Dynamically adjust context based on message complexity

**Implementation:**

```python
# Enhance: services/context_service.py

class SmartContextService:
    """Dynamically adjust context based on message needs"""
    
    def get_context_for_message(self, message: str, user_id: str) -> dict:
        """
        Simple messages get minimal context.
        Complex messages get full context.
        """
        
        message_type = model_router.classify_message(message)
        
        if message_type in [MessageType.GREETING, MessageType.CHECK_IN]:
            # Minimal context: just name and streak
            return {
                'user_name': get_user_name(user_id),
                'current_streak': get_current_streak(user_id)
            }
        elif message_type in [MessageType.DEEP_COACHING, MessageType.PATTERN_ANALYSIS]:
            # Full context: everything
            return {
                'user_name': get_user_name(user_id),
                'current_streak': get_current_streak(user_id),
                'longest_streak': get_longest_streak(user_id),
                'active_commitments': get_active_commitments(user_id),
                'recent_patterns': get_recent_patterns(user_id),
                'mood_signals': get_recent_mood_signals(user_id)
            }
        else:
            # Medium context: name, streak, commitments
            return {
                'user_name': get_user_name(user_id),
                'current_streak': get_current_streak(user_id),
                'active_commitments': get_active_commitments(user_id)
            }
```

**Estimated Savings:** 5% additional (reduce context size by 50% for simple messages)

---

### Priority 9: Batch Processing for Low-Priority Messages (4 months - 5% additional savings)

**Strategy:** Batch non-urgent messages to reduce per-request overhead

**Use Cases:**
- Weekly summaries
- Pattern analysis
- Mood trend reports
- Batch notifications

**Implementation:**

```python
# New service: services/batch_processor.py

class BatchProcessor:
    """Batch process low-priority AI tasks"""
    
    async def queue_batch_task(self, user_id: str, task_type: str, data: dict):
        """Queue task for batch processing"""
        await supabase.table('batch_queue').insert({
            'user_id': user_id,
            'task_type': task_type,
            'data': data,
            'status': 'pending'
        })
    
    async def process_batch(self):
        """Process all pending batch tasks in one API call"""
        
        tasks = await supabase.table('batch_queue').select('*').eq('status', 'pending').limit(50)
        
        if not tasks:
            return
        
        # Create batch prompt
        batch_prompt = self._create_batch_prompt(tasks)
        
        # Single API call for all tasks
        response = await openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a batch processor for coaching insights."},
                {"role": "user", "content": batch_prompt}
            ]
        )
        
        # Parse and distribute results
        results = self._parse_batch_response(response.choices[0].message.content)
        await self._save_batch_results(tasks, results)
```

**Estimated Savings:** 5% additional (reduce overhead for batch-able tasks)

---

### Priority 10: Smart Rate Limiting by Cost (1 month - Implementation)

**Strategy:** Rate limit based on actual cost, not message count

**Problem:** Current limit is 10 messages for free users, but not all messages cost the same

**Implementation:**

```python
# Enhance: services/message_limit_service.py

class CostBasedLimiting:
    """Rate limit based on actual API cost, not message count"""
    
    FREE_TIER_BUDGET = 0.10  # $0.10 per month for free users
    PRO_TIER_BUDGET = 10.00  # $10.00 per month for pro users
    
    def check_budget_limit(self, user_id: str, estimated_cost: float) -> tuple[bool, str]:
        """Check if user has budget for this request"""
        
        usage = get_user_cost_usage(user_id)
        is_pro = usage['is_pro']
        
        monthly_budget = self.PRO_TIER_BUDGET if is_pro else self.FREE_TIER_BUDGET
        current_spend = usage['monthly_spend']
        
        if current_spend + estimated_cost > monthly_budget:
            return False, f"Monthly budget of ${monthly_budget} reached"
        
        return True, None
    
    def record_actual_cost(self, user_id: str, tokens_used: int, model: str):
        """Record actual cost after API call"""
        
        cost = self._calculate_cost(tokens_used, model)
        
        supabase.table('user_cost_tracking').insert({
            'user_id': user_id,
            'tokens_used': tokens_used,
            'cost': cost,
            'model': model,
            'timestamp': datetime.now()
        })
```

**Benefits:**
- Free users get more messages if they use cheap patterns (greetings, check-ins)
- More accurate cost tracking
- Better monetization strategy

---

## Implementation Roadmap

### Week 1 (Quick Wins)
- [ ] Priority 5: Remove unnecessary function definitions (2 hours)
- [ ] Priority 2: Pattern-based caching (1 day)
- [ ] Priority 1: API selector skeleton (2 days)
- **Expected Savings:** 25%

### Week 2 (Hybrid API)
- [ ] Priority 1: Complete hybrid API implementation (3 days)
- [ ] Priority 3: Integrate model router (2 days)
- **Expected Savings:** 45%

### Week 3-4 (Thread Management)
- [ ] Priority 4: Thread pruning (1 week)
- [ ] Testing and monitoring
- **Expected Savings:** 55%

### Month 2-3 (Semantic Caching)
- [ ] Priority 7: Semantic caching with embeddings
- [ ] Database migration for vector support
- **Expected Savings:** 60%

### Month 3-6 (Fine-tuning)
- [ ] Priority 6: Data collection and fine-tuning
- [ ] A/B testing
- [ ] Gradual rollout
- **Expected Savings:** 75-85%

---

## Monitoring & Validation

### Key Metrics to Track

1. **Cost Metrics:**
   ```sql
   -- Daily cost by API type
   SELECT 
     DATE(created_at) as date,
     call_type,
     COUNT(*) as calls,
     SUM(tokens_generated + tokens_input) as total_tokens,
     SUM(tokens_generated + tokens_input) * 0.00003 as estimated_cost
   FROM ai_call_logs
   GROUP BY DATE(created_at), call_type;
   ```

2. **Quality Metrics:**
   - User satisfaction (track "helpful" reactions)
   - Message engagement rate
   - Streak retention rate
   - Session length

3. **Cache Hit Rate:**
   ```sql
   SELECT 
     COUNT(CASE WHEN cached = true THEN 1 END)::float / COUNT(*) * 100 as cache_hit_rate
   FROM ai_call_logs
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

4. **API Distribution:**
   ```sql
   SELECT 
     CASE 
       WHEN metadata->>'api_type' = 'assistant' THEN 'Assistant API'
       WHEN metadata->>'api_type' = 'completion' THEN 'Completions API'
       ELSE 'Cached'
     END as api_type,
     COUNT(*) as count,
     COUNT(*)::float / SUM(COUNT(*)) OVER () * 100 as percentage
   FROM ai_call_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY api_type;
   ```

### Dashboard Setup

Create a cost monitoring dashboard:
- Daily cost trends
- API distribution (Assistant vs Completions vs Cached)
- Cost per user segment (free vs pro)
- Cache hit rates
- Quality metrics overlay

---

## Risk Mitigation

### Potential Issues & Solutions

1. **Quality Degradation:**
   - **Risk:** Cheaper models may reduce response quality
   - **Mitigation:** A/B test with 10% traffic, monitor satisfaction metrics
   - **Rollback:** Keep Assistant API as fallback

2. **Cache Staleness:**
   - **Risk:** Cached responses may become outdated
   - **Mitigation:** 7-day TTL, context-aware cache validation
   - **Monitoring:** Track cache age vs user satisfaction

3. **Thread Pruning Loss:**
   - **Risk:** Lose important conversation context
   - **Mitigation:** Summarize before pruning, store in user_memories
   - **Testing:** Compare pruned vs non-pruned thread quality

4. **Fine-tuning Costs:**
   - **Risk:** Fine-tuning upfront cost ($8-20)
   - **Break-even:** Saves costs after ~1,000 messages
   - **Validation:** Start with small training set, iterate

---

## Cost Projections

### Current State (Baseline)
- **Model:** GPT-4 (assumed, $30 per 1M input tokens, $60 per 1M output)
- **Average message:** 100 input + 100 output tokens
- **Cost per message:** $0.009 (0.9 cents)
- **1,000 messages/day:** $9/day = $270/month

### After Short-Term Optimizations (Week 2)
- **80% on GPT-4o-mini:** $0.00015 per 1K tokens
- **20% on Assistant API:** $0.009 per message
- **Cache hit rate:** 20%
- **Cost per message (average):** $0.0015
- **1,000 messages/day:** $1.50/day = $45/month
- **Savings:** 83% ($225/month)

### After Long-Term Optimizations (Month 6)
- **50% on fine-tuned model:** $0.0003 per 1K tokens
- **30% cached:** $0
- **15% on GPT-4o-mini:** $0.00015 per 1K tokens
- **5% on Assistant API:** $0.009 per message
- **Cost per message (average):** $0.0006
- **1,000 messages/day:** $0.60/day = $18/month
- **Savings:** 93% ($252/month)

---

## Conclusion

This optimization plan provides a clear path to reducing OpenAI costs by **40-60% in the short term** (2 weeks) and **70-85% in the long term** (6 months), while maintaining or improving coaching quality.

### Key Takeaways:
1. **Immediate wins** available by using existing infrastructure better (model router, caching)
2. **Hybrid API approach** is the biggest quick win (35% savings)
3. **Fine-tuning** provides best long-term ROI but requires upfront investment
4. **Monitor quality metrics** closely during optimization

### Next Steps:
1. Review and approve this plan
2. Set up cost monitoring dashboard
3. Begin Week 1 implementation (quick wins)
4. Iterate based on metrics

---

**Questions for Discussion:**
1. What's your current monthly OpenAI spend?
2. What's your current model? (GPT-4, GPT-4-turbo, or GPT-4o-mini?)
3. Priority: Quality vs Cost vs Speed?
4. Timeline preferences for fine-tuning?

-- ============================================
-- CORESENSE COMPLETE DATABASE SCHEMA
-- Version: 1.1 (December 2024)
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLEANUP: Drop existing tables to ensure clean schema
-- (Remove this section if you want to preserve existing data)
-- ============================================

-- Drop in reverse order of dependencies
DROP TABLE IF EXISTS action_templates CASCADE;
DROP TABLE IF EXISTS prompt_templates CASCADE;
DROP TABLE IF EXISTS weekly_summaries CASCADE;
DROP TABLE IF EXISTS daily_stats CASCADE;
DROP TABLE IF EXISTS coach_messages CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS daily_prompts CASCADE;
DROP TABLE IF EXISTS engagement_actions CASCADE;
DROP TABLE IF EXISTS user_phone_numbers CASCADE;

-- Drop functions that will be recreated
DROP FUNCTION IF EXISTS update_user_streak CASCADE;
DROP FUNCTION IF EXISTS get_user_id_by_phone CASCADE;
DROP FUNCTION IF EXISTS get_or_create_daily_prompt CASCADE;
DROP FUNCTION IF EXISTS generate_daily_actions CASCADE;
DROP FUNCTION IF EXISTS update_daily_stat CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ============================================
-- SECTION 0: USERS TABLE (Required for foreign keys)
-- Only create if it doesn't exist - preserves existing users
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  onboarding_completed BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role full access to users
DROP POLICY IF EXISTS "Service role full access to users" ON users;
CREATE POLICY "Service role full access to users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- SECTION 1: USER PHONE NUMBERS
-- Links users to phone numbers for message matching
-- ============================================

CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  phone_normalized TEXT NOT NULL, -- E.164 format for matching
  is_primary BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_phone_normalized ON user_phone_numbers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_phone_user ON user_phone_numbers(user_id);

-- ============================================
-- SECTION 2: ENGAGEMENT ACTIONS
-- AI-suggested actions for the Engagement screen
-- ============================================

CREATE TABLE IF NOT EXISTS engagement_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  emoji TEXT DEFAULT '⚡',
  duration TEXT, -- e.g., "10 min", "2 min"
  category TEXT NOT NULL CHECK (category IN ('focus', 'wellness', 'habit', 'reflection', 'movement')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Actions expire after a day
  source TEXT DEFAULT 'ai', -- 'ai' | 'user' | 'coach'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_user ON engagement_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_active ON engagement_actions(user_id, completed, expires_at);

-- ============================================
-- SECTION 3: DAILY PROMPTS
-- Daily engagement questions from the coach
-- ============================================

CREATE TABLE IF NOT EXISTS daily_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  emoji TEXT,
  response TEXT,
  answered_at TIMESTAMPTZ,
  prompt_date DATE DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'ai', -- 'ai' | 'scheduled' | 'coach'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_date) -- One prompt per user per day
);

CREATE INDEX IF NOT EXISTS idx_prompts_user_date ON daily_prompts(user_id, prompt_date DESC);

-- ============================================
-- SECTION 4: GENERATED INSIGHTS
-- AI-generated insights from user data
-- ============================================

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('sleep', 'mood', 'productivity', 'habits', 'health', 'custom')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  expanded_content TEXT,
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  trend_value TEXT, -- e.g., "+45min", "+5%"
  data_points NUMERIC[], -- For mini charts (7 values for week)
  priority INTEGER DEFAULT 50, -- 0-100, higher = more important
  actionable BOOLEAN DEFAULT false,
  action_text TEXT,
  saved BOOLEAN DEFAULT false,
  saved_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  insight_date DATE DEFAULT CURRENT_DATE,
  source_data JSONB DEFAULT '{}'::jsonb, -- Raw data used to generate
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Insights can expire
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_saved ON insights(user_id, saved) WHERE saved = true;
CREATE INDEX IF NOT EXISTS idx_insights_date ON insights(user_id, insight_date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(user_id, insight_type);

-- ============================================
-- SECTION 5: USER STREAKS
-- Track consecutive days of activity
-- ============================================

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('check_in', 'commitment', 'engagement', 'health_sync')),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON user_streaks(user_id);

-- ============================================
-- SECTION 6: COACH MESSAGES
-- Messages for app display (synced from conversation_memory)
-- ============================================

CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message_text TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  read_in_app BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  message_source TEXT DEFAULT 'imessage', -- 'imessage' | 'app' | 'system'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON coach_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_messages_unread ON coach_messages(user_id, read_in_app) WHERE read_in_app = false;

-- ============================================
-- SECTION 6B: CHAT MESSAGES
-- Chat messages for coach conversations (source of truth for chat history)
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL,
  userid UUID NOT NULL,  -- Note: uses 'userid' not 'user_id' for compatibility
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'gpt')),
  message_type TEXT DEFAULT 'text',
  read_in_app BOOLEAN DEFAULT false,
  delivered BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user message lookups
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(userid, created_at DESC);

-- Index for chat thread lookups
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at DESC);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view own messages
DROP POLICY IF EXISTS "Users view own messages" ON messages;
CREATE POLICY "Users view own messages" ON messages
  FOR SELECT USING (auth.uid() = userid);

-- Users can insert own messages
DROP POLICY IF EXISTS "Users insert own messages" ON messages;
CREATE POLICY "Users insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = userid);

-- Service role can manage all messages
DROP POLICY IF EXISTS "Service role manage messages" ON messages;
CREATE POLICY "Service role manage messages" ON messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- SECTION 7: DAILY STATS
-- Aggregated daily statistics for performance
-- ============================================

CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stat_date DATE NOT NULL,
  actions_completed INTEGER DEFAULT 0,
  prompts_answered INTEGER DEFAULT 0,
  commitments_kept INTEGER DEFAULT 0,
  commitments_missed INTEGER DEFAULT 0,
  check_ins INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  steps INTEGER,
  sleep_hours NUMERIC,
  mood_average NUMERIC,
  engagement_score INTEGER, -- 0-100
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON daily_stats(user_id, stat_date DESC);

-- ============================================
-- SECTION 8: WEEKLY SUMMARIES
-- Generated weekly summary text for insights screen
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary_text TEXT NOT NULL,
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  highlights JSONB DEFAULT '[]'::jsonb, -- Array of highlight items
  lowlights JSONB DEFAULT '[]'::jsonb, -- Array of areas to improve
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user ON weekly_summaries(user_id, week_start DESC);

-- ============================================
-- SECTION 9: PROMPT TEMPLATES
-- Template library for daily prompts
-- ============================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('morning', 'evening', 'reflection', 'planning', 'motivation', 'check_in')),
  question TEXT NOT NULL,
  emoji TEXT,
  weight INTEGER DEFAULT 50, -- Higher = more likely to be selected
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default prompt templates
INSERT INTO prompt_templates (category, question, emoji, weight) VALUES
  ('morning', 'What''s the first thing you''ll do after breakfast?', '🌅', 50),
  ('morning', 'What would make today feel successful?', '🎯', 50),
  ('morning', 'One thing you''re looking forward to today?', '✨', 40),
  ('evening', 'What''s one win from today, big or small?', '🏆', 50),
  ('evening', 'How would you rate your energy today?', '⚡', 40),
  ('reflection', 'What did you learn about yourself this week?', '🧠', 30),
  ('planning', 'What''s your priority for the next few hours?', '📋', 50),
  ('motivation', 'What''s driving you right now?', '🔥', 40),
  ('check_in', 'How are you feeling right now?', '💭', 50)
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION 10: ACTION TEMPLATES
-- Template library for engagement actions
-- ============================================

CREATE TABLE IF NOT EXISTS action_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('focus', 'wellness', 'habit', 'reflection', 'movement')),
  title TEXT NOT NULL,
  subtitle TEXT,
  emoji TEXT DEFAULT '⚡',
  duration TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  weight INTEGER DEFAULT 50, -- Higher = more likely to be suggested
  conditions JSONB DEFAULT '{}'::jsonb, -- e.g., {"time_of_day": "morning", "sleep_quality": "low"}
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default action templates
INSERT INTO action_templates (category, title, subtitle, emoji, duration, priority, weight) VALUES
  ('focus', 'Quick Focus Sprint', 'Clear your mind with a short burst', '⚡', '10 min', 'high', 60),
  ('focus', 'Deep Work Block', 'Distraction-free focused time', '🎯', '30 min', 'medium', 40),
  ('wellness', 'Water + Breath Reset', 'Hydrate and center yourself', '💧', '2 min', 'medium', 50),
  ('wellness', 'Stretch Break', 'Quick body movement', '🧘', '5 min', 'low', 40),
  ('habit', 'Micro Habit Boost', 'Stack a tiny habit onto something you already do', '🔗', '1 min', 'low', 50),
  ('habit', 'Habit Check', 'Review and adjust one of your habits', '✅', '3 min', 'medium', 30),
  ('reflection', 'Gratitude Moment', 'Note one thing you''re grateful for', '🙏', '1 min', 'low', 40),
  ('reflection', 'Progress Check', 'Celebrate how far you''ve come', '📈', '2 min', 'low', 30),
  ('movement', 'Walk and Think', 'Short walk to process thoughts', '🚶', '10 min', 'medium', 50),
  ('movement', 'Energy Boost', 'Quick movement to wake up', '💪', '5 min', 'high', 40)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- user_phone_numbers
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own phone numbers" ON user_phone_numbers;
CREATE POLICY "Users manage own phone numbers" ON user_phone_numbers
  FOR ALL USING (auth.uid() = user_id);

-- engagement_actions
ALTER TABLE engagement_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own actions" ON engagement_actions;
CREATE POLICY "Users manage own actions" ON engagement_actions
  FOR ALL USING (auth.uid() = user_id);

-- daily_prompts
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own prompts" ON daily_prompts;
CREATE POLICY "Users manage own prompts" ON daily_prompts
  FOR ALL USING (auth.uid() = user_id);

-- insights
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own insights" ON insights;
CREATE POLICY "Users manage own insights" ON insights
  FOR ALL USING (auth.uid() = user_id);

-- user_streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own streaks" ON user_streaks;
CREATE POLICY "Users manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- coach_messages
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own messages" ON coach_messages;
CREATE POLICY "Users view own messages" ON coach_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert messages (for backend)
DROP POLICY IF EXISTS "Service can insert messages" ON coach_messages;
CREATE POLICY "Service can insert messages" ON coach_messages
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() = user_id);

-- daily_stats
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own stats" ON daily_stats;
CREATE POLICY "Users view own stats" ON daily_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can update stats (for backend)
DROP POLICY IF EXISTS "Service can manage stats" ON daily_stats;
CREATE POLICY "Service can manage stats" ON daily_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- weekly_summaries
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own summaries" ON weekly_summaries;
CREATE POLICY "Users view own summaries" ON weekly_summaries
  FOR SELECT USING (auth.uid() = user_id);

-- prompt_templates (public read)
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read templates" ON prompt_templates;
CREATE POLICY "Anyone can read templates" ON prompt_templates
  FOR SELECT USING (true);

-- action_templates (public read)
ALTER TABLE action_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read action templates" ON action_templates;
CREATE POLICY "Anyone can read action templates" ON action_templates
  FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_current_streak INTEGER;
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak info
  SELECT current_streak, last_activity_date
  INTO v_current_streak, v_last_date
  FROM user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  IF NOT FOUND THEN
    -- Create new streak
    INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_started_at)
    VALUES (p_user_id, p_streak_type, 1, 1, v_today, NOW());
    RETURN 1;
  END IF;
  
  IF v_last_date = v_today THEN
    -- Already counted today
    RETURN v_current_streak;
  ELSIF v_last_date = v_today - 1 THEN
    -- Consecutive day, increment streak
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
    RETURN v_current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    UPDATE user_streaks
    SET current_streak = 1,
        last_activity_date = v_today,
        streak_started_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by phone number
CREATE OR REPLACE FUNCTION get_user_id_by_phone(p_phone TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_normalized TEXT;
BEGIN
  -- Normalize phone number (remove spaces, dashes, parentheses)
  v_normalized := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  
  -- Try exact match first
  SELECT user_id INTO v_user_id
  FROM user_phone_numbers
  WHERE phone_normalized = v_normalized
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_user_id;
  END IF;
  
  -- Try without + prefix
  SELECT user_id INTO v_user_id
  FROM user_phone_numbers
  WHERE phone_normalized = LTRIM(v_normalized, '+')
     OR phone_normalized = '+' || LTRIM(v_normalized, '+')
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's prompt or create one
CREATE OR REPLACE FUNCTION get_or_create_daily_prompt(p_user_id UUID)
RETURNS daily_prompts AS $$
DECLARE
  v_prompt daily_prompts;
  v_template prompt_templates;
  v_hour INTEGER;
BEGIN
  -- Check for existing prompt today
  SELECT * INTO v_prompt
  FROM daily_prompts
  WHERE user_id = p_user_id AND prompt_date = CURRENT_DATE;
  
  IF FOUND THEN
    RETURN v_prompt;
  END IF;
  
  -- Determine category based on time of day
  v_hour := EXTRACT(HOUR FROM NOW());
  
  -- Select a random template based on time
  IF v_hour < 12 THEN
    SELECT * INTO v_template
    FROM prompt_templates
    WHERE active = true AND category IN ('morning', 'planning')
    ORDER BY random() * weight DESC
    LIMIT 1;
  ELSIF v_hour >= 18 THEN
    SELECT * INTO v_template
    FROM prompt_templates
    WHERE active = true AND category IN ('evening', 'reflection')
    ORDER BY random() * weight DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_template
    FROM prompt_templates
    WHERE active = true AND category IN ('check_in', 'motivation', 'planning')
    ORDER BY random() * weight DESC
    LIMIT 1;
  END IF;
  
  -- If no template found, use default
  IF NOT FOUND THEN
    v_template.question := 'How are you feeling right now?';
    v_template.emoji := '💭';
  END IF;
  
  -- Create the prompt
  INSERT INTO daily_prompts (user_id, question, emoji, prompt_date)
  VALUES (p_user_id, v_template.question, v_template.emoji, CURRENT_DATE)
  RETURNING * INTO v_prompt;
  
  RETURN v_prompt;
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily actions
CREATE OR REPLACE FUNCTION generate_daily_actions(p_user_id UUID, p_count INTEGER DEFAULT 3)
RETURNS SETOF engagement_actions AS $$
DECLARE
  v_template action_templates;
  v_action engagement_actions;
BEGIN
  -- Delete expired actions
  DELETE FROM engagement_actions
  WHERE user_id = p_user_id AND expires_at < NOW();
  
  -- Check if we already have enough uncompleted actions
  IF (SELECT COUNT(*) FROM engagement_actions 
      WHERE user_id = p_user_id 
        AND completed = false 
        AND (expires_at IS NULL OR expires_at > NOW())) >= p_count THEN
    -- Return existing actions
    RETURN QUERY
    SELECT * FROM engagement_actions
    WHERE user_id = p_user_id 
      AND completed = false 
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY priority DESC, created_at DESC
    LIMIT p_count;
    RETURN;
  END IF;
  
  -- Generate new actions from templates
  FOR v_template IN 
    SELECT * FROM action_templates 
    WHERE active = true 
    ORDER BY random() * weight DESC 
    LIMIT p_count
  LOOP
    INSERT INTO engagement_actions (
      user_id, title, subtitle, emoji, duration, category, priority, expires_at
    ) VALUES (
      p_user_id, 
      v_template.title, 
      v_template.subtitle, 
      v_template.emoji, 
      v_template.duration, 
      v_template.category, 
      v_template.priority,
      NOW() + INTERVAL '24 hours'
    )
    RETURNING * INTO v_action;
    
    RETURN NEXT v_action;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_stat(
  p_user_id UUID,
  p_field TEXT,
  p_value INTEGER DEFAULT 1
) RETURNS daily_stats AS $$
DECLARE
  v_stat daily_stats;
BEGIN
  -- Upsert daily stats
  INSERT INTO daily_stats (user_id, stat_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, stat_date) DO NOTHING;
  
  -- Update the specific field
  EXECUTE format(
    'UPDATE daily_stats SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() 
     WHERE user_id = $2 AND stat_date = $3 RETURNING *',
    p_field, p_field
  ) INTO v_stat USING p_value, p_user_id, CURRENT_DATE;
  
  RETURN v_stat;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_engagement_actions_updated_at ON engagement_actions;
CREATE TRIGGER trigger_update_engagement_actions_updated_at
  BEFORE UPDATE ON engagement_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER trigger_update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_daily_stats_updated_at ON daily_stats;
CREATE TRIGGER trigger_update_daily_stats_updated_at
  BEFORE UPDATE ON daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE!
-- ============================================

-- Verify tables were created
SELECT 
  tablename,
  'Created' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users',
  'user_phone_numbers',
  'engagement_actions', 
  'daily_prompts',
  'insights',
  'user_streaks',
  'coach_messages',
  'messages',
  'daily_stats',
  'weekly_summaries',
  'prompt_templates',
  'action_templates'
);


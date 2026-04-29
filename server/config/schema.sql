-- ============================================
-- SoulSync Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  avatar_url TEXT DEFAULT '',
  credits INTEGER DEFAULT 100,
  points INTEGER DEFAULT 0,
  is_blurred BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  warnings_count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geospatial/discovery queries
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_dob ON users(dob);

-- ============================================
-- 2. MATCH REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_match_requests_receiver ON match_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_status ON match_requests(status);

-- ============================================
-- 3. MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- ============================================
-- 4. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================
-- 5. STICKERS TABLE (Virtual Gifts)
-- ============================================
CREATE TABLE IF NOT EXISTS stickers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,          -- emoji or URL
  price_credits INTEGER NOT NULL DEFAULT 10,
  point_value INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate stickers
INSERT INTO stickers (name, icon, price_credits, point_value) VALUES
  ('Rose', '🌹', 10, 5),
  ('Heart', '❤️', 20, 10),
  ('Diamond', '💎', 50, 25),
  ('Crown', '👑', 100, 50),
  ('Star', '⭐', 15, 8),
  ('Fire', '🔥', 30, 15),
  ('Rainbow', '🌈', 40, 20),
  ('Sparkle', '✨', 25, 12);

-- ============================================
-- 6. GIFT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_receiver ON gift_transactions(receiver_id);

-- ============================================
-- 7. REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  message_content TEXT DEFAULT '',
  ai_verdict TEXT DEFAULT 'pending' CHECK (ai_verdict IN ('pending', 'safe', 'flagged')),
  ai_explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. HELPER VIEWS
-- ============================================

-- Leaderboard view: top users by points
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  id, name, avatar_url, points, city, country,
  RANK() OVER (ORDER BY points DESC) as rank
FROM users
ORDER BY points DESC;



CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);



CREATE TABLE IF NOT EXISTS vibe_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  vibe_type TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '[]',
  conversation_starter TEXT NOT NULL DEFAULT '',
  credits_charged INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_pair ON vibe_checks(requester_id, target_id);



CREATE TABLE IF NOT EXISTS ad_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_earned INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_views_user ON ad_views(user_id, created_at);



-- ============================================
-- 9. COMMUNITY CHAT ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(60) NOT NULL,
  purpose          VARCHAR(30) NOT NULL,
  city             TEXT NOT NULL,
  country          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','blocked')),
  member_count     INTEGER NOT NULL DEFAULT 1,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce: one active room per owner
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_active_room
  ON chat_rooms (owner_id)
  WHERE status = 'active';

-- Enforce: unique name per location (city+country, case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_name_location
  ON chat_rooms (LOWER(name), LOWER(city), LOWER(country))
  WHERE status = 'active';

-- Enforce: unique purpose per location
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_purpose_location
  ON chat_rooms (purpose, LOWER(city), LOWER(country))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_chat_rooms_location ON chat_rooms(city, country);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status   ON chat_rooms(status);

-- ============================================
-- 10. ROOM MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS room_messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room    ON room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_room_messages_sender  ON room_messages(sender_id);

-- ============================================
-- 11. HELPER RPCs FOR MEMBER COUNT
-- ============================================
CREATE OR REPLACE FUNCTION increment_room_members(room_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE chat_rooms SET member_count = member_count + 1 WHERE id = room_id;
$$;

CREATE OR REPLACE FUNCTION decrement_room_members(room_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE chat_rooms
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = room_id;
$$;


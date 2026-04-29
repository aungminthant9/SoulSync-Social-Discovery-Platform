-- ============================================================
-- SoulSync Migration — Room Members (Explicit Join/Leave)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create room_members table to track who has explicitly joined a room
CREATE TABLE IF NOT EXISTS room_members (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room   ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user   ON room_members(user_id);

-- 2. The room owner is auto-joined when they create their room (insert trigger)
-- But we handle this in application code (POST /join called after room creation)

-- Done!
SELECT 'Room members migration complete ✅' AS status;

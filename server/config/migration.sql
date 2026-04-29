-- ============================================================
-- SoulSync Migration
-- Adds columns that were missing from the original schema
-- ============================================================

-- 1. Add missing user moderation columns (if they don't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended   BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;

-- 2. Add last_activity_at to chat_rooms (if not present)
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure helper RPCs exist for member count tracking
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

-- 4. Ensure room_messages has is_deleted column
ALTER TABLE room_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Done!
SELECT 'Migration complete ✅' AS status;

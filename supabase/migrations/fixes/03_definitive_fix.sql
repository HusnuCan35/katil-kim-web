-- Definitive Fix for Player Stats Issue

-- 1. Force Schema Cache Reload
NOTIFY pgrst, 'reload config';

-- 2. Ensure user_id column exists (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'user_id') THEN
        ALTER TABLE players ADD COLUMN user_id uuid references auth.users(id) on delete set null;
    END IF;
END $$;

-- 3. Ensure 'outcome' column exists on rooms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'outcome') THEN
        ALTER TABLE rooms ADD COLUMN outcome text;
    END IF;
END $$;

-- 4. Enable RLS on Players if not already enabled
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policy to allow users to read their OWN player records
-- Use DO block to avoid error if policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname = 'Users can view their own player records'
    ) THEN
        CREATE POLICY "Users can view their own player records"
        ON players FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Add RLS Policy to allow reading rooms if you were a player in them? 
-- Actually, 'rooms' is usually public for read in this game, but let's ensure basic access.
-- We'll assume existing policies cover 'public' read for rooms, or we add one.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rooms' 
        AND policyname = 'Public read access for rooms'
    ) THEN
        CREATE POLICY "Public read access for rooms"
        ON rooms FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;

-- Ensure 'user_id' column exists on 'players' table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'user_id') THEN
        ALTER TABLE players ADD COLUMN user_id uuid references auth.users(id) on delete set null;
    END IF;
END $$;

-- Force schema cache reload by updating a comment (harmless)
COMMENT ON TABLE players IS 'Players in game rooms';

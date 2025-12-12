-- 1. Updates to 'players' for linking to user accounts
alter table players
add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Updates to 'rooms' for tracking game outcome (for stats)
alter table rooms
add column if not exists outcome text; -- 'WON' or 'LOST'

-- 3. Updates to 'messages' for System Messages
alter table messages
add column if not exists is_system boolean default false;

-- Allow player_id to be null for system messages
alter table messages
alter column player_id drop not null;

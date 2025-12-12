-- Create Messages Table for Chat
create table messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null, -- Sender
  player_name text not null, -- Cached name to avoid extra joins for simple prototype
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime
alter publication supabase_realtime add table messages;

-- RLS Policies
alter table messages enable row level security;

-- Public read/write (for prototype simplicity)
create policy "Public messages access" on messages for all using (true) with check (true);

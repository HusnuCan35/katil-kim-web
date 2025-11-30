-- Create Rooms Table
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  status text not null default 'LOBBY', -- 'LOBBY', 'INVESTIGATION', 'ACCUSATION', 'FINISHED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Players Table
create table players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  name text not null,
  role text, -- 'DETECTIVE_A', 'DETECTIVE_B'
  is_ready boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- RLS Policies (Simplified for prototype: allow public read/write)
alter table rooms enable row level security;
alter table players enable row level security;

create policy "Public rooms access" on rooms for all using (true) with check (true);
create policy "Public players access" on players for all using (true) with check (true);

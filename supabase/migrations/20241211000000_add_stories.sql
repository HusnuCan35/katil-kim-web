-- Create Stories Table
create table stories (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content jsonb not null, -- The full Case object
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  source text default 'AI' -- 'AI' or 'MANUAL'
);

-- Enable Realtime (Optional, but good for admin dashboards later)
alter publication supabase_realtime add table stories;

-- RLS Policies
alter table stories enable row level security;

-- Allow public read (for random game fetching)
create policy "Public stories read access" on stories for select using (true);

-- Allow public insert (for the API to save new stories, assumes API uses service key or public anon is fine for now as per prototype)
-- ideally API uses service key which bypasses RLS, but for client-side generation or anon access:
create policy "Public stories insert access" on stories for insert with check (true);

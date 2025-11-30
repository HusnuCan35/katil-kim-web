-- Add new columns to rooms table
alter table rooms add column votes jsonb default '{}'::jsonb;
alter table rooms add column outcome text; -- 'WON' or 'LOST'

-- If you haven't run the previous migration yet, you can just run the full create table again, 
-- but assuming you might have, here is the alter command. 
-- For the user's convenience, I will provide a consolidated 'update' script.

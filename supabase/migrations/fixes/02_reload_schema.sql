-- Force Schema Cache Reload for PostgREST
-- Run this if you are getting 400 Bad Request errors for existing columns
NOTIFY pgrst, 'reload config';

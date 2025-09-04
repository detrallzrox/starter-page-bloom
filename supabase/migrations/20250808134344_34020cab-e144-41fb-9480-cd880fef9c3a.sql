-- Fix duplicate index on public.profiles table
-- Remove the duplicate unique index I created, keeping the existing primary key index

DROP INDEX IF EXISTS public.idx_profiles_user_id_unique;

-- The profiles table should already have a primary key constraint on user_id
-- which automatically creates an index, so we don't need the duplicate one
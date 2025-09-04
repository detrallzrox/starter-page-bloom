-- Add unique constraint on user_id column in subscribers table
-- This is needed for the upsert operation in the check-subscription edge function

ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);
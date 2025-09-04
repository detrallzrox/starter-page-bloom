-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add the notifications table to the realtime publication
-- This enables real-time functionality for the notifications table
-- The supabase_realtime publication is the default publication for real-time features
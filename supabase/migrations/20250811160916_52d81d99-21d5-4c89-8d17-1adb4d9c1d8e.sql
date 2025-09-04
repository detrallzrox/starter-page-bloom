-- Add reference fields to notifications table for navigation
ALTER TABLE public.notifications 
ADD COLUMN reference_id UUID,
ADD COLUMN reference_type TEXT,
ADD COLUMN navigation_data JSONB;
-- Add current_balance column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;

-- Update transactions table to support savings type
ALTER TABLE public.transactions ALTER COLUMN type TYPE TEXT;

-- Update categories to support savings type
ALTER TABLE public.categories ALTER COLUMN type TYPE TEXT;
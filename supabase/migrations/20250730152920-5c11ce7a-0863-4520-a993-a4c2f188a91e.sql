-- Add invited_email column to shared_accounts table
ALTER TABLE public.shared_accounts 
ADD COLUMN invited_email text;

-- Add new status for pending registration
CREATE TYPE shared_account_status AS ENUM ('pending', 'accepted', 'pending_registration');

-- Update existing status column to use the enum (optional, for better data integrity)
-- We'll keep it as text for now to avoid migration issues

-- Allow shared_with_id to be nullable for pending registrations
ALTER TABLE public.shared_accounts 
ALTER COLUMN shared_with_id DROP NOT NULL;

-- Create index for better performance when looking up by invited_email
CREATE INDEX idx_shared_accounts_invited_email 
ON public.shared_accounts(invited_email) 
WHERE invited_email IS NOT NULL;
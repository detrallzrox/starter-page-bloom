-- Fix database error when creating new users
-- Ensure device_registrations table has proper constraints and user_id can be null initially

-- Update device_registrations table to allow proper user registration flow
ALTER TABLE public.device_registrations 
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_device_registrations_ip_fingerprint 
ON public.device_registrations (ip_address, device_fingerprint);

-- Ensure the trigger works properly for device limit checking
CREATE OR REPLACE FUNCTION public.check_device_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ip_count INTEGER;
  device_count INTEGER;
BEGIN
  -- Only check limits if both ip_address and device_fingerprint are provided
  IF NEW.ip_address IS NOT NULL AND NEW.device_fingerprint IS NOT NULL THEN
    -- Count accounts by IP (exclude null user_ids)
    SELECT COUNT(DISTINCT user_id) INTO ip_count
    FROM public.device_registrations
    WHERE ip_address = NEW.ip_address 
    AND user_id IS NOT NULL;
    
    -- Count accounts by device fingerprint (exclude null user_ids)
    SELECT COUNT(DISTINCT user_id) INTO device_count
    FROM public.device_registrations
    WHERE device_fingerprint = NEW.device_fingerprint 
    AND user_id IS NOT NULL;
    
    -- Check limits (allow some buffer for registrations in progress)
    IF ip_count >= 10 OR device_count >= 10 THEN
      RAISE EXCEPTION 'Limite de contas por dispositivo/IP atingido (máximo 10 contas)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
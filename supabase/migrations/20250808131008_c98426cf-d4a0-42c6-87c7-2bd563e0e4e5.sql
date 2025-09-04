-- Fix security warnings identified in Security Advisor

-- 1. Fix Function Search Path Mutable warnings by setting explicit search_path
-- Update calculate_next_notification_date function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_next_notification_date(due_day integer, reference_date date DEFAULT CURRENT_DATE)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  current_month := EXTRACT(month FROM reference_date);
  current_year := EXTRACT(year FROM reference_date);
  
  -- Tentar criar a data para o mês atual
  next_date := make_date(current_year, current_month, LEAST(due_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
  
  -- Se a data já passou, ir para o próximo mês
  IF next_date <= reference_date THEN
    IF current_month = 12 THEN
      current_month := 1;
      current_year := current_year + 1;
    ELSE
      current_month := current_month + 1;
    END IF;
    
    next_date := make_date(current_year, current_month, LEAST(due_day, EXTRACT(days FROM date_trunc('month', make_date(current_year, current_month, 1)) + interval '1 month' - interval '1 day')::integer));
  END IF;
  
  RETURN next_date;
END;
$function$;

-- Update all overloaded versions of calculate_next_reminder_date function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(frequency_type text, reference_date date DEFAULT CURRENT_DATE)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_date date;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := reference_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := reference_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_date := reference_date + INTERVAL '1 month';
    WHEN 'semiannually' THEN
      next_date := reference_date + INTERVAL '6 months';
    WHEN 'annually' THEN
      next_date := reference_date + INTERVAL '1 year';
    ELSE
      next_date := reference_date + INTERVAL '1 day'; -- Default to daily
  END CASE;
  
  RETURN next_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(frequency_type text, reference_date date DEFAULT CURRENT_DATE, reminder_day integer DEFAULT NULL::integer)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := reference_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := reference_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      IF reminder_day IS NOT NULL THEN
        current_month := EXTRACT(month FROM reference_date);
        current_year := EXTRACT(year FROM reference_date);
        
        -- Try to create date for current month
        next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
        
        -- If date has passed, go to next month
        IF next_date <= reference_date THEN
          IF current_month = 12 THEN
            current_month := 1;
            current_year := current_year + 1;
          ELSE
            current_month := current_month + 1;
          END IF;
          
          next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', make_date(current_year, current_month, 1)) + interval '1 month' - interval '1 day')::integer));
        END IF;
      ELSE
        next_date := reference_date + INTERVAL '1 month';
      END IF;
    WHEN 'semiannually' THEN
      next_date := reference_date + INTERVAL '6 months';
    WHEN 'annually' THEN
      next_date := reference_date + INTERVAL '1 year';
    ELSE
      next_date := reference_date + INTERVAL '1 day'; -- Default to daily
  END CASE;
  
  RETURN next_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(frequency_type text, reference_date date DEFAULT CURRENT_DATE, reminder_day integer DEFAULT NULL::integer, advance_days integer DEFAULT 0)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := reference_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := reference_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      IF reminder_day IS NOT NULL THEN
        current_month := EXTRACT(month FROM reference_date);
        current_year := EXTRACT(year FROM reference_date);
        
        -- Tentar criar a data para o mês atual
        next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
        
        -- Se a data já passou, ir para o próximo mês
        IF next_date <= reference_date THEN
          IF current_month = 12 THEN
            current_month := 1;
            current_year := current_year + 1;
          ELSE
            current_month := current_month + 1;
          END IF;
          
          next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', make_date(current_year, current_month, 1)) + interval '1 month' - interval '1 day')::integer));
        END IF;
      ELSE
        next_date := reference_date + INTERVAL '1 month';
      END IF;
    WHEN 'semiannually' THEN
      next_date := reference_date + INTERVAL '6 months';
    WHEN 'annually' THEN
      next_date := reference_date + INTERVAL '1 year';
    ELSE
      next_date := reference_date + INTERVAL '1 day'; -- Default to daily
  END CASE;
  
  -- Subtrair os dias de antecedência para enviar antes do dia desejado
  next_date := next_date - (advance_days || ' days')::interval;
  
  RETURN next_date;
END;
$function$;

-- 2. Move pg_net extension from public schema to extensions schema
-- First create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Configure Auth settings to fix OTP expiry and enable leaked password protection
-- Note: Some auth configurations may need to be done through Supabase dashboard
-- But we can set some database-level configurations here

-- Create a function to help with auth configuration if needed
CREATE OR REPLACE FUNCTION public.configure_auth_settings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function serves as a placeholder for auth configurations
  -- Most auth settings need to be configured through Supabase dashboard
  -- or auth configuration files
  RAISE NOTICE 'Auth settings should be configured through Supabase dashboard';
END;
$$;
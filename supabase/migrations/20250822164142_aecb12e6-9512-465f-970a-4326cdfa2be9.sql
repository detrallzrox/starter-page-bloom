-- Fix security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION date_trunc_day(timestamp with time zone)
RETURNS date 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN $1::date;
END;
$$;
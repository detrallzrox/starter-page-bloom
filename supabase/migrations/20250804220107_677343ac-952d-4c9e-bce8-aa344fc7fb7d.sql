-- Corrigir a última função pendente
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- This will be handled by Supabase Auth automatically
  -- Just ensuring the function exists for future use
  RETURN;
END;
$function$;
-- Criar função RPC para buscar usuário por email
CREATE OR REPLACE FUNCTION public.get_user_by_email(email_to_search text)
RETURNS table(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as id,
    email_to_search as email
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = p.user_id 
    AND u.email = email_to_search
  )
  LIMIT 1;
END;
$$;
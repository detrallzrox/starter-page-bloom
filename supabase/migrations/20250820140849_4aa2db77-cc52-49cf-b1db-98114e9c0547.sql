-- Corrigir a função de teste com search_path apropriado
CREATE OR REPLACE FUNCTION test_subscription_notifications()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  -- Chama a função de notificação de renovação
  SELECT net.http_post(
    url := 'https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/notify-subscription-renewal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
    body := '{"test_run": true}'::jsonb
  ) INTO result;
  
  RETURN 'Teste de notificações executado: ' || result;
END;
$$;
-- Corrigir problemas identificados nos logs

-- 1. Garantir que as extensões estão instaladas corretamente
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover cron job anterior se existir (com tratamento de erro)
DO $$
BEGIN
    PERFORM cron.unschedule('process-daily-notifications');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Recriar cron job com referência correta
SELECT cron.schedule(
  'process-daily-notifications',
  '0 8 * * *', -- Todo dia às 8:00
  $$
  SELECT
    net.http_post(
        url:='https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/process-bill-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- 4. Corrigir função handle_new_user para evitar conflitos
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = now();
  
  -- Create subscriber record with 3-day trial
  INSERT INTO public.subscribers (user_id, email, trial_end)
  VALUES (
    NEW.id,
    NEW.email,
    NOW() + INTERVAL '3 days'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = NEW.email,
    trial_end = CASE 
      WHEN subscribers.trial_end IS NULL THEN NOW() + INTERVAL '3 days'
      ELSE subscribers.trial_end
    END,
    updated_at = now();
  
  -- Welcome notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.id,
    'Bem-vindo ao ControlAI!',
    'Você tem 3 dias gratuitos para testar todas as funcionalidades premium.',
    'welcome'
  );
  
  RETURN NEW;
END;
$$;

-- 5. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Garantir que subscriber atual tem trial configurado
UPDATE public.subscribers 
SET trial_end = NOW() + INTERVAL '3 days'
WHERE trial_end IS NULL AND NOT subscribed;
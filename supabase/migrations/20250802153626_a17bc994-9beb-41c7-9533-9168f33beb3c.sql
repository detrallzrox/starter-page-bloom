-- Remover o cron job anterior se existir
SELECT cron.unschedule('process-bill-notifications-daily');

-- Criar novo cron job para processar assinaturas às 00:01 horário de São Paulo (03:01 UTC)
SELECT cron.schedule(
  'process-bill-notifications-daily',
  '1 3 * * *', -- 03:01 UTC = 00:01 São Paulo (UTC-3)
  $$
  SELECT
    net.http_post(
        url:='https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/process-bill-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
        body:='{"time": "'||now()||'"}'::jsonb
    ) as request_id;
  $$
);
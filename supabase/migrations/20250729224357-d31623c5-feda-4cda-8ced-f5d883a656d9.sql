-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para processar notificações diariamente às 8h da manhã
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
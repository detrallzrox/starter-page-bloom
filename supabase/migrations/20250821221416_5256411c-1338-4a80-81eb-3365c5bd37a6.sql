-- Update cron job to run at 9:00 AM instead of midnight
SELECT cron.unschedule('check-subscription-renewals-daily');

SELECT cron.schedule(
  'check-subscription-renewals-daily',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT net.http_post(
    url := 'https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/check-daily-renewals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
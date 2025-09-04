-- Create cron job to check subscription renewals once a day at midnight
SELECT cron.schedule(
  'check-subscription-renewals-daily',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT net.http_post(
    url := 'https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/check-daily-renewals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
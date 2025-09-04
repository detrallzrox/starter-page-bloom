-- Update allan@asmoreira.com.br to premium status for testing
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'premium',
  subscription_end = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE email = 'allan@asmoreira.com.br';
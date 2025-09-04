-- Tornar o usuário detrallzrox@gmail.com um assinante premium
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = NOW() + INTERVAL '1 month',
  updated_at = NOW()
WHERE email = 'detrallzrox@gmail.com';
-- Configurar acesso premium permanente para allan@asmoreira.com.br
INSERT INTO public.subscribers (email, subscribed, trial_end, subscription_end, updated_at, created_at)
VALUES (
  'allan@asmoreira.com.br',
  true,
  NULL,
  NULL,
  NOW(),
  NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET 
  subscribed = true,
  trial_end = NULL,
  subscription_end = NULL,
  updated_at = NOW();

-- Configurar trial de 3 dias para contatodazok@gmail.com
INSERT INTO public.subscribers (email, subscribed, trial_end, subscription_end, updated_at, created_at)
VALUES (
  'contatodazok@gmail.com',
  false,
  NOW() + INTERVAL '3 days',
  NULL,
  NOW(),
  NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET 
  subscribed = false,
  trial_end = NOW() + INTERVAL '3 days',
  subscription_end = NULL,
  updated_at = NOW();
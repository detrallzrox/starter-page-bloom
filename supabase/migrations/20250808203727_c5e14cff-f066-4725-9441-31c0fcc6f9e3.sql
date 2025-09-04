-- Atualizar a tabela subscribers para incluir o tipo VIP
-- Adicionar uma nova coluna para distinguir entre premium e VIP
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;

-- Adicionar um campo para marcar se é VIP eterno (sem necessidade de pagamento recorrente)
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS vip_eternal BOOLEAN NOT NULL DEFAULT false;

-- Atualizar o email allan@asmoreira.com.br para ser VIP eterno
INSERT INTO public.subscribers (
  email, 
  user_id, 
  subscribed, 
  subscription_tier, 
  is_vip, 
  vip_eternal,
  subscription_end,
  updated_at
) VALUES (
  'allan@asmoreira.com.br',
  (SELECT id FROM auth.users WHERE email = 'allan@asmoreira.com.br' LIMIT 1),
  true,
  'vip',
  true,
  true,
  '2099-12-31 23:59:59+00',
  now()
) ON CONFLICT (email) 
DO UPDATE SET 
  subscribed = true,
  subscription_tier = 'vip',
  is_vip = true,
  vip_eternal = true,
  subscription_end = '2099-12-31 23:59:59+00',
  updated_at = now();
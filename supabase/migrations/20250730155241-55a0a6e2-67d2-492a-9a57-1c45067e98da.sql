-- Atualizar conta do usuário para premium por 1 mês para testes
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = NOW() + INTERVAL '1 month'
WHERE email = 'contatodazok@gmail.com';
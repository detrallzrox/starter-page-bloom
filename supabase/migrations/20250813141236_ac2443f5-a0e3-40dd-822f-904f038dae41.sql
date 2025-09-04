-- Remove o emoji 💳 dos títulos das notificações de assinatura existentes
UPDATE public.notifications 
SET title = REPLACE(title, '💳 ', '') 
WHERE type = 'subscription' AND title LIKE '💳%';
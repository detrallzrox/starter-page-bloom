-- Adicionar lembrete padrão para todos os usuários existentes
INSERT INTO public.bill_reminders (
  user_id,
  reminder_name,
  comment,
  category,
  frequency,
  recurring_enabled,
  is_recurring,
  notification_date,
  next_notification_date,
  reminder_time
)
SELECT 
  p.user_id,
  'Anotação de Gastos',
  'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
  (SELECT id FROM public.categories WHERE LOWER(name) = 'educação' AND is_default = true LIMIT 1)::text,
  'daily',
  true,
  true,
  p.created_at::date,
  p.created_at::date,
  '19:50:00'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.bill_reminders br 
  WHERE br.user_id = p.user_id 
  AND br.reminder_name = 'Anotação de Gastos'
)
AND (SELECT id FROM public.categories WHERE LOWER(name) = 'educação' AND is_default = true LIMIT 1) IS NOT NULL;
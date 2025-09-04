-- Atualizar as datas de notificação dos lembretes padrão para hoje
-- para que eles sejam executados corretamente
UPDATE public.bill_reminders 
SET 
  next_notification_date = CURRENT_DATE,
  notification_date = CURRENT_DATE,
  updated_at = NOW()
WHERE reminder_name = 'Anotação de Gastos' 
AND recurring_enabled = true;
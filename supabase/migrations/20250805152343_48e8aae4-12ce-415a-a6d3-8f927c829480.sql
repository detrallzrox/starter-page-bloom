-- Adicionar campos para controle de recorrência nos lembretes
ALTER TABLE public.bill_reminders 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurring_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN next_notification_date date;

-- Remover campos relacionados ao pagamento já que não serão mais usados
ALTER TABLE public.bill_reminders 
DROP COLUMN IF EXISTS is_paid,
DROP COLUMN IF EXISTS paid_at;

-- Criar função para calcular próxima data de notificação
CREATE OR REPLACE FUNCTION public.calculate_next_notification_date(due_day integer, current_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  current_month := EXTRACT(month FROM current_date);
  current_year := EXTRACT(year FROM current_date);
  
  -- Tentar criar a data para o mês atual
  next_date := make_date(current_year, current_month, LEAST(due_day, EXTRACT(days FROM date_trunc('month', current_date) + interval '1 month' - interval '1 day')::integer));
  
  -- Se a data já passou, ir para o próximo mês
  IF next_date <= current_date THEN
    IF current_month = 12 THEN
      current_month := 1;
      current_year := current_year + 1;
    ELSE
      current_month := current_month + 1;
    END IF;
    
    next_date := make_date(current_year, current_month, LEAST(due_day, EXTRACT(days FROM date_trunc('month', make_date(current_year, current_month, 1)) + interval '1 month' - interval '1 day')::integer));
  END IF;
  
  RETURN next_date;
END;
$$;

-- Atualizar lembretes existentes para calcular next_notification_date
UPDATE public.bill_reminders 
SET next_notification_date = calculate_next_notification_date(due_day)
WHERE recurring_enabled = true;
-- Primeiro, criar um lembrete padrão para todos os usuários que não têm nenhum
INSERT INTO public.bill_reminders (
  user_id,
  reminder_name,
  comment,
  category,
  frequency,
  recurring_enabled,
  next_notification_date,
  reminder_time,
  is_recurring
)
SELECT 
  p.user_id,
  'Anotação de gastos',
  'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
  'Educação',
  'daily',
  true,
  CURRENT_DATE,
  '19:50:00',
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.bill_reminders br 
  WHERE br.user_id = p.user_id 
  AND br.reminder_name = 'Anotação de gastos'
);

-- Modificar a função para criar lembretes padrão para todos os usuários
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar lembrete padrão para o novo usuário
  INSERT INTO public.bill_reminders (
    user_id,
    reminder_name,
    comment,
    category,
    frequency,
    recurring_enabled,
    next_notification_date,
    reminder_time,
    is_recurring
  ) VALUES (
    NEW.user_id,
    'Anotação de gastos',
    'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
    'Educação',
    'daily',
    true,
    CURRENT_DATE,  -- Enviar no mesmo dia da criação
    '19:50:00',
    true
  );
  
  RETURN NEW;
END;
$function$;

-- Adicionar coluna para permitir escolher quando enviar a notificação
ALTER TABLE public.bill_reminders 
ADD COLUMN IF NOT EXISTS notification_advance_days integer DEFAULT 0;

-- Atualizar função para calcular próxima data considerando os dias de antecedência
CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(
  frequency_type text, 
  reference_date date DEFAULT CURRENT_DATE, 
  reminder_day integer DEFAULT NULL::integer,
  advance_days integer DEFAULT 0
) 
RETURNS date
LANGUAGE plpgsql
AS $function$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := reference_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := reference_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      IF reminder_day IS NOT NULL THEN
        current_month := EXTRACT(month FROM reference_date);
        current_year := EXTRACT(year FROM reference_date);
        
        -- Tentar criar a data para o mês atual
        next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
        
        -- Se a data já passou, ir para o próximo mês
        IF next_date <= reference_date THEN
          IF current_month = 12 THEN
            current_month := 1;
            current_year := current_year + 1;
          ELSE
            current_month := current_month + 1;
          END IF;
          
          next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', make_date(current_year, current_month, 1)) + interval '1 month' - interval '1 day')::integer));
        END IF;
      ELSE
        next_date := reference_date + INTERVAL '1 month';
      END IF;
    WHEN 'semiannually' THEN
      next_date := reference_date + INTERVAL '6 months';
    WHEN 'annually' THEN
      next_date := reference_date + INTERVAL '1 year';
    ELSE
      next_date := reference_date + INTERVAL '1 day'; -- Default to daily
  END CASE;
  
  -- Subtrair os dias de antecedência para enviar antes do dia desejado
  next_date := next_date - (advance_days || ' days')::interval;
  
  RETURN next_date;
END;
$function$;
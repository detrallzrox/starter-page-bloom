-- Adicionar campos para dia do mês e configurar horário padrão
ALTER TABLE public.bill_reminders 
ADD COLUMN IF NOT EXISTS reminder_day integer CHECK (reminder_day >= 1 AND reminder_day <= 31),
ALTER COLUMN reminder_time SET DEFAULT '19:50:00';

-- Atualizar função para calcular próxima data considerando dia específico do mês
CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(frequency_type text, reference_date date DEFAULT CURRENT_DATE, reminder_day integer DEFAULT NULL)
RETURNS date
LANGUAGE plpgsql
AS $$
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
  
  RETURN next_date;
END;
$$;

-- Atualizar função para criar lembrete padrão com horário de Brasília (19:50h)
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar lembrete padrão com horário de Brasília
  INSERT INTO public.bill_reminders (
    user_id,
    reminder_name,
    comment,
    category,
    frequency,
    recurring_enabled,
    next_notification_date,
    reminder_time
  ) VALUES (
    NEW.user_id,
    'Anotação de gastos',
    'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
    'Educação',
    'daily',
    true,
    CURRENT_DATE,  -- Começar no dia da criação da conta
    '19:50:00'     -- 19:50h horário de Brasília
  );
  
  RETURN NEW;
END;
$$;
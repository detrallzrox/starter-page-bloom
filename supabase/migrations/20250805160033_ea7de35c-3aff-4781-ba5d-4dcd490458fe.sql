-- Atualizar estrutura da tabela bill_reminders para sistema de lembretes melhorado
ALTER TABLE public.bill_reminders 
DROP COLUMN IF EXISTS amount,
DROP COLUMN IF EXISTS due_day,
ADD COLUMN IF NOT EXISTS comment text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS reminder_time time DEFAULT '09:00:00';

-- Renomear coluna name para reminder_name para ficar mais claro
ALTER TABLE public.bill_reminders 
RENAME COLUMN name TO reminder_name;

-- Atualizar função para calcular próxima data baseada na frequência
CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(frequency_type text, reference_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  next_date date;
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := reference_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := reference_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_date := reference_date + INTERVAL '1 month';
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

-- Atualizar função para criar lembrete padrão quando usuário é criado
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  education_category_id uuid;
BEGIN
  -- Buscar ID da categoria "Educação" (categoria padrão)
  SELECT id INTO education_category_id 
  FROM public.categories 
  WHERE name = 'Educação' AND is_default = true 
  LIMIT 1;

  -- Criar lembrete padrão
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
    CURRENT_DATE + INTERVAL '1 day',
    '09:00:00'
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando um perfil é criado
DROP TRIGGER IF EXISTS create_default_reminder_trigger ON public.profiles;
CREATE TRIGGER create_default_reminder_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_reminder();
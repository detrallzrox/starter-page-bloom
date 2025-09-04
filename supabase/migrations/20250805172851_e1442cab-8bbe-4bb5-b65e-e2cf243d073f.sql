-- Deletar todos os lembretes padrão existentes
DELETE FROM public.bill_reminders 
WHERE reminder_name = 'Anotação de gastos';

-- Recriar função para criar lembrete padrão com especificações corretas
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  educacao_category_id UUID;
  existing_reminder_count INTEGER;
BEGIN
  -- Verificar se o usuário já tem este lembrete específico (evitar duplicatas)
  SELECT COUNT(*) INTO existing_reminder_count
  FROM public.bill_reminders 
  WHERE user_id = NEW.user_id AND reminder_name = 'Anotação de Gastos';
  
  -- Só criar lembrete padrão se o usuário não tiver este lembrete ainda
  IF existing_reminder_count = 0 THEN
    -- Buscar o ID da categoria "Educação"
    SELECT id INTO educacao_category_id
    FROM public.categories 
    WHERE LOWER(name) = 'educacao' AND is_default = true
    LIMIT 1;
    
    -- Se não encontrar "educacao", buscar "educação"
    IF educacao_category_id IS NULL THEN
      SELECT id INTO educacao_category_id
      FROM public.categories 
      WHERE LOWER(name) = 'educação' AND is_default = true
      LIMIT 1;
    END IF;
    
    -- Se ainda não encontrar, buscar qualquer categoria padrão de despesa
    IF educacao_category_id IS NULL THEN
      SELECT id INTO educacao_category_id
      FROM public.categories 
      WHERE is_default = true AND type = 'expense'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    
    -- Criar lembrete padrão apenas se encontrou uma categoria válida
    IF educacao_category_id IS NOT NULL THEN
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
      ) VALUES (
        NEW.user_id,
        'Anotação de Gastos',
        'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
        educacao_category_id::text,
        'daily',
        true,
        true,
        NEW.created_at::date,
        NEW.created_at::date,
        '19:50:00'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Corrigir função para criar lembrete padrão apenas uma vez por usuário real
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  moradia_category_id UUID;
  existing_reminder_count INTEGER;
BEGIN
  -- Verificar se o usuário já tem lembretes (evitar duplicatas)
  SELECT COUNT(*) INTO existing_reminder_count
  FROM public.bill_reminders 
  WHERE user_id = NEW.user_id;
  
  -- Só criar lembrete padrão se o usuário não tiver nenhum lembrete ainda
  IF existing_reminder_count = 0 THEN
    -- Buscar o ID da categoria "Moradia"
    SELECT id INTO moradia_category_id
    FROM public.categories 
    WHERE LOWER(name) = 'moradia' AND is_default = true
    LIMIT 1;
    
    -- Se não encontrar, buscar qualquer categoria padrão de despesa
    IF moradia_category_id IS NULL THEN
      SELECT id INTO moradia_category_id
      FROM public.categories 
      WHERE is_default = true AND type = 'expense'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    
    -- Criar lembrete padrão apenas se encontrou uma categoria válida
    IF moradia_category_id IS NOT NULL THEN
      INSERT INTO public.bill_reminders (
        user_id,
        reminder_name,
        comment,
        category,
        frequency,
        recurring_enabled,
        notification_date,
        next_notification_date,
        reminder_time,
        is_recurring
      ) VALUES (
        NEW.user_id,
        'Anotação de gastos',
        'Psiu, já adicionou seus gastos de hoje? Não vai esquecer hein...',
        moradia_category_id::text,
        'daily',
        true,
        CURRENT_DATE,
        CURRENT_DATE,
        '19:50:00',
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Remover lembretes padrão duplicados mantendo apenas um por usuário
WITH duplicates AS (
  SELECT user_id, 
         array_agg(id ORDER BY created_at) as reminder_ids
  FROM public.bill_reminders 
  WHERE reminder_name = 'Anotação de gastos'
  GROUP BY user_id 
  HAVING COUNT(*) > 1
)
DELETE FROM public.bill_reminders 
WHERE id IN (
  SELECT unnest(reminder_ids[2:]) 
  FROM duplicates
);
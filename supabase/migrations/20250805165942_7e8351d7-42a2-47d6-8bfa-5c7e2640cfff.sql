-- Remove notification_advance_days and add notification_date
ALTER TABLE public.bill_reminders 
DROP COLUMN IF EXISTS notification_advance_days;

ALTER TABLE public.bill_reminders 
ADD COLUMN notification_date DATE;

-- Update existing reminders to use next_notification_date as notification_date
UPDATE public.bill_reminders 
SET notification_date = next_notification_date 
WHERE next_notification_date IS NOT NULL;

-- Update the create_default_reminder function
CREATE OR REPLACE FUNCTION public.create_default_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  moradia_category_id UUID;
BEGIN
  -- Get the "Moradia" category ID (try to find existing or use a default one)
  SELECT id INTO moradia_category_id
  FROM public.categories 
  WHERE LOWER(name) LIKE '%moradia%' OR LOWER(name) LIKE '%casa%' OR LOWER(name) LIKE '%habitação%'
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;
  
  -- If no "Moradia" category found, try to get any housing-related default category
  IF moradia_category_id IS NULL THEN
    SELECT id INTO moradia_category_id
    FROM public.categories 
    WHERE is_default = true AND (type = 'expense' OR type IS NULL)
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Create default reminder for the new user
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
    COALESCE(moradia_category_id::text, 'moradia'),
    'daily',
    true,
    CURRENT_DATE,  -- Set notification for account creation date
    CURRENT_DATE,  -- Set next notification for today
    '19:50:00',
    true
  );
  
  RETURN NEW;
END;
$function$;

-- Update calculate_next_reminder_date function to not use advance_days
CREATE OR REPLACE FUNCTION public.calculate_next_reminder_date(
  frequency_type text, 
  reference_date date DEFAULT CURRENT_DATE, 
  reminder_day integer DEFAULT NULL::integer
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
        
        -- Try to create date for current month
        next_date := make_date(current_year, current_month, LEAST(reminder_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
        
        -- If date has passed, go to next month
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
$function$;
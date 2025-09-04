

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."shared_account_status" AS ENUM (
    'pending',
    'accepted',
    'pending_registration'
);


ALTER TYPE "public"."shared_account_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_notification_date"("due_day" integer, "reference_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  next_date date;
  current_month integer;
  current_year integer;
BEGIN
  current_month := EXTRACT(month FROM reference_date);
  current_year := EXTRACT(year FROM reference_date);
  
  -- Tentar criar a data para o mês atual
  next_date := make_date(current_year, current_month, LEAST(due_day, EXTRACT(days FROM date_trunc('month', reference_date) + interval '1 month' - interval '1 day')::integer));
  
  -- Se a data já passou, ir para o próximo mês
  IF next_date <= reference_date THEN
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


ALTER FUNCTION "public"."calculate_next_notification_date"("due_day" integer, "reference_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date" DEFAULT CURRENT_DATE, "reminder_day" integer DEFAULT NULL::integer) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
$$;


ALTER FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date" DEFAULT CURRENT_DATE, "reminder_day" integer DEFAULT NULL::integer, "advance_days" integer DEFAULT 0) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  
  -- Subtrair os dias de antecedência para enviar antes do dia desejado
  next_date := next_date - (advance_days || ' days')::interval;
  
  RETURN next_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer, "advance_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_budget_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  budget_record RECORD;
  total_spent NUMERIC;
  budget_amount NUMERIC;
  percentage_used NUMERIC;
BEGIN
  -- Só processar se for despesa
  IF NEW.type != 'expense' OR NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar orçamentos ativos para esta categoria e usuário
  FOR budget_record IN
    SELECT cb.*, c.name as category_name, c.icon as category_icon
    FROM category_budgets cb
    JOIN categories c ON c.id = cb.category_id
    WHERE cb.user_id = NEW.user_id 
    AND cb.category_id = NEW.category_id
    AND NEW.date >= cb.period_start 
    AND NEW.date <= cb.period_end
  LOOP
    -- Calcular total gasto na categoria durante o período (apenas transações criadas após a criação do orçamento)
    SELECT COALESCE(SUM(amount), 0) INTO total_spent
    FROM transactions
    WHERE user_id = NEW.user_id
    AND category_id = NEW.category_id
    AND type = 'expense'
    AND date >= budget_record.period_start
    AND date <= budget_record.period_end
    AND created_at >= budget_record.created_at;

    budget_amount := budget_record.budget_amount;
    percentage_used := (total_spent / budget_amount) * 100;

    -- Log para debug apenas
    RAISE LOG 'Budget check: category=%, spent=%/%, percentage=%', 
      budget_record.category_name, total_spent, budget_amount, percentage_used;

    -- Verificar se orçamento foi excedido (100% ou mais) 
    -- Mas não criar notificação - deixar para o NotificationCenter gerenciar via push
    IF percentage_used >= 100 THEN
      RAISE LOG 'Budget exceeded but notification will be managed by NotificationCenter: category=%, percentage=%', 
        budget_record.category_name, percentage_used;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_budget_after_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_device_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ip_count INTEGER;
  device_count INTEGER;
BEGIN
  -- Only check limits if both ip_address and device_fingerprint are provided
  IF NEW.ip_address IS NOT NULL AND NEW.device_fingerprint IS NOT NULL THEN
    -- Count accounts by IP (exclude null user_ids)
    SELECT COUNT(DISTINCT user_id) INTO ip_count
    FROM public.device_registrations
    WHERE ip_address = NEW.ip_address 
    AND user_id IS NOT NULL;
    
    -- Count accounts by device fingerprint (exclude null user_ids)
    SELECT COUNT(DISTINCT user_id) INTO device_count
    FROM public.device_registrations
    WHERE device_fingerprint = NEW.device_fingerprint 
    AND user_id IS NOT NULL;
    
    -- Check limits (allow some buffer for registrations in progress)
    IF ip_count >= 10 OR device_count >= 10 THEN
      RAISE EXCEPTION 'Limite de contas por dispositivo/IP atingido (máximo 10 contas)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_device_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."configure_auth_settings"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function serves as a placeholder for auth configurations
  -- Most auth settings need to be configured through Supabase dashboard
  -- or auth configuration files
  RAISE NOTICE 'Auth settings should be configured through Supabase dashboard';
END;
$$;


ALTER FUNCTION "public"."configure_auth_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_reminder"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_default_reminder"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."date_trunc_day"(timestamp with time zone) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  RETURN $1::date;
END;
$_$;


ALTER FUNCTION "public"."date_trunc_day"(timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("email_to_search" "text") RETURNS TABLE("id" "uuid", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as id,
    email_to_search as email
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = p.user_id 
    AND u.email = email_to_search
  )
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_by_email"("email_to_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Create profile with phone number support
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Create subscriber record as Free (no trial)
  INSERT INTO public.subscribers (user_id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  
  -- Welcome notification (no mention of trial)
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.id,
    'Bem-Vindo ao Finaudy',
    'Você ganhou 3 testes gratuitos para testar todas as funcionalidades premium.',
    'welcome'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_installment_payment"("p_installment_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_receipt_url" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_result JSON;
  v_transaction_id UUID;
  v_installment_exists BOOLEAN := FALSE;
  v_already_paid BOOLEAN := FALSE;
BEGIN
  -- Log início da operação
  RAISE LOG 'ATOMIC_PAYMENT_START: installment_id=%, user_id=%, amount=%', p_installment_id, p_user_id, p_amount;
  
  -- Verificar se a parcela existe e não está paga
  SELECT 
    (COUNT(*) > 0) AS exists,
    (COUNT(*) FILTER (WHERE is_paid = true) > 0) AS already_paid
  INTO v_installment_exists, v_already_paid
  FROM installments 
  WHERE id = p_installment_id AND user_id = p_user_id;
  
  IF NOT v_installment_exists THEN
    RAISE EXCEPTION 'Parcela não encontrada para o usuário informado';
  END IF;
  
  IF v_already_paid THEN
    RAISE EXCEPTION 'Parcela já foi paga anteriormente';
  END IF;
  
  -- Gerar ID para a transação
  v_transaction_id := gen_random_uuid();
  
  -- 1. Marcar parcela como paga
  UPDATE installments 
  SET 
    is_paid = true, 
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_installment_id AND user_id = p_user_id;
  
  RAISE LOG 'ATOMIC_PAYMENT: Installment marked as paid - ID=%', p_installment_id;
  
  -- 2. Criar transação de despesa
  INSERT INTO transactions (
    id,
    user_id,
    amount,
    description,
    category_id,
    type,
    receipt_url,
    date,
    created_at,
    updated_at
  ) VALUES (
    v_transaction_id,
    p_user_id,
    p_amount,
    p_description,
    p_category_id,
    'expense',
    p_receipt_url,
    CURRENT_DATE,
    NOW(),
    NOW()
  );
  
  RAISE LOG 'ATOMIC_PAYMENT: Transaction created - ID=%, Amount=%', v_transaction_id, p_amount;
  
  -- 3. Criar notificação
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    created_at
  ) VALUES (
    p_user_id,
    'Parcela paga',
    'Parcela de ' || p_description || ' - R$ ' || p_amount || ' foi paga e registrada como despesa',
    'transaction',
    NOW()
  );
  
  RAISE LOG 'ATOMIC_PAYMENT: Notification created for user=%', p_user_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'installment_id', p_installment_id,
    'amount', p_amount,
    'message', 'Pagamento processado com sucesso'
  );
  
  RAISE LOG 'ATOMIC_PAYMENT_SUCCESS: %', v_result;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'ATOMIC_PAYMENT_ERROR: % - %', SQLSTATE, SQLERRM;
  -- Re-lançar a exceção para que seja tratada pelo cliente
  RAISE;
END;
$_$;


ALTER FUNCTION "public"."process_installment_payment"("p_installment_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_category_id" "uuid", "p_receipt_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_password_reset"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This will be handled by Supabase Auth automatically
  -- Just ensuring the function exists for future use
  RETURN;
END;
$$;


ALTER FUNCTION "public"."request_password_reset"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_investment_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  category_type TEXT;
  unique_execution_id TEXT;
BEGIN
  -- Criar ID único para esta execução
  unique_execution_id := 'delete_exec_' || OLD.id || '_' || extract(epoch from now() at time zone 'utc');
  
  -- Log de início da execução
  RAISE LOG 'DELETE TRIGGER START [%]: Transaction ID: %, User ID: %, Amount: %, Description: %', 
    unique_execution_id, OLD.id, OLD.user_id, OLD.amount, OLD.description;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = OLD.category_id;
    
    RAISE LOG 'DELETE TRIGGER [%] - Category type: %, Amount: %', unique_execution_id, category_type, OLD.amount;
    
    -- Reverse the balance changes based on original transaction
    IF category_type = 'savings' THEN
      -- Reverse investment transaction: decrease investment_balance, increase current_balance
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) - OLD.amount,
          current_balance = COALESCE(current_balance, 0) + OLD.amount,
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
      
      RAISE LOG 'DELETE TRIGGER [%] - SAVINGS transaction reversed - Removed % from investment, added % to current', 
        unique_execution_id, OLD.amount, OLD.amount;
    ELSIF OLD.type = 'expense' THEN
      -- Reverse expense: increase current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + OLD.amount,
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
      
      RAISE LOG 'DELETE TRIGGER [%] - EXPENSE transaction reversed - Added % to current balance', unique_execution_id, OLD.amount;
    ELSIF OLD.type = 'income' THEN
      -- Reverse income: decrease current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - OLD.amount,
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
      
      RAISE LOG 'DELETE TRIGGER [%] - INCOME transaction reversed - Removed % from current balance', unique_execution_id, OLD.amount;
    END IF;
    
    RAISE LOG 'DELETE TRIGGER END [%] - COMPLETED SUCCESSFULLY', unique_execution_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."reverse_investment_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_subscription_notifications"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result text;
BEGIN
  -- Chama a função de notificação de renovação
  SELECT net.http_post(
    url := 'https://jwizzrqgchmsstwadtth.supabase.co/functions/v1/notify-subscription-renewal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3aXp6cnFnY2htc3N0d2FkdHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODM3ODMsImV4cCI6MjA2ODg1OTc4M30.7T5W738sNHDXIhmuGJPD52CNbKLLU4PhmaFjsLTqn3o"}'::jsonb,
    body := '{"test_run": true}'::jsonb
  ) INTO result;
  
  RETURN 'Teste de notificações executado: ' || result;
END;
$$;


ALTER FUNCTION "public"."test_subscription_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investment_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  category_type TEXT;
  current_balance_before NUMERIC;
  current_balance_after NUMERIC;
  investment_balance_before NUMERIC;
  investment_balance_after NUMERIC;
  unique_execution_id TEXT;
BEGIN
  -- Criar ID único para esta execução
  unique_execution_id := 'exec_' || NEW.id || '_' || extract(epoch from now() at time zone 'utc');
  
  -- Log de início da execução
  RAISE LOG 'TRIGGER START [%]: Transaction ID: %, User ID: %, Amount: %, Description: %', 
    unique_execution_id, NEW.id, NEW.user_id, NEW.amount, NEW.description;

  -- Handle INSERT APENAS
  IF TG_OP = 'INSERT' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = NEW.category_id;
    
    RAISE LOG 'TRIGGER [%] - Category type: %, Amount: %', unique_execution_id, category_type, NEW.amount;
    
    -- Get current balances before update
    SELECT current_balance, investment_balance 
    INTO current_balance_before, investment_balance_before
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    RAISE LOG 'TRIGGER [%] - Balances BEFORE - Current: %, Investment: %', 
      unique_execution_id, current_balance_before, investment_balance_before;
    
    -- Update balances based on category type and transaction type
    IF category_type = 'savings' THEN
      -- Investment transaction: increase investment_balance, decrease current_balance
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) + NEW.amount,
          current_balance = COALESCE(current_balance, 0) - NEW.amount,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'TRIGGER [%] - SAVINGS transaction - Added % to investment, removed % from current', 
        unique_execution_id, NEW.amount, NEW.amount;
    ELSIF NEW.type = 'expense' THEN
      -- Regular expense: decrease current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - NEW.amount,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'TRIGGER [%] - EXPENSE transaction - Removed % from current balance', unique_execution_id, NEW.amount;
    ELSIF NEW.type = 'income' THEN
      -- Regular income: increase current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'TRIGGER [%] - INCOME transaction - Added % to current balance', unique_execution_id, NEW.amount;
    END IF;
    
    -- Get current balances after update
    SELECT current_balance, investment_balance 
    INTO current_balance_after, investment_balance_after
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    RAISE LOG 'TRIGGER [%] - Balances AFTER - Current: %, Investment: %', 
      unique_execution_id, current_balance_after, investment_balance_after;
    
    RAISE LOG 'TRIGGER END [%] - COMPLETED SUCCESSFULLY', unique_execution_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_investment_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bill_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reminder_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "logo_type" "text" DEFAULT 'bill'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurring_enabled" boolean DEFAULT false NOT NULL,
    "next_notification_date" "date",
    "comment" "text" DEFAULT ''::"text" NOT NULL,
    "frequency" "text" DEFAULT 'daily'::"text" NOT NULL,
    "reminder_time" time without time zone DEFAULT '19:50:00'::time without time zone,
    "reminder_day" integer,
    "notification_date" "date",
    "notification_sent" boolean DEFAULT false NOT NULL,
    "is_processing" boolean DEFAULT false,
    CONSTRAINT "bill_reminders_reminder_day_check" CHECK ((("reminder_day" >= 1) AND ("reminder_day" <= 31)))
);

ALTER TABLE ONLY "public"."bill_reminders" REPLICA IDENTITY FULL;


ALTER TABLE "public"."bill_reminders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bill_reminders"."is_processing" IS 'Flag to prevent duplicate processing in race conditions.';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "color" "text",
    "type" "text" NOT NULL,
    "user_id" "uuid",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'savings'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "budget_amount" numeric NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_type" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "auto_renew" boolean DEFAULT false NOT NULL,
    CONSTRAINT "category_budgets_budget_amount_check" CHECK (("budget_amount" > (0)::numeric)),
    CONSTRAINT "period_type_check" CHECK (("period_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'semiannual'::"text", 'annual'::"text"])))
);


ALTER TABLE "public"."category_budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "inet" NOT NULL,
    "device_fingerprint" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fcm_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'android'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fcm_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature_type" "text" NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_usage_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature_type" "text" NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "last_used" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_usage_limits_feature_type_check" CHECK (("feature_type" = ANY (ARRAY['photo'::"text", 'voice'::"text", 'export'::"text", 'installment_view'::"text"])))
);


ALTER TABLE "public"."feature_usage_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "purchase_name" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "installment_amount" numeric NOT NULL,
    "total_installments" integer NOT NULL,
    "current_installment" integer DEFAULT 1 NOT NULL,
    "first_payment_date" "date" NOT NULL,
    "last_payment_date" "date" NOT NULL,
    "is_paid" boolean DEFAULT false NOT NULL,
    "paid_at" timestamp with time zone,
    "category_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "receipt_url" "text"
);

ALTER TABLE ONLY "public"."installments" REPLICA IDENTITY FULL;


ALTER TABLE "public"."installments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_id" "uuid",
    "reference_type" "text",
    "navigation_data" "jsonb",
    CONSTRAINT "check_no_push_notification_type" CHECK (("type" <> 'push_notification'::"text"))
);

ALTER TABLE ONLY "public"."notifications" REPLICA IDENTITY FULL;


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "monthly_income" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "savings_goal" numeric DEFAULT 1000,
    "current_balance" numeric DEFAULT 0,
    "balance_set_at" timestamp with time zone,
    "investment_balance" numeric DEFAULT 0,
    "last_selected_account_id" "uuid"
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."last_selected_account_id" IS 'Stores the ID of the last account (personal or shared) that the user accessed';



CREATE TABLE IF NOT EXISTS "public"."push_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "platform" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "push_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_notifications_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text", 'web'::"text"]))),
    CONSTRAINT "push_notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."push_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sent_notifications" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sent_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."sent_notifications" IS 'Tracks unique notification IDs to prevent duplicate sends.';



CREATE TABLE IF NOT EXISTS "public"."shared_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "shared_with_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_email" "text"
);

ALTER TABLE ONLY "public"."shared_accounts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."shared_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "stripe_customer_id" "text",
    "subscribed" boolean DEFAULT false NOT NULL,
    "subscription_tier" "text",
    "subscription_end" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_vip" boolean DEFAULT false NOT NULL,
    "vip_eternal" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "renewal_day" integer NOT NULL,
    "category" "text" NOT NULL,
    "logo_type" "text" DEFAULT 'subscription'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_charged" timestamp with time zone,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "renewal_date" "date",
    CONSTRAINT "subscriptions_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'semiannually'::"text", 'annually'::"text"]))),
    CONSTRAINT "subscriptions_renewal_day_check" CHECK ((("renewal_day" >= 1) AND ("renewal_day" <= 31)))
);

ALTER TABLE ONLY "public"."subscriptions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "text",
    "receipt_url" "text",
    "audio_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'savings'::"text"])))
);

ALTER TABLE ONLY "public"."transactions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "push_token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bill_reminders"
    ADD CONSTRAINT "bill_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_budgets"
    ADD CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_registrations"
    ADD CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."feature_usage_limits"
    ADD CONSTRAINT "feature_usage_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage_limits"
    ADD CONSTRAINT "feature_usage_limits_user_id_feature_type_key" UNIQUE ("user_id", "feature_type");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_user_id_feature_type_key" UNIQUE ("user_id", "feature_type");



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sent_notifications"
    ADD CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_accounts"
    ADD CONSTRAINT "shared_accounts_owner_id_shared_with_id_key" UNIQUE ("owner_id", "shared_with_id");



ALTER TABLE ONLY "public"."shared_accounts"
    ADD CONSTRAINT "shared_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_budgets"
    ADD CONSTRAINT "unique_user_category_period" UNIQUE ("user_id", "category_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_setting_key_key" UNIQUE ("user_id", "setting_key");



CREATE INDEX "idx_bill_reminders_user_id" ON "public"."bill_reminders" USING "btree" ("user_id");



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_category_budgets_user_id" ON "public"."category_budgets" USING "btree" ("user_id");



CREATE INDEX "idx_device_registrations_fingerprint" ON "public"."device_registrations" USING "btree" ("left"("device_fingerprint", 100));



CREATE INDEX "idx_device_registrations_ip" ON "public"."device_registrations" USING "btree" ("ip_address");



CREATE INDEX "idx_device_registrations_ip_fingerprint" ON "public"."device_registrations" USING "btree" ("ip_address", "device_fingerprint");



CREATE INDEX "idx_device_registrations_user_id" ON "public"."device_registrations" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_feature_usage_limits_user_id" ON "public"."feature_usage_limits" USING "btree" ("user_id");



CREATE INDEX "idx_feature_usage_user_feature" ON "public"."feature_usage" USING "btree" ("user_id", "feature_type");



CREATE INDEX "idx_installments_user_id" ON "public"."installments" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_notifications_unique_daily_func" ON "public"."notifications" USING "btree" ("user_id", "type", "reference_id", "reference_type", "public"."date_trunc_day"("created_at")) WHERE (("reference_id" IS NOT NULL) AND ("reference_type" IS NOT NULL));



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_shared_accounts_invited_email" ON "public"."shared_accounts" USING "btree" ("invited_email") WHERE ("invited_email" IS NOT NULL);



CREATE INDEX "idx_shared_accounts_owner_id" ON "public"."shared_accounts" USING "btree" ("owner_id");



CREATE INDEX "idx_shared_accounts_shared_with_id" ON "public"."shared_accounts" USING "btree" ("shared_with_id") WHERE ("shared_with_id" IS NOT NULL);



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_user_push_tokens_unique" ON "public"."user_push_tokens" USING "btree" ("user_id", "push_token");



CREATE INDEX "idx_user_settings_key" ON "public"."user_settings" USING "btree" ("user_id", "setting_key");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "budget_check_trigger" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."check_budget_after_transaction"();



CREATE OR REPLACE TRIGGER "check_device_limit_trigger" BEFORE INSERT ON "public"."device_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."check_device_limit"();



CREATE OR REPLACE TRIGGER "create_default_reminder_trigger" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_reminder"();



CREATE OR REPLACE TRIGGER "reverse_investment_balance_trigger" AFTER DELETE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."reverse_investment_balance"();



CREATE OR REPLACE TRIGGER "update_bill_reminders_updated_at" BEFORE UPDATE ON "public"."bill_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_category_budgets_updated_at" BEFORE UPDATE ON "public"."category_budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_device_registrations_updated_at" BEFORE UPDATE ON "public"."device_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fcm_tokens_updated_at" BEFORE UPDATE ON "public"."fcm_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feature_usage_limits_updated_at" BEFORE UPDATE ON "public"."feature_usage_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feature_usage_updated_at" BEFORE UPDATE ON "public"."feature_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_installments_updated_at" BEFORE UPDATE ON "public"."installments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_investment_balance_trigger" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_investment_balance"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_notifications_updated_at" BEFORE UPDATE ON "public"."push_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_push_tokens_updated_at" BEFORE UPDATE ON "public"."user_push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_registrations"
    ADD CONSTRAINT "device_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_accounts"
    ADD CONSTRAINT "shared_accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_accounts"
    ADD CONSTRAINT "shared_accounts_shared_with_id_fkey" FOREIGN KEY ("shared_with_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow service_role to manage sent_notifications" ON "public"."sent_notifications" USING (true) WITH CHECK (true);



CREATE POLICY "Only system can delete subscriptions" ON "public"."subscribers" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Permitir que usuários leiam suas próprias notificações" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "System can insert device registrations" ON "public"."device_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert push notifications" ON "public"."push_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update push notifications" ON "public"."push_notifications" FOR UPDATE USING (true);



CREATE POLICY "Users and shared accounts can access categories" ON "public"."categories" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ("is_default" = true) OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "categories"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text")))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "categories"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage bill reminders" ON "public"."bill_reminders" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE ((("shared_accounts"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."shared_with_id" = "bill_reminders"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text")) OR (("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."owner_id" = "bill_reminders"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text"))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "bill_reminders"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage category budgets" ON "public"."category_budgets" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "category_budgets"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text")))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "category_budgets"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage feature usage" ON "public"."feature_usage_limits" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "feature_usage_limits"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text")))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "feature_usage_limits"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage installments" ON "public"."installments" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE ((("shared_accounts"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."shared_with_id" = "installments"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text")) OR (("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."owner_id" = "installments"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text"))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "installments"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage subscriptions" ON "public"."subscriptions" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE ((("shared_accounts"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."shared_with_id" = "subscriptions"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text")) OR (("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."owner_id" = "subscriptions"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text"))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "subscriptions"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can manage transactions" ON "public"."transactions" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE ((("shared_accounts"."owner_id" = "transactions"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text")) OR (("shared_accounts"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."shared_with_id" = "transactions"."user_id") AND ("shared_accounts"."status" = 'accepted'::"text"))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "transactions"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can update notifications" ON "public"."notifications" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (((("shared_accounts"."owner_id" = "notifications"."user_id") AND ("shared_accounts"."shared_with_id" = "auth"."uid"())) OR (("shared_accounts"."shared_with_id" = "notifications"."user_id") AND ("shared_accounts"."owner_id" = "auth"."uid"()))) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users and shared accounts can view notifications" ON "public"."notifications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE ((("shared_accounts"."owner_id" = "notifications"."user_id") AND ("shared_accounts"."shared_with_id" = "auth"."uid"()) AND ("shared_accounts"."status" = 'accepted'::"text")) OR (("shared_accounts"."shared_with_id" = "notifications"."user_id") AND ("shared_accounts"."owner_id" = "auth"."uid"()) AND ("shared_accounts"."status" = 'accepted'::"text")))))));



CREATE POLICY "Users and shared accounts can view subscriptions" ON "public"."subscribers" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ("email" = ( SELECT "auth"."email"() AS "email")) OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "subscribers"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can create shared accounts" ON "public"."shared_accounts" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own FCM tokens" ON "public"."fcm_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own push tokens" ON "public"."user_push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their shared accounts" ON "public"."shared_accounts" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "owner_id") OR (( SELECT "auth"."uid"() AS "uid") = "shared_with_id")));



CREATE POLICY "Users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own FCM tokens" ON "public"."fcm_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own push tokens" ON "public"."user_push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own FCM tokens" ON "public"."fcm_tokens" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own feature usage" ON "public"."feature_usage" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own settings" ON "public"."user_settings" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own subscription" ON "public"."subscribers" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (("auth"."email"() = "email") AND ("user_id" IS NULL)) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can only update their own subscription" ON "public"."subscribers" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."email"() = "email") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."email"() = "email") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can update their own FCM tokens" ON "public"."fcm_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile and shared accounts" ON "public"."profiles" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "profiles"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can update their own push tokens" ON "public"."user_push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their shared accounts" ON "public"."shared_accounts" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "owner_id") OR (( SELECT "auth"."uid"() AS "uid") = "shared_with_id")));



CREATE POLICY "Users can view their own FCM tokens" ON "public"."fcm_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own device registrations" ON "public"."device_registrations" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own profile and shared accounts" ON "public"."profiles" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."shared_accounts"
  WHERE (("shared_accounts"."owner_id" = "profiles"."user_id") AND ("shared_accounts"."shared_with_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("shared_accounts"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can view their own push notifications" ON "public"."push_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."user_push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their shared accounts" ON "public"."shared_accounts" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "owner_id") OR (( SELECT "auth"."uid"() AS "uid") = "shared_with_id")));



ALTER TABLE "public"."bill_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fcm_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_usage_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sent_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bill_reminders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."installments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."shared_accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."subscriptions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."transactions";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."calculate_next_notification_date"("due_day" integer, "reference_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_notification_date"("due_day" integer, "reference_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_notification_date"("due_day" integer, "reference_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer, "advance_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer, "advance_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_reminder_date"("frequency_type" "text", "reference_date" "date", "reminder_day" integer, "advance_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_budget_after_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_budget_after_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_budget_after_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_device_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_device_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_device_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."configure_auth_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."configure_auth_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."configure_auth_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_reminder"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_reminder"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_reminder"() TO "service_role";



GRANT ALL ON FUNCTION "public"."date_trunc_day"(timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."date_trunc_day"(timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_trunc_day"(timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_email"("email_to_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("email_to_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("email_to_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_installment_payment"("p_installment_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_category_id" "uuid", "p_receipt_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_installment_payment"("p_installment_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_category_id" "uuid", "p_receipt_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_installment_payment"("p_installment_id" "uuid", "p_user_id" "uuid", "p_amount" numeric, "p_description" "text", "p_category_id" "uuid", "p_receipt_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_password_reset"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_password_reset"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_password_reset"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reverse_investment_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_investment_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_investment_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_subscription_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_subscription_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_subscription_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investment_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investment_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investment_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."bill_reminders" TO "anon";
GRANT ALL ON TABLE "public"."bill_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_budgets" TO "anon";
GRANT ALL ON TABLE "public"."category_budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."category_budgets" TO "service_role";



GRANT ALL ON TABLE "public"."device_registrations" TO "anon";
GRANT ALL ON TABLE "public"."device_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."device_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."feature_usage" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage" TO "service_role";



GRANT ALL ON TABLE "public"."feature_usage_limits" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage_limits" TO "service_role";



GRANT ALL ON TABLE "public"."installments" TO "anon";
GRANT ALL ON TABLE "public"."installments" TO "authenticated";
GRANT ALL ON TABLE "public"."installments" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_notifications" TO "anon";
GRANT ALL ON TABLE "public"."push_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."sent_notifications" TO "anon";
GRANT ALL ON TABLE "public"."sent_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."sent_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."shared_accounts" TO "anon";
GRANT ALL ON TABLE "public"."shared_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;

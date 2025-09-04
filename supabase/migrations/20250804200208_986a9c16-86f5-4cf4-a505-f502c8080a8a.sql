-- Primeiro, vamos verificar se existem múltiplos triggers com o mesmo nome
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    prosrc as function_source
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%investment_balance%';

-- Vamos também verificar se o trigger existe e sua configuração
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE triggername LIKE '%investment_balance%';

-- Vamos remover qualquer trigger duplicado e recriar apenas um
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_investment_balance ON public.transactions;

-- Recriar o trigger com logs para debug
CREATE OR REPLACE FUNCTION public.update_investment_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  category_type TEXT;
  current_balance_before NUMERIC;
  current_balance_after NUMERIC;
  investment_balance_before NUMERIC;
  investment_balance_after NUMERIC;
BEGIN
  -- Log para debug
  RAISE LOG 'TRIGGER EXECUTADO: Operação: %, Transaction ID: %, User ID: %, Amount: %', 
    TG_OP, COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id), COALESCE(NEW.amount, OLD.amount);

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = NEW.category_id;
    
    RAISE LOG 'INSERT - Category type: %', category_type;
    
    -- Get current balances before update
    SELECT current_balance, investment_balance 
    INTO current_balance_before, investment_balance_before
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    RAISE LOG 'Balances BEFORE - Current: %, Investment: %', current_balance_before, investment_balance_before;
    
    -- Update balances based on category type and transaction type
    IF category_type = 'savings' THEN
      -- Investment transaction: increase investment_balance, decrease current_balance
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) + NEW.amount,
          current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'SAVINGS transaction - Added % to investment, removed % from current', NEW.amount, NEW.amount;
    ELSIF NEW.type = 'expense' THEN
      -- Regular expense: decrease current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'EXPENSE transaction - Removed % from current balance', NEW.amount;
    ELSIF NEW.type = 'income' THEN
      -- Regular income: increase current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'INCOME transaction - Added % to current balance', NEW.amount;
    END IF;
    
    -- Get current balances after update
    SELECT current_balance, investment_balance 
    INTO current_balance_after, investment_balance_after
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    RAISE LOG 'Balances AFTER - Current: %, Investment: %', current_balance_after, investment_balance_after;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction effect
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = OLD.category_id;
    
    IF category_type = 'savings' THEN
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) - OLD.amount,
          current_balance = COALESCE(current_balance, 0) + OLD.amount
      WHERE user_id = OLD.user_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + OLD.amount
      WHERE user_id = OLD.user_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - OLD.amount
      WHERE user_id = OLD.user_id;
    END IF;
    
    -- Apply new transaction effect
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = NEW.category_id;
    
    IF category_type = 'savings' THEN
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) + NEW.amount,
          current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = OLD.category_id;
    
    -- Reverse transaction effect
    IF category_type = 'savings' THEN
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) - OLD.amount,
          current_balance = COALESCE(current_balance, 0) + OLD.amount
      WHERE user_id = OLD.user_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + OLD.amount
      WHERE user_id = OLD.user_id;
    ELSIF OLD.type = 'income' THEN
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - OLD.amount
      WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Criar apenas UM trigger
CREATE TRIGGER update_investment_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_investment_balance();
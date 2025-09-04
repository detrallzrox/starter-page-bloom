-- Verificar se há triggers duplicados e corrigir o problema de duplicação
-- Primeiro, vamos verificar se existe algum problema no trigger

-- Verificar se o trigger está executando só uma vez
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON public.transactions;

-- Recriar o trigger de forma mais simples e segura
CREATE TRIGGER update_investment_balance_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_investment_balance();

-- Verificar se a função está correta e não tem lógica duplicada
-- Vamos adicionar um log único para detectar execuções múltiplas
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
$function$;
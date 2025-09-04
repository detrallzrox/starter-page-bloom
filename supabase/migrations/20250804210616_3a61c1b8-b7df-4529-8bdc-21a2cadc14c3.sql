-- Verificar se existe múltiplos triggers sendo executados para o mesmo evento
-- Primeiro, vamos verificar a configuração atual do trigger

-- Remover o trigger antigo se existir e recriar com configuração correta
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON transactions;

-- Recriar o trigger apenas para INSERT (não UPDATE/DELETE para evitar duplicações)
CREATE TRIGGER update_investment_balance_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_balance();

-- Verificar se não há invalidações duplas criando logs para debug
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
  -- Log mais detalhado para debug
  RAISE LOG 'TRIGGER EXECUTADO: Operação: %, Transaction ID: %, User ID: %, Amount: %, Description: %', 
    TG_OP, COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id), COALESCE(NEW.amount, OLD.amount), COALESCE(NEW.description, OLD.description);

  -- Handle INSERT APENAS (outros eventos foram removidos do trigger)
  IF TG_OP = 'INSERT' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = NEW.category_id;
    
    RAISE LOG 'INSERT - Category type: %, Amount: %', category_type, NEW.amount;
    
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
          current_balance = COALESCE(current_balance, 0) - NEW.amount,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'SAVINGS transaction - Added % to investment, removed % from current', NEW.amount, NEW.amount;
    ELSIF NEW.type = 'expense' THEN
      -- Regular expense: decrease current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - NEW.amount,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE LOG 'EXPENSE transaction - Removed % from current balance', NEW.amount;
    ELSIF NEW.type = 'income' THEN
      -- Regular income: increase current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount,
          updated_at = NOW()
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
  
  RETURN NULL;
END;
$function$;
-- Create trigger function to handle transaction deletion
CREATE OR REPLACE FUNCTION public.reverse_investment_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Create the DELETE trigger
CREATE TRIGGER reverse_investment_balance_trigger
  BEFORE DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_investment_balance();

-- Also update the existing trigger to handle UPDATE operations
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON public.transactions;

CREATE TRIGGER update_investment_balance_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_balance();
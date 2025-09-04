-- First, fix the constraint to allow 'savings' type for investments
ALTER TABLE public.categories 
DROP CONSTRAINT IF EXISTS categories_type_check;

ALTER TABLE public.categories 
ADD CONSTRAINT categories_type_check 
CHECK (type IN ('expense', 'income', 'savings'));

-- Add investment_balance to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS investment_balance NUMERIC DEFAULT 0;

-- Create function to update balances based on transactions
CREATE OR REPLACE FUNCTION public.update_investment_balance()
RETURNS TRIGGER AS $$
DECLARE
  category_type TEXT;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get category type
    SELECT c.type INTO category_type
    FROM public.categories c
    WHERE c.id = NEW.category_id;
    
    -- Update balances based on category type and transaction type
    IF category_type = 'savings' THEN
      -- Investment transaction: increase investment_balance, decrease current_balance
      UPDATE public.profiles 
      SET investment_balance = COALESCE(investment_balance, 0) + NEW.amount,
          current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
    ELSIF NEW.type = 'expense' THEN
      -- Regular expense: decrease current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) - NEW.amount
      WHERE user_id = NEW.user_id;
    ELSIF NEW.type = 'income' THEN
      -- Regular income: increase current_balance
      UPDATE public.profiles 
      SET current_balance = COALESCE(current_balance, 0) + NEW.amount
      WHERE user_id = NEW.user_id;
    END IF;
    
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
$$ LANGUAGE plpgsql;

-- Create trigger for balance updates
DROP TRIGGER IF EXISTS update_investment_balance_trigger ON public.transactions;
CREATE TRIGGER update_investment_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_investment_balance();
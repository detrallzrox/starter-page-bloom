-- Add period_type column to category_budgets table
ALTER TABLE public.category_budgets 
ADD COLUMN period_type TEXT NOT NULL DEFAULT 'monthly';

-- Add check constraint for valid period types
ALTER TABLE public.category_budgets 
ADD CONSTRAINT period_type_check 
CHECK (period_type IN ('daily', 'weekly', 'monthly', 'semiannual', 'annual'));
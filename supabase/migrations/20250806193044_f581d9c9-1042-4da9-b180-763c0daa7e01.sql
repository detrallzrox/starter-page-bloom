-- Criar constraint única para evitar orçamentos duplicados por usuário, categoria e período
ALTER TABLE public.category_budgets
ADD CONSTRAINT unique_user_category_period 
UNIQUE (user_id, category_id, period_start, period_end);
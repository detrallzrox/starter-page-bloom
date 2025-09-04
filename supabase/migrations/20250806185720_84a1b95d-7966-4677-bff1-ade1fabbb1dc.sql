-- Criar tabela para orçamentos por categoria
CREATE TABLE public.category_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  budget_amount NUMERIC NOT NULL CHECK (budget_amount > 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, period_start, period_end)
);

-- Enable Row Level Security
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para category_budgets
CREATE POLICY "Users can view their own category budgets" 
ON public.category_budgets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category budgets" 
ON public.category_budgets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category budgets" 
ON public.category_budgets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category budgets" 
ON public.category_budgets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para contas compartilhadas
CREATE POLICY "Shared account users can view owner category budgets" 
ON public.category_budgets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = category_budgets.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

CREATE POLICY "Shared account users can insert owner category budgets" 
ON public.category_budgets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = category_budgets.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

CREATE POLICY "Shared account users can update owner category budgets" 
ON public.category_budgets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = category_budgets.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

CREATE POLICY "Shared account users can delete owner category budgets" 
ON public.category_budgets 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM shared_accounts 
  WHERE owner_id = category_budgets.user_id 
  AND shared_with_id = auth.uid() 
  AND status = 'accepted'
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_category_budgets_updated_at
BEFORE UPDATE ON public.category_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
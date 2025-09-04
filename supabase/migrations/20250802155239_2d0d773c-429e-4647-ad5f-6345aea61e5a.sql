-- Criar tabela para armazenar compras parceladas
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL,
  current_installment INTEGER NOT NULL DEFAULT 1,
  first_payment_date DATE NOT NULL,
  last_payment_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  category_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can manage their own installments" 
ON public.installments 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Shared account users can view installments" 
ON public.installments 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE (
      (shared_accounts.owner_id = auth.uid() AND shared_accounts.shared_with_id = installments.user_id AND shared_accounts.status = 'accepted') OR
      (shared_accounts.shared_with_id = auth.uid() AND shared_accounts.owner_id = installments.user_id AND shared_accounts.status = 'accepted')
    )
  ))
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_installments_updated_at
BEFORE UPDATE ON public.installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
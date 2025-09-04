-- Adicionar coluna frequency à tabela subscriptions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='frequency') THEN
        ALTER TABLE public.subscriptions ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly';
    END IF;
END $$;

-- Criar check constraint para frequency se não existir  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name='subscriptions_frequency_check') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_frequency_check 
        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'semiannually', 'annually'));
    END IF;
END $$;

-- Atualizar todas as assinaturas existentes que não têm frequency definida
UPDATE public.subscriptions 
SET frequency = 'monthly' 
WHERE frequency IS NULL OR frequency = '';

-- Adicionar coluna renewal_date à tabela subscriptions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='renewal_date') THEN
        ALTER TABLE public.subscriptions ADD COLUMN renewal_date DATE;
    END IF;
END $$;
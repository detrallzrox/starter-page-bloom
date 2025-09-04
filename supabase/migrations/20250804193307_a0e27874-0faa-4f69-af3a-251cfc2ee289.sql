-- Verificar se a constraint já existe
DO $$ 
BEGIN
    -- Adicionar constraint única se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'subscribers' 
        AND constraint_name = 'subscribers_user_id_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE public.subscribers 
        ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);
    END IF;
END $$;
-- Verificação final e criação de categorias padrão

-- 1. Verificar se o cron job foi criado
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'process-daily-notifications';

-- 2. Criar categorias padrão apenas se não existirem
DO $$
BEGIN
    -- Verificar se já existem categorias padrão
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE is_default = true LIMIT 1) THEN
        INSERT INTO public.categories (name, type, color, icon, is_default) VALUES
        ('Alimentação', 'expense', '#ef4444', '🍽️', true),
        ('Transporte', 'expense', '#f97316', '🚗', true),
        ('Moradia', 'expense', '#06b6d4', '🏠', true),
        ('Saúde', 'expense', '#10b981', '🏥', true),
        ('Educação', 'expense', '#8b5cf6', '📚', true),
        ('Lazer', 'expense', '#ec4899', '🎉', true),
        ('Salário', 'income', '#22c55e', '💼', true),
        ('Freelance', 'income', '#84cc16', '💻', true),
        ('Investimentos', 'income', '#06b6d4', '📈', true),
        ('Outros', 'expense', '#6b7280', '📦', true);
    END IF;
END $$;

-- 3. Verificar estatísticas finais
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM public.profiles;  
SELECT COUNT(*) as total_subscribers FROM public.subscribers;
SELECT COUNT(*) as total_categories FROM public.categories WHERE is_default = true;
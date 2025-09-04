-- Resolver problemas de segurança do Supabase

-- 1. Mover extensão pg_net do schema public para extensions (se existir)
-- Verificar se a extensão pg_net existe no schema public
DO $$
BEGIN
    -- Não podemos mover extensões diretamente, mas podemos verificar
    -- Se pg_net está no public, isso geralmente é feito automaticamente pelo Supabase
    -- Vamos verificar se existe e deixar o Supabase gerenciar
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'pg_net'
    ) THEN
        RAISE NOTICE 'pg_net extension encontrada - managed by Supabase';
    END IF;
END $$;

-- 2. Configurar OTP expiry para um valor mais seguro (reduzir de padrão para 1 hora)
-- Isso precisa ser feito via configuração do Auth, não SQL
-- Mas vamos documentar a necessidade

-- 3. As configurações de segurança Auth precisam ser ajustadas no dashboard
-- Vamos criar uma notificação para lembrar o usuário

INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
) 
SELECT 
    auth.uid(),
    'Configurações de Segurança',
    'Configure: 1) OTP expiry para 1 hora, 2) Habilite proteção de senha vazada no dashboard Auth do Supabase',
    'security'
WHERE auth.uid() IS NOT NULL;
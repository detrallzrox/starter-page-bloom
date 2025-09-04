-- Criar constraint única para evitar notificações duplicadas
-- Isso vai garantir que não haja duas notificações do mesmo tipo, para o mesmo usuário, referência e tipo de referência no mesmo dia

-- Primeiro, remover duplicatas existentes se houver
DELETE FROM notifications 
WHERE id NOT IN (
  SELECT MIN(id)
  FROM notifications
  GROUP BY user_id, type, reference_id, reference_type, DATE(created_at)
);

-- Criar índice único composto para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_daily 
ON notifications (user_id, type, reference_id, reference_type, DATE(created_at))
WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL;
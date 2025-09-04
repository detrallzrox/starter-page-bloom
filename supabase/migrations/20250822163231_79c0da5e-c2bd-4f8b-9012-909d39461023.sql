-- Remover duplicatas existentes baseado na data de criação mais antiga
DELETE FROM notifications 
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id, type, reference_id, reference_type, DATE(created_at)) ctid
  FROM notifications
  WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL
  ORDER BY user_id, type, reference_id, reference_type, DATE(created_at), created_at ASC
);

-- Criar constraint única para evitar notificações duplicadas no mesmo dia
ALTER TABLE notifications 
ADD CONSTRAINT unique_notification_daily 
UNIQUE (user_id, type, reference_id, reference_type, DATE(created_at));

-- Também configurar a tabela para real-time updates
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- Remover duplicatas existentes primeiro
WITH numbered_notifications AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, type, reference_id, reference_type, DATE(created_at)
           ORDER BY created_at ASC
         ) as rn
  FROM notifications
  WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL
)
DELETE FROM notifications 
WHERE id IN (
  SELECT id FROM numbered_notifications WHERE rn > 1
);

-- Criar função para extrair data da timestamp
CREATE OR REPLACE FUNCTION date_trunc_day(timestamp with time zone)
RETURNS date AS $$
BEGIN
  RETURN $1::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar índice único funcional para evitar duplicatas diárias
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_daily_func
ON notifications (user_id, type, reference_id, reference_type, date_trunc_day(created_at))
WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL;
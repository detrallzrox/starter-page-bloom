-- Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.check_device_limit()
RETURNS TRIGGER AS $$
DECLARE
  ip_count INTEGER;
  device_count INTEGER;
BEGIN
  -- Contar contas por IP
  SELECT COUNT(DISTINCT user_id) INTO ip_count
  FROM public.device_registrations
  WHERE ip_address = NEW.ip_address;
  
  -- Contar contas por device fingerprint
  SELECT COUNT(DISTINCT user_id) INTO device_count
  FROM public.device_registrations
  WHERE device_fingerprint = NEW.device_fingerprint;
  
  -- Verificar limites
  IF ip_count >= 10 OR device_count >= 10 THEN
    RAISE EXCEPTION 'Limite de contas por dispositivo/IP atingido (máximo 10 contas)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
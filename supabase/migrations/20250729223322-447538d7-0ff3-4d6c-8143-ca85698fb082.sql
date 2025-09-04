-- Tabela para rastrear dispositivos e IPs
CREATE TABLE public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  device_fingerprint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_device_registrations_ip ON public.device_registrations(ip_address);
CREATE INDEX idx_device_registrations_fingerprint ON public.device_registrations(device_fingerprint);

-- Tabela para contas compartilhadas
CREATE TABLE public.shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(owner_id, shared_with_id)
);

-- Tabela para lembretes de contas
CREATE TABLE public.bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  category TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  logo_type TEXT NOT NULL DEFAULT 'bill',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para assinaturas
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  renewal_day INTEGER NOT NULL CHECK (renewal_day >= 1 AND renewal_day <= 31),
  category TEXT NOT NULL,
  logo_type TEXT NOT NULL DEFAULT 'subscription',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_charged TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para device_registrations
CREATE POLICY "Users can view their own device registrations" 
ON public.device_registrations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert device registrations" 
ON public.device_registrations FOR INSERT 
WITH CHECK (true);

-- RLS Policies para shared_accounts
CREATE POLICY "Users can view their shared accounts" 
ON public.shared_accounts FOR SELECT 
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can create shared accounts" 
ON public.shared_accounts FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their shared accounts" 
ON public.shared_accounts FOR UPDATE 
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

-- RLS Policies para bill_reminders
CREATE POLICY "Users can manage their own bill reminders" 
ON public.bill_reminders FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Shared account users can view bill reminders"
ON public.bill_reminders FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.shared_accounts 
    WHERE (owner_id = auth.uid() AND shared_with_id = bill_reminders.user_id AND status = 'accepted')
    OR (shared_with_id = auth.uid() AND owner_id = bill_reminders.user_id AND status = 'accepted')
  )
);

-- RLS Policies para subscriptions
CREATE POLICY "Users can manage their own subscriptions" 
ON public.subscriptions FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Shared account users can view subscriptions"
ON public.subscriptions FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.shared_accounts 
    WHERE (owner_id = auth.uid() AND shared_with_id = subscriptions.user_id AND status = 'accepted')
    OR (shared_with_id = auth.uid() AND owner_id = subscriptions.user_id AND status = 'accepted')
  )
);

-- Função para verificar limite de dispositivos
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar limite
CREATE TRIGGER check_device_limit_trigger
  BEFORE INSERT ON public.device_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_device_limit();

-- Função para atualizar timestamps
CREATE TRIGGER update_device_registrations_updated_at
  BEFORE UPDATE ON public.device_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bill_reminders_updated_at
  BEFORE UPDATE ON public.bill_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
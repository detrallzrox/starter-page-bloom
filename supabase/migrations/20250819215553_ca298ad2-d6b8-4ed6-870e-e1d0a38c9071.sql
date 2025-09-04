-- Remove trial logic and make all new accounts start as Free
-- Also add phone number saving as requested
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with phone number support
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Create subscriber record as Free (no trial)
  INSERT INTO public.subscribers (user_id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  
  -- Welcome notification (no mention of trial)
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.id,
    'Bem-Vindo ao Finaudy',
    'Você ganhou 3 testes gratuitos para testar todas as funcionalidades premium.',
    'welcome'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
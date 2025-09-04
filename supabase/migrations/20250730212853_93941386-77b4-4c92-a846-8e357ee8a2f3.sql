-- Expirar trial da conta detrallzrox@gmail.com para testes
UPDATE subscribers 
SET trial_end = NOW() - INTERVAL '1 day' 
WHERE email = 'detrallzrox@gmail.com' AND subscribed = false;
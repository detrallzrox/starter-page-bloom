-- Atualizar uma parcela da Televisão para ter receipt_url para teste
UPDATE installments 
SET receipt_url = 'https://jwizzrqgchmsstwadtth.supabase.co/storage/v1/object/public/receipts/7bc61754-9c8d-4e5d-9320-5fa583581c22/receipt-1754326320412.jpg' 
WHERE purchase_name = 'Televisão' AND current_installment = 1;
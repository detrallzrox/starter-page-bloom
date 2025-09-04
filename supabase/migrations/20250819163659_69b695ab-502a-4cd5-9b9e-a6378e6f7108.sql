-- Remove the 👥 emoji from notification titles
UPDATE notifications 
SET title = TRIM(REPLACE(title, '👥', ''))
WHERE title LIKE '%👥%';
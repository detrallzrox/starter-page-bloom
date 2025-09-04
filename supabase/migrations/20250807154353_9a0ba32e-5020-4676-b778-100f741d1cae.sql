-- Add "Outros" category for income if it doesn't exist
INSERT INTO categories (name, type, icon, color) 
SELECT 'Outros', 'income', 'DollarSign', '#22c55e'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Outros' AND type = 'income'
);
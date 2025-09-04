-- Update RLS policies to allow shared account access

-- Update transactions policies to allow shared account access
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions and shared accounts" 
ON transactions FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE (
      (owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted') OR
      (owner_id = auth.uid() AND shared_with_id = user_id AND status = 'accepted')
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
CREATE POLICY "Users can create their own transactions and shared accounts" 
ON transactions FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions and shared accounts" 
ON transactions FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions and shared accounts" 
ON transactions FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

-- Update categories policies to allow shared account access
DROP POLICY IF EXISTS "Users can view their own categories and default ones" ON categories;
CREATE POLICY "Users can view their own categories, default ones and shared accounts" 
ON categories FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_default = true OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
CREATE POLICY "Users can create their own categories and shared accounts" 
ON categories FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories and shared accounts" 
ON categories FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

-- Update profiles policies to allow shared account access
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile and shared accounts" 
ON profiles FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile and shared accounts" 
ON profiles FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE owner_id = user_id AND shared_with_id = auth.uid() AND status = 'accepted'
  )
);
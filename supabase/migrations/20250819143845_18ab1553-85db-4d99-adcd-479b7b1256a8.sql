-- Update notifications UPDATE policy to allow shared account users to mark notifications as read
DROP POLICY "Users can update their own notifications" ON notifications;

CREATE POLICY "Users and shared accounts can update notifications"
ON notifications
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 FROM shared_accounts 
    WHERE ((shared_accounts.owner_id = notifications.user_id AND shared_accounts.shared_with_id = auth.uid()) OR
           (shared_accounts.shared_with_id = notifications.user_id AND shared_accounts.owner_id = auth.uid()))
    AND shared_accounts.status = 'accepted'
  ))
);
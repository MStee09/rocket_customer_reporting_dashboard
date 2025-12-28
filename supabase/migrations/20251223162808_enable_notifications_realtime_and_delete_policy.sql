/*
  # Enable Notifications Realtime and Delete Policy

  1. Changes
    - Enable realtime subscriptions for the notifications table
    - Add RLS policy allowing users to delete their own notifications
  
  2. Security
    - Users can only delete notifications they own
    - Realtime updates are filtered by user_id on the client side
*/

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

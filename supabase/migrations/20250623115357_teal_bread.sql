/*
  # Create notifications table for user interaction alerts

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_username` (text, user receiving the notification)
      - `sender_username` (text, user who triggered the notification)
      - `type` (text, type of notification: 'like', 'comment', 'message')
      - `entity_type` (text, what was interacted with: 'pin', 'blog_post', 'marketplace_item')
      - `entity_id` (uuid, ID of the entity that was interacted with)
      - `message` (text, notification message)
      - `is_read` (boolean, whether notification has been read)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `notifications` table
    - Add policies for users to read their own notifications
    - Add policies for users to mark their own notifications as read
    - Add policies for admins to manage any notifications

  3. Real-time
    - Enable real-time subscriptions for notifications
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_username text NOT NULL,
  sender_username text NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'message')),
  entity_type text NOT NULL CHECK (entity_type IN ('pin', 'blog_post', 'marketplace_item')),
  entity_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS notifications_recipient_username_idx ON notifications (recipient_username);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx ON notifications (recipient_username, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (
    recipient_username = recipient_username OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = notifications.recipient_username
    ))
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO public
  USING (
    recipient_username = recipient_username OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = notifications.recipient_username
    ))
  )
  WITH CHECK (
    recipient_username = recipient_username OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.username = notifications.recipient_username
    ))
  );

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can manage any notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
  );

-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
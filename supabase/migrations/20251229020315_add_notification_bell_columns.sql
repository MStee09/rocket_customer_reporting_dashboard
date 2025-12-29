/*
  # Add notification bell columns

  1. Changes
    - Add `priority` column for notification importance (low, medium, high, urgent)
    - Add `action_url` column for clickable navigation
    - Add `action_label` column for action button text
    - Add `metadata` column for additional notification data

  2. Indexes
    - Add index on priority for filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority text DEFAULT 'medium';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_label'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_label text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

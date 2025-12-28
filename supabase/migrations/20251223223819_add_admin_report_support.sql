/*
  # Add Admin Report Support to Scheduled Reports

  1. New Columns
    - `report_scope` (text) - 'customer' for customer-facing reports, 'admin' for internal Go Rocket reports
    - `target_customer_ids` (integer[]) - For admin reports: NULL = all customers, or specific customer IDs
    - `created_by_user_id` (uuid) - Reference to the user who created the schedule

  2. Changes
    - Updates existing records to have report_scope = 'customer'
    - Adds check constraint for report_scope values

  3. Notes
    - Customer reports are sent to customers
    - Admin reports are for internal Go Rocket use only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_reports' AND column_name = 'report_scope'
  ) THEN
    ALTER TABLE scheduled_reports 
    ADD COLUMN report_scope TEXT DEFAULT 'customer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_reports' AND column_name = 'target_customer_ids'
  ) THEN
    ALTER TABLE scheduled_reports 
    ADD COLUMN target_customer_ids INTEGER[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_reports' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE scheduled_reports 
    ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

ALTER TABLE scheduled_reports 
DROP CONSTRAINT IF EXISTS scheduled_reports_report_scope_check;

ALTER TABLE scheduled_reports 
ADD CONSTRAINT scheduled_reports_report_scope_check 
CHECK (report_scope IN ('customer', 'admin'));

UPDATE scheduled_reports 
SET report_scope = 'customer' 
WHERE report_scope IS NULL;

COMMENT ON COLUMN scheduled_reports.report_scope IS 'customer = sent to customer, admin = internal Go Rocket use';
COMMENT ON COLUMN scheduled_reports.target_customer_ids IS 'For admin reports: NULL = all customers, or specific customer IDs';
COMMENT ON COLUMN scheduled_reports.created_by_user_id IS 'UUID of the user who created this schedule';
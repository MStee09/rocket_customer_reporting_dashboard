/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys to improve join performance
    - These indexes are critical for query optimization
  
  2. Indexes Added
    - ai_report_audit.reviewed_by
    - notifications.scheduled_report_id
    - notifications.scheduled_run_id
    - shared_reports.scheduled_report_id
    - shared_reports.scheduled_run_id
    - shipment.equipment_type_id
    - shipment.payer_id
    - users_customers.created_by

  3. Notes
    - Uses IF NOT EXISTS to avoid errors if indexes already exist
    - Foreign key indexes significantly improve join performance
*/

-- Add index for ai_report_audit.reviewed_by
CREATE INDEX IF NOT EXISTS idx_ai_report_audit_reviewed_by 
  ON ai_report_audit(reviewed_by);

-- Add index for notifications.scheduled_report_id
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_report_id 
  ON notifications(scheduled_report_id);

-- Add index for notifications.scheduled_run_id
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_run_id 
  ON notifications(scheduled_run_id);

-- Add index for shared_reports.scheduled_report_id
CREATE INDEX IF NOT EXISTS idx_shared_reports_scheduled_report_id 
  ON shared_reports(scheduled_report_id);

-- Add index for shared_reports.scheduled_run_id
CREATE INDEX IF NOT EXISTS idx_shared_reports_scheduled_run_id 
  ON shared_reports(scheduled_run_id);

-- Add index for shipment.equipment_type_id
CREATE INDEX IF NOT EXISTS idx_shipment_equipment_type_id 
  ON shipment(equipment_type_id);

-- Add index for shipment.payer_id
CREATE INDEX IF NOT EXISTS idx_shipment_payer_id 
  ON shipment(payer_id);

-- Add index for users_customers.created_by
CREATE INDEX IF NOT EXISTS idx_users_customers_created_by 
  ON users_customers(created_by);

/*
  # Add Missing Foreign Key Index

  1. Performance Improvements
    - Add index on `scheduled_reports.created_by_user_id` to improve foreign key constraint performance
    
  2. Notes
    - This index was missing despite the foreign key constraint existing
    - Improves JOIN and DELETE cascade performance
*/

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by_user_id 
  ON scheduled_reports(created_by_user_id);
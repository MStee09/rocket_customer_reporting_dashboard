/*
  # Add RLS Policies for Lookup Tables

  1. Tables Updated
    - `shipment_mode` - Add SELECT policy for all authenticated users
    - `shipment_status` - Add SELECT policy for all authenticated users
    - `equipment_type` - Add SELECT policy for all authenticated users (if exists)
  
  2. Security
    - These are reference/lookup tables that should be readable by all authenticated users
    - No sensitive customer data in these tables
    - Required for dashboard queries to work with joins
  
  3. Changes
    - Enable RLS on lookup tables
    - Add SELECT policies for authenticated users
*/

-- Enable RLS on lookup tables if not already enabled
ALTER TABLE shipment_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view shipment modes" ON shipment_mode;
DROP POLICY IF EXISTS "All authenticated users can view shipment statuses" ON shipment_status;

-- Allow all authenticated users to read lookup tables
CREATE POLICY "All authenticated users can view shipment modes"
  ON shipment_mode
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view shipment statuses"
  ON shipment_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for equipment_type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'equipment_type'
  ) THEN
    EXECUTE 'ALTER TABLE equipment_type ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can view equipment types" ON equipment_type';
    EXECUTE 'CREATE POLICY "All authenticated users can view equipment types" ON equipment_type FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

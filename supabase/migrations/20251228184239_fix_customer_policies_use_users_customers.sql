/*
  # Fix Customer Policies to Use users_customers Table

  1. Problem
    - Many policies incorrectly reference user_roles.customer_id
    - user_roles table only has: id, user_id, user_role
    - Should use users_customers table which has the customer_id mapping
    
  2. Solution
    - Update all customer-related policies to use users_customers table
    - Maintain optimized (select auth.uid()) pattern
    
  3. Tables Fixed
    - customer, shipment, carrier
    - shipment_address, shipment_carrier, shipment_detail
    - shipment_item, shipment_note, shipment_accessorial
    - shared_reports, glossary_customer, scheduled_report_runs
*/

-- Fix customer table
DROP POLICY IF EXISTS "Customers can view their assigned customers" ON customer;
CREATE POLICY "Customers can view their assigned customers"
  ON customer FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

-- Fix shipment table
DROP POLICY IF EXISTS "Customers can view their assigned shipments" ON shipment;
CREATE POLICY "Customers can view their assigned shipments"
  ON shipment FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

-- Fix carrier table
DROP POLICY IF EXISTS "Customers can view carriers for their shipments" ON carrier;
CREATE POLICY "Customers can view carriers for their shipments"
  ON carrier FOR SELECT
  TO authenticated
  USING (
    carrier_id IN (
      SELECT DISTINCT shipment.rate_carrier_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_address
DROP POLICY IF EXISTS "Customers can view shipment addresses for their shipments" ON shipment_address;
CREATE POLICY "Customers can view shipment addresses for their shipments"
  ON shipment_address FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_carrier
DROP POLICY IF EXISTS "Customers can view shipment carriers for their shipments" ON shipment_carrier;
CREATE POLICY "Customers can view shipment carriers for their shipments"
  ON shipment_carrier FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_detail
DROP POLICY IF EXISTS "Customers can view shipment details for their shipments" ON shipment_detail;
CREATE POLICY "Customers can view shipment details for their shipments"
  ON shipment_detail FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_item
DROP POLICY IF EXISTS "Customers can view shipment items for their shipments" ON shipment_item;
CREATE POLICY "Customers can view shipment items for their shipments"
  ON shipment_item FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_note
DROP POLICY IF EXISTS "Customers can view shipment notes for their shipments" ON shipment_note;
CREATE POLICY "Customers can view shipment notes for their shipments"
  ON shipment_note FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shipment_accessorial
DROP POLICY IF EXISTS "Customers can view shipment accessorials for their shipments" ON shipment_accessorial;
CREATE POLICY "Customers can view shipment accessorials for their shipments"
  ON shipment_accessorial FOR SELECT
  TO authenticated
  USING (
    load_id IN (
      SELECT shipment.load_id
      FROM shipment
      WHERE shipment.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );

-- Fix shared_reports
DROP POLICY IF EXISTS "Users can view shares for their customer" ON shared_reports;
CREATE POLICY "Users can view shares for their customer"
  ON shared_reports FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update shares for their customer" ON shared_reports;
CREATE POLICY "Users can update shares for their customer"
  ON shared_reports FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete shares for their customer" ON shared_reports;
CREATE POLICY "Users can delete shares for their customer"
  ON shared_reports FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

-- Fix glossary_customer
DROP POLICY IF EXISTS "Users can read own customer glossary" ON glossary_customer;
CREATE POLICY "Users can read own customer glossary"
  ON glossary_customer FOR SELECT
  TO authenticated
  USING (
    customer_id::integer IN (
      SELECT users_customers.customer_id
      FROM users_customers
      WHERE users_customers.user_id = (select auth.uid())
    )
  );

-- Fix scheduled_report_runs
DROP POLICY IF EXISTS "Users can view runs for their schedules" ON scheduled_report_runs;
CREATE POLICY "Users can view runs for their schedules"
  ON scheduled_report_runs FOR SELECT
  TO authenticated
  USING (
    scheduled_report_id IN (
      SELECT scheduled_reports.id
      FROM scheduled_reports
      WHERE scheduled_reports.customer_id IN (
        SELECT users_customers.customer_id
        FROM users_customers
        WHERE users_customers.user_id = (select auth.uid())
      )
    )
  );
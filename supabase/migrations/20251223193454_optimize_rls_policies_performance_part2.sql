/*
  # Optimize RLS Policies for Performance (Part 2)

  1. Changes
    - Continue optimizing RLS policies with SELECT wrappers
    - Covers customer, shipment, carrier, and dashboard_widgets tables
    - Improves query performance at scale

  2. Notes
    - Wraps auth.uid() and current_setting() calls in SELECT
    - Policies are dropped and recreated with optimized versions
*/

-- Optimize customer policies
DROP POLICY IF EXISTS "Admins can view all customers" ON customer;
CREATE POLICY "Admins can view all customers"
  ON customer
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view their assigned customers" ON customer;
CREATE POLICY "Customers can view their assigned customers"
  ON customer
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

-- Optimize shipment policies
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipment;
CREATE POLICY "Admins can view all shipments"
  ON shipment
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view their assigned shipments" ON shipment;
CREATE POLICY "Customers can view their assigned shipments"
  ON shipment
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

-- Optimize carrier policies
DROP POLICY IF EXISTS "Admins can view all carriers" ON carrier;
CREATE POLICY "Admins can view all carriers"
  ON carrier
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Customers can view carriers for their shipments" ON carrier;
CREATE POLICY "Customers can view carriers for their shipments"
  ON carrier
  FOR SELECT
  TO authenticated
  USING (
    carrier_id IN (
      SELECT DISTINCT rate_carrier_id FROM shipment
      WHERE customer_id IN (
        SELECT customer_id FROM user_roles WHERE user_id = (select auth.uid())
      )
    )
  );

-- Optimize client policies
DROP POLICY IF EXISTS "Admins can read all clients" ON client;
CREATE POLICY "Admins can read all clients"
  ON client
  FOR SELECT
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

-- Optimize users_customers policies
DROP POLICY IF EXISTS "Admins can manage customer access" ON users_customers;
CREATE POLICY "Admins can manage customer access"
  ON users_customers
  FOR ALL
  TO authenticated
  USING ((SELECT current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin');

DROP POLICY IF EXISTS "Users can view own customer access" ON users_customers;
CREATE POLICY "Users can view own customer access"
  ON users_customers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

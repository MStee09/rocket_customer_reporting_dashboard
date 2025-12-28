/*
  # Fix All Admin Policies to Use user_roles Table

  1. Problem
    - Admin policies check JWT claims for user_role, but JWT doesn't contain this data
    - This causes all admin checks to fail (return null = false)
    
  2. Solution
    - Update ALL admin policies to query user_roles table instead
    - Use optimized (select auth.uid()) pattern
    - Keep user_roles table policy using JWT (to avoid recursion)
    
  3. Tables Fixed
    - customer, carrier, shipment, client
    - All shipment-related tables
    - dashboard_widgets, ai_knowledge, glossary tables, field_business_context
    - users_customers
*/

-- Customer table
DROP POLICY IF EXISTS "Admins can view all customers" ON customer;
CREATE POLICY "Admins can view all customers"
  ON customer FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Carrier table
DROP POLICY IF EXISTS "Admins can view all carriers" ON carrier;
CREATE POLICY "Admins can view all carriers"
  ON carrier FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Shipment table
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipment;
CREATE POLICY "Admins can view all shipments"
  ON shipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Client table
DROP POLICY IF EXISTS "Admins can read all clients" ON client;
CREATE POLICY "Admins can read all clients"
  ON client FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Shipment-related tables
DROP POLICY IF EXISTS "Admins can view shipment addresses" ON shipment_address;
CREATE POLICY "Admins can view shipment addresses"
  ON shipment_address FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view shipment carriers" ON shipment_carrier;
CREATE POLICY "Admins can view shipment carriers"
  ON shipment_carrier FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view shipment details" ON shipment_detail;
CREATE POLICY "Admins can view shipment details"
  ON shipment_detail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view shipment items" ON shipment_item;
CREATE POLICY "Admins can view shipment items"
  ON shipment_item FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view shipment notes" ON shipment_note;
CREATE POLICY "Admins can view shipment notes"
  ON shipment_note FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view shipment accessorials" ON shipment_accessorial;
CREATE POLICY "Admins can view shipment accessorials"
  ON shipment_accessorial FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Dashboard widgets
DROP POLICY IF EXISTS "Admins can view all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can view all dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can insert dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can update all dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete any dashboard widgets" ON dashboard_widgets;
CREATE POLICY "Admins can delete any dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- AI Knowledge tables
DROP POLICY IF EXISTS "Admins can view all knowledge" ON ai_knowledge;
CREATE POLICY "Admins can view all knowledge"
  ON ai_knowledge FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert knowledge" ON ai_knowledge;
CREATE POLICY "Admins can insert knowledge"
  ON ai_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update knowledge" ON ai_knowledge;
CREATE POLICY "Admins can update knowledge"
  ON ai_knowledge FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete knowledge" ON ai_knowledge;
CREATE POLICY "Admins can delete knowledge"
  ON ai_knowledge FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- AI Knowledge Documents
DROP POLICY IF EXISTS "Admins can view all knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can view all knowledge documents"
  ON ai_knowledge_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can insert knowledge documents"
  ON ai_knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can update knowledge documents"
  ON ai_knowledge_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON ai_knowledge_documents;
CREATE POLICY "Admins can delete knowledge documents"
  ON ai_knowledge_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- AI Learning Feedback
DROP POLICY IF EXISTS "Admins can read all feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can read all feedback"
  ON ai_learning_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can insert feedback"
  ON ai_learning_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update feedback" ON ai_learning_feedback;
CREATE POLICY "Admins can update feedback"
  ON ai_learning_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- AI Report Audit
DROP POLICY IF EXISTS "Admins can view all audit logs" ON ai_report_audit;
CREATE POLICY "Admins can view all audit logs"
  ON ai_report_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update audit logs" ON ai_report_audit;
CREATE POLICY "Admins can update audit logs"
  ON ai_report_audit FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Field Business Context
DROP POLICY IF EXISTS "Admins can read all field context" ON field_business_context;
CREATE POLICY "Admins can read all field context"
  ON field_business_context FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert field context" ON field_business_context;
CREATE POLICY "Admins can insert field context"
  ON field_business_context FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update field context" ON field_business_context;
CREATE POLICY "Admins can update field context"
  ON field_business_context FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete field context" ON field_business_context;
CREATE POLICY "Admins can delete field context"
  ON field_business_context FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Glossary tables
DROP POLICY IF EXISTS "Admins can insert global glossary" ON glossary_global;
CREATE POLICY "Admins can insert global glossary"
  ON glossary_global FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update global glossary" ON glossary_global;
CREATE POLICY "Admins can update global glossary"
  ON glossary_global FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete global glossary" ON glossary_global;
CREATE POLICY "Admins can delete global glossary"
  ON glossary_global FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer glossary" ON glossary_customer;
CREATE POLICY "Admins can insert customer glossary"
  ON glossary_customer FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update customer glossary" ON glossary_customer;
CREATE POLICY "Admins can update customer glossary"
  ON glossary_customer FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete customer glossary" ON glossary_customer;
CREATE POLICY "Admins can delete customer glossary"
  ON glossary_customer FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can read learning queue"
  ON glossary_learning_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can insert learning queue"
  ON glossary_learning_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can update learning queue"
  ON glossary_learning_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete learning queue" ON glossary_learning_queue;
CREATE POLICY "Admins can delete learning queue"
  ON glossary_learning_queue FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read audit log" ON glossary_audit_log;
CREATE POLICY "Admins can read audit log"
  ON glossary_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );

-- Users Customers
DROP POLICY IF EXISTS "Admins can manage customer access" ON users_customers;
CREATE POLICY "Admins can manage customer access"
  ON users_customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (select auth.uid())
        AND user_role = 'admin'
    )
  );
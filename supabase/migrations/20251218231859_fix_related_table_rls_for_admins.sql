/*
  # Fix RLS Policies for Shipment Related Tables

  1. Problem
    - Admin policies on related tables (shipment_address, shipment_item, etc.) use `public` role
    - They try to check `EXISTS (SELECT FROM shipment)` but that query is blocked by RLS
    - This causes joins to fail when admins query shipments
  
  2. Solution
    - Change admin policies from `public` to `authenticated` role
    - Add explicit admin role check using user_roles table
    - This allows admins to access related records without circular RLS dependencies
  
  3. Affected Tables
    - shipment_address
    - shipment_item  
    - shipment_accessorial
    - shipment_carrier
    - shipment_note
    - shipment_detail
*/

-- Fix shipment_address policies
DROP POLICY IF EXISTS "Admins can view shipment addresses" ON shipment_address;

CREATE POLICY "Admins can view shipment addresses"
  ON shipment_address
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix shipment_item policies
DROP POLICY IF EXISTS "Admins can view shipment items" ON shipment_item;

CREATE POLICY "Admins can view shipment items"
  ON shipment_item
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix shipment_accessorial policies
DROP POLICY IF EXISTS "Admins can view shipment accessorials" ON shipment_accessorial;

CREATE POLICY "Admins can view shipment accessorials"
  ON shipment_accessorial
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix shipment_carrier policies  
DROP POLICY IF EXISTS "Admins can view shipment carriers" ON shipment_carrier;

CREATE POLICY "Admins can view shipment carriers"
  ON shipment_carrier
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix shipment_note policies
DROP POLICY IF EXISTS "Admins can view shipment notes" ON shipment_note;

CREATE POLICY "Admins can view shipment notes"
  ON shipment_note
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

-- Fix shipment_detail policies
DROP POLICY IF EXISTS "Admins can view shipment details" ON shipment_detail;

CREATE POLICY "Admins can view shipment details"
  ON shipment_detail
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

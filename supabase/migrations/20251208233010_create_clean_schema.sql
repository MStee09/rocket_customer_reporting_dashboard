/*
  # Create Clean TMS Database Schema

  1. New Tables
    - `role` - User roles (admin, customer)
    - `user_roles` - Links users to roles
    - `customer` - Customer companies
    - `carrier` - Carrier companies
    - `shipment_status` - Shipment status options
    - `shipment_mode` - Transportation modes
    - `equipment_type` - Equipment types
    - `shipment` - Main shipment records
    - `shipment_stop` - Pickup and delivery stops
    - `shipment_document` - Document attachments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict customer users to their own data
*/

-- Role table
CREATE TABLE IF NOT EXISTS role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  is_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles"
  ON role FOR SELECT
  TO authenticated
  USING (true);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES role(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Customer table
CREATE TABLE IF NOT EXISTS customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text UNIQUE NOT NULL,
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all customers"
  ON customer FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

CREATE POLICY "Admins can manage customers"
  ON customer FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Carrier table
CREATE TABLE IF NOT EXISTS carrier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name text UNIQUE NOT NULL,
  mc_number text DEFAULT '',
  dot_number text DEFAULT '',
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE carrier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view carriers"
  ON carrier FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage carriers"
  ON carrier FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Shipment status table
CREATE TABLE IF NOT EXISTS shipment_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_completed boolean DEFAULT false,
  is_cancelled boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

ALTER TABLE shipment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view statuses"
  ON shipment_status FOR SELECT
  TO authenticated
  USING (true);

-- Shipment mode table
CREATE TABLE IF NOT EXISTS shipment_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT ''
);

ALTER TABLE shipment_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view modes"
  ON shipment_mode FOR SELECT
  TO authenticated
  USING (true);

-- Equipment type table
CREATE TABLE IF NOT EXISTS equipment_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT ''
);

ALTER TABLE equipment_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment types"
  ON equipment_type FOR SELECT
  TO authenticated
  USING (true);

-- Shipment table
CREATE TABLE IF NOT EXISTS shipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number text UNIQUE NOT NULL,
  reference_number text DEFAULT '',
  customer_id uuid REFERENCES customer(id),
  carrier_id uuid REFERENCES carrier(id),
  status_id uuid REFERENCES shipment_status(id),
  mode_id uuid REFERENCES shipment_mode(id),
  equipment_type_id uuid REFERENCES equipment_type(id),
  pickup_date date,
  delivery_date date,
  revenue numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE shipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all shipments"
  ON shipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

CREATE POLICY "Admins can manage shipments"
  ON shipment FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Shipment stop table
CREATE TABLE IF NOT EXISTS shipment_stop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipment(id) ON DELETE CASCADE,
  stop_number integer NOT NULL,
  stop_type text NOT NULL CHECK (stop_type IN ('pickup', 'delivery')),
  company_name text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  scheduled_date date,
  scheduled_time text DEFAULT '',
  actual_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipment_stop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all stops"
  ON shipment_stop FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

CREATE POLICY "Admins can manage stops"
  ON shipment_stop FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Shipment document table
CREATE TABLE IF NOT EXISTS shipment_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipment(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE shipment_document ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all documents"
  ON shipment_document FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

CREATE POLICY "Admins can manage documents"
  ON shipment_document FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.is_admin = true
    )
  );

-- Insert default roles
INSERT INTO role (name, is_admin, is_customer) VALUES
  ('Admin', true, false),
  ('Customer', false, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default statuses
INSERT INTO shipment_status (name, is_completed, is_cancelled, sort_order) VALUES
  ('Quoted', false, false, 1),
  ('Booked', false, false, 2),
  ('Dispatched', false, false, 3),
  ('In Transit', false, false, 4),
  ('Delivered', true, false, 5),
  ('Cancelled', false, true, 6)
ON CONFLICT (name) DO NOTHING;

-- Insert default modes
INSERT INTO shipment_mode (name, description) VALUES
  ('FTL', 'Full Truckload'),
  ('LTL', 'Less Than Truckload'),
  ('Intermodal', 'Rail and Truck'),
  ('Drayage', 'Port to Warehouse')
ON CONFLICT (name) DO NOTHING;

-- Insert default equipment types
INSERT INTO equipment_type (name, description) VALUES
  ('Dry Van', 'Standard enclosed trailer'),
  ('Flatbed', 'Open flatbed trailer'),
  ('Reefer', 'Refrigerated trailer'),
  ('Step Deck', 'Drop deck trailer'),
  ('Power Only', 'Tractor only'),
  ('Box Truck', 'Straight truck')
ON CONFLICT (name) DO NOTHING;

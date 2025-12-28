// User and Authentication Types
export interface UserRole {
  id: number;
  user_id: string;
  user_role: 'admin' | 'customer';
}

export interface UsersCustomers {
  id: number;
  user_id: string;
  customer_id: number;
  created_at: string | null;
  created_by: string | null;
}

// Reference Tables
export interface ShipmentStatus {
  status_id: number;
  status_code: string;
  status_name: string;
  status_description: string | null;
  display_order: number;
  is_active: boolean;
  is_completed: boolean;
  is_cancelled: boolean;
}

export interface ShipmentMode {
  mode_id: number;
  mode_code: string;
  mode_name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_date: string;
  modified_date: string | null;
}

export interface EquipmentType {
  equipment_type_id: number;
  equipment_code: string;
  equipment_name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_date: string;
  modified_date: string | null;
}

// Core Business Entities
export interface Client {
  client_id: number;
  client_name: string;
  website: string | null;
  email_address: string | null;
  default_email: string | null;
  logo: string | null;
  theme_name: string | null;
  time_zone: string | null;
  has_accepted_terms: boolean;
  stripe_customer_id: string | null;
  created_by: string | null;
  created_date: string;
  modified_by: string | null;
  modified_date: string | null;
  disable_date: string | null;
}

export interface Customer {
  customer_id: number;
  client_id: number;
  company_name: string;
  is_active: boolean;
  is_on_hold: boolean;
  comments: string | null;
  logo: string | null;
  external_customer_id: string | null;
  guid: string;
  created_by: string | null;
  created_date: string;
  modified_by: string | null;
  modified_date: string | null;
}

export interface Carrier {
  carrier_id: number;
  client_id: number;
  carrier_name: string;
  status: number;
  notes: string | null;
  dot_number: string | null;
  mc_number: string | null;
  scac: string | null;
  website: string | null;
  account_number: string | null;
  currency_code: string | null;
  guid: string;
  created_by: string | null;
  created_date: string;
  modified_by: string | null;
  modified_date: string | null;
  disable_date: string | null;
}

// Shipment Tables
export interface Shipment {
  load_id: number;
  client_id: number;
  client_load_id: number;
  customer_id: number;
  payer_id: number;
  payer_address_id: number;
  mode_id: number;
  equipment_type_id: number;
  status_id: number;
  created_date: string;
  modified_date: string | null;
  pickup_date: string;
  delivery_date: string | null;
  estimated_delivery_date: string | null;
  expected_delivery_date: string | null;
  requested_on_dock_date: string | null;
  cost: number;
  retail: number;
  target_rate: number;
  shipment_value: number;
  cost_without_tax: number;
  retail_without_tax: number;
  status_code: string | null;
  status_description: string | null;
  priority: number;
  number_of_pallets: number;
  linear_feet: number;
  miles: number;
  reference_number: string | null;
  bol_number: string | null;
  po_reference: string | null;
  shipper_number: string | null;
  pickup_number: string | null;
  quote_number: string | null;
  rate_carrier_id: number | null;
  is_rerun_rate: boolean;
  is_stackable: boolean;
  is_palletized: boolean;
  is_automated_ltl: boolean;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentWithRelations extends Shipment {
  customer?: Customer;
  carrier?: Carrier;
  shipment_status?: ShipmentStatus;
  shipment_mode?: ShipmentMode;
  equipment_type?: EquipmentType;
  addresses?: ShipmentAddress[];
}

export interface ShipmentDetail {
  load_id: number;
  quoted_by: string | null;
  quoted_date: string | null;
  booked_by: string | null;
  booked_date: string | null;
  dispatched_by: string | null;
  dispatch_date: string | null;
  delivered_by: string | null;
  delivered_date: string | null;
  needs_follow_up: boolean | null;
  ready_to_invoice: boolean;
  has_edi_dispatched: boolean;
  created_by: string | null;
  created_date: string;
  modified_by: string | null;
  modified_date: string | null;
}

export interface ShipmentAddress {
  shipment_address_id: number;
  load_id: number;
  address_id: number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  company_name: string | null;
  address_type: number;
  stop_number: number;
  appointment_time: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  latitude: number | null;
  longitude: number | null;
  reference_number: string | null;
  special_instructions: string | null;
  is_residential: boolean;
  created_date: string;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentItem {
  shipment_item_id: number;
  load_id: number;
  description: string | null;
  commodity: string | null;
  freight_class: string | null;
  nmfc_code: string | null;
  quantity: number;
  weight: number;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  package_type: string | null;
  number_of_packages: number;
  is_hazmat: boolean;
  is_stackable: boolean;
  hazmat_class: string | null;
  hazmat_un_number: string | null;
  declared_value: number | null;
  item_number: string | null;
  sku: string | null;
  created_date: string;
  modified_date: string | null;
}

export interface ShipmentCarrier {
  shipment_carrier_id: number;
  load_id: number;
  carrier_id: number;
  assignment_type: number;
  assignment_status: number;
  assigned_date: string;
  accepted_date: string | null;
  declined_date: string | null;
  carrier_pay: number;
  carrier_name: string | null;
  carrier_scac: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  truck_number: string | null;
  trailer_number: string | null;
  pro_number: string | null;
  notes: string | null;
  created_date: string;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentNote {
  shipment_note_id: number;
  load_id: number;
  note_type: number;
  note_text: string;
  is_internal: boolean;
  is_visible_to_carrier: boolean;
  is_visible_to_customer: boolean;
  created_date: string;
  created_by: string | null;
}

export interface ShipmentAccessorial {
  shipment_accessorial_id: number;
  load_id: number;
  accessorial_type: string;
  accessorial_code: string | null;
  description: string | null;
  charge_amount: number;
  cost_amount: number;
  is_billable: boolean;
  is_approved: boolean;
  quantity: number;
  unit_type: string | null;
  created_date: string;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

// Schema Explorer Types
export interface TableMetadata {
  name: string;
  type: 'table' | 'view';
  rowCount: number | null;
  isLoading: boolean;
  error?: string;
}

export interface TableData {
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

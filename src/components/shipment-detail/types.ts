export interface ShipmentData {
  load_id: string;
  client_id: number | null;
  client_load_id: string | null;
  customer_id: number | null;
  payer_id: number | null;
  payer_address_id: number | null;
  mode_id: number | null;
  equipment_type_id: number | null;
  status_id: number | null;
  created_date: string | null;
  modified_date: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  estimated_delivery_date: string | null;
  expected_delivery_date: string | null;
  requested_on_dock_date: string | null;
  cost: number | null;
  retail: number | null;
  target_rate: number | null;
  shipment_value: number | null;
  cost_without_tax: number | null;
  retail_without_tax: number | null;
  status_code: string | null;
  status_description: string | null;
  priority: number | null;
  number_of_pallets: number | null;
  linear_feet: number | null;
  miles: number | null;
  reference_number: string | null;
  bol_number: string | null;
  po_reference: string | null;
  shipper_number: string | null;
  pickup_number: string | null;
  quote_number: string | null;
  rate_carrier_id: number | null;
  is_rerun_rate: boolean | null;
  is_stackable: boolean | null;
  is_palletized: boolean | null;
  is_automated_ltl: boolean | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentAddress {
  shipment_address_id: number;
  load_id: string;
  address_id: number | null;
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
  address_type: string | null;
  stop_number: number;
  appointment_time: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  latitude: number | null;
  longitude: number | null;
  reference_number: string | null;
  special_instructions: string | null;
  is_residential: boolean | null;
  created_date: string | null;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentItem {
  shipment_item_id: number;
  load_id: string;
  description: string | null;
  commodity: string | null;
  freight_class: string | null;
  nmfc_code: string | null;
  quantity: number | null;
  weight: number | null;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  package_type: string | null;
  number_of_packages: number | null;
  is_hazmat: boolean | null;
  is_stackable: boolean | null;
  hazmat_class: string | null;
  hazmat_un_number: string | null;
  declared_value: number | null;
  item_number: string | null;
  sku: string | null;
  created_date: string | null;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentCarrier {
  shipment_carrier_id: number;
  load_id: string;
  carrier_id: number | null;
  assignment_type: string | null;
  assignment_status: string | null;
  assigned_date: string | null;
  accepted_date: string | null;
  declined_date: string | null;
  carrier_pay: number | null;
  carrier_name: string | null;
  carrier_scac: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  truck_number: string | null;
  trailer_number: string | null;
  pro_number: string | null;
  notes: string | null;
  created_date: string | null;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentAccessorial {
  shipment_accessorial_id: number;
  load_id: string;
  accessorial_type: string | null;
  accessorial_code: string | null;
  description: string | null;
  charge_amount: number | null;
  cost_amount: number | null;
  is_billable: boolean | null;
  is_approved: boolean | null;
  quantity: number | null;
  unit_type: string | null;
  created_date: string | null;
  modified_date: string | null;
  created_by: string | null;
  modified_by: string | null;
}

export interface ShipmentNote {
  shipment_note_id: number;
  load_id: string;
  note_type: string | null;
  note_text: string | null;
  is_internal: boolean | null;
  is_visible_to_carrier: boolean | null;
  is_visible_to_customer: boolean | null;
  created_date: string | null;
  created_by: string | null;
}

export interface ShipmentDetail {
  load_id: string;
  quoted_by: string | null;
  quoted_date: string | null;
  booked_by: string | null;
  booked_date: string | null;
  dispatched_by: string | null;
  dispatch_date: string | null;
  delivered_by: string | null;
  delivered_date: string | null;
  needs_follow_up: boolean | null;
  ready_to_invoice: boolean | null;
  has_edi_dispatched: boolean | null;
  created_by: string | null;
  created_date: string | null;
  modified_by: string | null;
  modified_date: string | null;
}

export interface ShipmentMode {
  mode_id: number;
  mode_code: string | null;
  mode_name: string | null;
  description: string | null;
  is_active: boolean | null;
  display_order: number | null;
}

export interface ShipmentStatus {
  status_id: number;
  status_code: string | null;
  status_name: string | null;
  status_description: string | null;
  display_order: number | null;
  is_active: boolean | null;
  is_completed: boolean | null;
  is_cancelled: boolean | null;
}

export interface Customer {
  customer_id: number;
  client_id: number | null;
  company_name: string | null;
  is_active: boolean | null;
  is_on_hold: boolean | null;
  comments: string | null;
  external_customer_id: string | null;
}

export interface Carrier {
  carrier_id: number;
  client_id: number | null;
  carrier_name: string | null;
  status: number | null;
  notes: string | null;
  dot_number: string | null;
  mc_number: string | null;
  scac: string | null;
  website: string | null;
  account_number: string | null;
}

export interface EquipmentType {
  equipment_type_id: number;
  equipment_code: string | null;
  equipment_name: string | null;
  description: string | null;
  is_active: boolean | null;
  display_order: number | null;
}

export interface ShipmentFullData {
  shipment: ShipmentData | null;
  addresses: ShipmentAddress[];
  items: ShipmentItem[];
  carrierAssignment: ShipmentCarrier | null;
  accessorials: ShipmentAccessorial[];
  notes: ShipmentNote[];
  detail: ShipmentDetail | null;
  mode: ShipmentMode | null;
  status: ShipmentStatus | null;
  customer: Customer | null;
  rateCarrier: Carrier | null;
  equipmentType: EquipmentType | null;
}

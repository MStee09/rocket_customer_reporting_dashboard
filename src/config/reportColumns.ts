export interface LookupConfig {
  table: string;
  keyField: string;
  displayField: string;
}

export interface ReportColumn {
  id: string;
  label: string;
  table: string;
  column: string;
  category: 'shipment' | 'financial' | 'origin' | 'destination' | 'carrier' | 'lineItems' | 'customer';
  type: 'string' | 'number' | 'date' | 'boolean' | 'lookup';
  format?: 'integer' | 'decimal' | 'currency';
  description?: string;
  aggregatable?: boolean;
  groupable?: boolean;
  adminOnly?: boolean;
  lookup?: LookupConfig;
}

export const REPORT_COLUMNS: ReportColumn[] = [
  {
    id: 'load_id',
    label: 'Load ID',
    table: 'shipment_report_view',
    column: 'load_id',
    category: 'shipment',
    type: 'number',
    format: 'integer',
    description: 'Unique shipment identifier',
    groupable: true
  },
  {
    id: 'client_id',
    label: 'Client ID',
    table: 'shipment_report_view',
    column: 'client_id',
    category: 'shipment',
    type: 'number',
    format: 'integer',
    description: 'Client identifier',
    groupable: true
  },
  {
    id: 'status_id',
    label: 'Status ID',
    table: 'shipment_report_view',
    column: 'status_id',
    category: 'shipment',
    type: 'lookup',
    description: 'Shipment status ID',
    groupable: true,
    lookup: {
      table: 'shipment_status',
      keyField: 'status_id',
      displayField: 'status_code'
    }
  },
  {
    id: 'status_name',
    label: 'Status',
    table: 'shipment_report_view',
    column: 'status_name',
    category: 'shipment',
    type: 'string',
    description: 'Current shipment status',
    groupable: true
  },
  {
    id: 'delivery_status',
    label: 'Delivery Status',
    table: 'shipment_report_view',
    column: 'delivery_status',
    category: 'shipment',
    type: 'string',
    description: 'Delivery status description',
    groupable: true
  },
  {
    id: 'is_completed',
    label: 'Is Completed',
    table: 'shipment_report_view',
    column: 'is_completed',
    category: 'shipment',
    type: 'boolean',
    description: 'Whether shipment is completed',
    groupable: true
  },
  {
    id: 'is_cancelled',
    label: 'Is Cancelled',
    table: 'shipment_report_view',
    column: 'is_cancelled',
    category: 'shipment',
    type: 'boolean',
    description: 'Whether shipment is cancelled',
    groupable: true
  },
  {
    id: 'is_late',
    label: 'Is Late',
    table: 'shipment_report_view',
    column: 'is_late',
    category: 'shipment',
    type: 'boolean',
    description: 'Whether shipment is late or delayed',
    groupable: true
  },
  {
    id: 'mode_id',
    label: 'Mode ID',
    table: 'shipment_report_view',
    column: 'mode_id',
    category: 'shipment',
    type: 'lookup',
    description: 'Transportation mode ID',
    groupable: true,
    lookup: {
      table: 'shipment_mode',
      keyField: 'mode_id',
      displayField: 'mode_code'
    }
  },
  {
    id: 'mode_name',
    label: 'Mode Name',
    table: 'shipment_report_view',
    column: 'mode_name',
    category: 'shipment',
    type: 'string',
    description: 'Transportation mode (TL, LTL, etc)',
    groupable: true
  },
  {
    id: 'equipment_type_id',
    label: 'Equipment Type ID',
    table: 'shipment_report_view',
    column: 'equipment_type_id',
    category: 'shipment',
    type: 'lookup',
    description: 'Equipment type ID',
    groupable: true,
    lookup: {
      table: 'equipment_type',
      keyField: 'equipment_type_id',
      displayField: 'equipment_code'
    }
  },
  {
    id: 'equipment_name',
    label: 'Equipment Name',
    table: 'shipment_report_view',
    column: 'equipment_name',
    category: 'shipment',
    type: 'string',
    description: 'Equipment type name',
    groupable: true
  },
  {
    id: 'created_date',
    label: 'Created Date',
    table: 'shipment_report_view',
    column: 'created_date',
    category: 'shipment',
    type: 'date',
    description: 'When shipment was created',
    groupable: true
  },
  {
    id: 'modified_date',
    label: 'Modified Date',
    table: 'shipment',
    column: 'modified_date',
    category: 'shipment',
    type: 'date',
    groupable: true
  },
  {
    id: 'pickup_date',
    label: 'Pickup Date',
    table: 'shipment_report_view',
    column: 'pickup_date',
    category: 'shipment',
    type: 'date',
    description: 'Scheduled pickup date',
    groupable: true
  },
  {
    id: 'shipped_date',
    label: 'Shipped Date',
    table: 'shipment_report_view',
    column: 'shipped_date',
    category: 'shipment',
    type: 'date',
    description: 'Date shipped (same as pickup)',
    groupable: true
  },
  {
    id: 'delivery_date',
    label: 'Delivery Date',
    table: 'shipment_report_view',
    column: 'delivery_date',
    category: 'shipment',
    type: 'date',
    description: 'Actual delivery date',
    groupable: true
  },
  {
    id: 'delivered_date',
    label: 'Delivered Date',
    table: 'shipment_report_view',
    column: 'delivered_date',
    category: 'shipment',
    type: 'date',
    description: 'Date delivered (same as delivery)',
    groupable: true
  },
  {
    id: 'expected_delivery_date',
    label: 'Expected Delivery Date',
    table: 'shipment_report_view',
    column: 'expected_delivery_date',
    category: 'shipment',
    type: 'date',
    description: 'Expected delivery date',
    groupable: true
  },
  {
    id: 'estimated_delivery_date',
    label: 'Estimated Delivery Date',
    table: 'shipment',
    column: 'estimated_delivery_date',
    category: 'shipment',
    type: 'date',
    description: 'Estimated delivery date',
    groupable: true
  },
  {
    id: 'requested_on_dock_date',
    label: 'Requested On Dock Date',
    table: 'shipment',
    column: 'requested_on_dock_date',
    category: 'shipment',
    type: 'date',
    description: 'Requested arrival at dock',
    groupable: true
  },
  {
    id: 'reference_number',
    label: 'Reference Number',
    table: 'shipment_report_view',
    column: 'reference_number',
    category: 'shipment',
    type: 'string',
    description: 'Shipment reference number',
    groupable: true
  },
  {
    id: 'bol_number',
    label: 'BOL Number',
    table: 'shipment',
    column: 'bol_number',
    category: 'shipment',
    type: 'string',
    description: 'Bill of Lading number',
    groupable: true
  },
  {
    id: 'po_reference',
    label: 'PO Reference',
    table: 'shipment',
    column: 'po_reference',
    category: 'shipment',
    type: 'string',
    description: 'Purchase order reference',
    groupable: true
  },
  {
    id: 'shipper_number',
    label: 'Shipper Number',
    table: 'shipment',
    column: 'shipper_number',
    category: 'shipment',
    type: 'string',
    description: 'Shipper ID number',
    groupable: true
  },
  {
    id: 'pickup_number',
    label: 'Pickup Number',
    table: 'shipment',
    column: 'pickup_number',
    category: 'shipment',
    type: 'string',
    description: 'Pickup confirmation number',
    groupable: true
  },
  {
    id: 'quote_number',
    label: 'Quote Number',
    table: 'shipment',
    column: 'quote_number',
    category: 'shipment',
    type: 'string',
    description: 'Quote/rate confirmation number',
    groupable: true
  },
  {
    id: 'miles',
    label: 'Miles',
    table: 'shipment_report_view',
    column: 'miles',
    category: 'shipment',
    type: 'number',
    format: 'decimal',
    description: 'Distance in miles',
    aggregatable: true
  },
  {
    id: 'priority',
    label: 'Priority',
    table: 'shipment',
    column: 'priority',
    category: 'shipment',
    type: 'number',
    format: 'integer',
    groupable: true
  },
  {
    id: 'number_of_pallets',
    label: 'Pallets',
    table: 'shipment',
    column: 'number_of_pallets',
    category: 'shipment',
    type: 'number',
    format: 'integer',
    aggregatable: true
  },
  {
    id: 'linear_feet',
    label: 'Linear Feet',
    table: 'shipment',
    column: 'linear_feet',
    category: 'shipment',
    type: 'number',
    format: 'decimal',
    aggregatable: true
  },
  {
    id: 'is_stackable',
    label: 'Stackable',
    table: 'shipment',
    column: 'is_stackable',
    category: 'shipment',
    type: 'boolean',
    description: 'Freight can be stacked',
    groupable: true
  },
  {
    id: 'is_palletized',
    label: 'Palletized',
    table: 'shipment',
    column: 'is_palletized',
    category: 'shipment',
    type: 'boolean',
    description: 'Freight is palletized',
    groupable: true
  },
  {
    id: 'is_automated_ltl',
    label: 'Automated LTL',
    table: 'shipment',
    column: 'is_automated_ltl',
    category: 'shipment',
    type: 'boolean',
    description: 'Auto-tendered to LTL carrier',
    groupable: true
  },
  {
    id: 'created_by',
    label: 'Created By',
    table: 'shipment',
    column: 'created_by',
    category: 'shipment',
    type: 'string',
    groupable: true
  },
  {
    id: 'modified_by',
    label: 'Modified By',
    table: 'shipment',
    column: 'modified_by',
    category: 'shipment',
    type: 'string',
    groupable: true
  },
  {
    id: 'shipment_count',
    label: 'Shipment Count',
    table: 'shipment',
    column: 'load_id',
    category: 'shipment',
    type: 'number',
    format: 'integer',
    description: 'Number of shipments',
    aggregatable: true
  },

  {
    id: 'customer_company_name',
    label: 'Customer Name',
    table: 'customer',
    column: 'company_name',
    category: 'customer',
    type: 'string',
    description: 'Customer company name',
    groupable: true
  },
  {
    id: 'customer_id',
    label: 'Customer ID',
    table: 'shipment_report_view',
    column: 'customer_id',
    category: 'customer',
    type: 'number',
    format: 'integer',
    description: 'Customer identifier',
    groupable: true
  },
  {
    id: 'external_customer_id',
    label: 'External Customer ID',
    table: 'customer',
    column: 'external_customer_id',
    category: 'customer',
    type: 'string',
    description: 'External system customer ID',
    groupable: true
  },
  {
    id: 'customer_is_active',
    label: 'Customer Active',
    table: 'customer',
    column: 'is_active',
    category: 'customer',
    type: 'boolean',
    description: 'Customer active status',
    groupable: true
  },
  {
    id: 'customer_is_on_hold',
    label: 'Customer On Hold',
    table: 'customer',
    column: 'is_on_hold',
    category: 'customer',
    type: 'boolean',
    description: 'Customer account on hold',
    groupable: true
  },

  {
    id: 'retail',
    label: 'Retail',
    table: 'shipment_report_view',
    column: 'retail',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Retail/revenue amount',
    aggregatable: true
  },
  {
    id: 'retail_without_tax',
    label: 'Retail (No Tax)',
    table: 'shipment',
    column: 'retail_without_tax',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Retail amount excluding taxes',
    aggregatable: true
  },
  {
    id: 'shipment_value',
    label: 'Shipment Value',
    table: 'shipment',
    column: 'shipment_value',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Declared value of goods',
    aggregatable: true
  },
  {
    id: 'cost',
    label: 'Cost',
    table: 'shipment',
    column: 'cost',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Total shipment cost',
    aggregatable: true,
    adminOnly: true
  },
  {
    id: 'cost_without_tax',
    label: 'Cost (No Tax)',
    table: 'shipment',
    column: 'cost_without_tax',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Cost excluding taxes',
    aggregatable: true,
    adminOnly: true
  },
  {
    id: 'target_rate',
    label: 'Target Rate',
    table: 'shipment',
    column: 'target_rate',
    category: 'financial',
    type: 'number',
    format: 'currency',
    description: 'Internal target pricing',
    aggregatable: true,
    adminOnly: true
  },

  {
    id: 'origin_company',
    label: 'Origin Company',
    table: 'shipment_report_view',
    column: 'origin_company',
    category: 'origin',
    type: 'string',
    description: 'Origin location company name',
    groupable: true
  },
  {
    id: 'origin_company_name',
    label: 'Origin Company Name',
    table: 'shipment_address',
    column: 'company_name',
    category: 'origin',
    type: 'string',
    description: 'Origin location company name (from address table)',
    groupable: true
  },
  {
    id: 'origin_address_line1',
    label: 'Origin Address',
    table: 'shipment_address',
    column: 'address_line1',
    category: 'origin',
    type: 'string',
    description: 'Origin street address'
  },
  {
    id: 'origin_city',
    label: 'Origin City',
    table: 'shipment_report_view',
    column: 'origin_city',
    category: 'origin',
    type: 'string',
    description: 'Pickup location city',
    groupable: true
  },
  {
    id: 'origin_state',
    label: 'Origin State',
    table: 'shipment_report_view',
    column: 'origin_state',
    category: 'origin',
    type: 'string',
    description: 'Pickup location state',
    groupable: true
  },
  {
    id: 'origin_zip',
    label: 'Origin ZIP',
    table: 'shipment_report_view',
    column: 'origin_zip',
    category: 'origin',
    type: 'string',
    description: 'Pickup location postal code',
    groupable: true
  },
  {
    id: 'origin_country',
    label: 'Origin Country',
    table: 'shipment_report_view',
    column: 'origin_country',
    category: 'origin',
    type: 'string',
    description: 'Pickup location country',
    groupable: true
  },
  {
    id: 'origin_contact_name',
    label: 'Origin Contact',
    table: 'shipment_address',
    column: 'contact_name',
    category: 'origin',
    type: 'string',
    description: 'Origin contact person'
  },
  {
    id: 'origin_contact_phone',
    label: 'Origin Phone',
    table: 'shipment_address',
    column: 'contact_phone',
    category: 'origin',
    type: 'string',
    description: 'Origin contact phone'
  },
  {
    id: 'origin_contact_email',
    label: 'Origin Email',
    table: 'shipment_address',
    column: 'contact_email',
    category: 'origin',
    type: 'string',
    description: 'Origin contact email'
  },
  {
    id: 'origin_reference_number',
    label: 'Origin Reference',
    table: 'shipment_address',
    column: 'reference_number',
    category: 'origin',
    type: 'string',
    description: 'Origin location reference number'
  },
  {
    id: 'origin_appointment_time',
    label: 'Origin Appointment',
    table: 'shipment_address',
    column: 'appointment_time',
    category: 'origin',
    type: 'date',
    description: 'Scheduled pickup appointment'
  },
  {
    id: 'origin_arrival_time',
    label: 'Origin Arrival',
    table: 'shipment_address',
    column: 'arrival_time',
    category: 'origin',
    type: 'date',
    description: 'Actual arrival at origin'
  },
  {
    id: 'origin_departure_time',
    label: 'Origin Departure',
    table: 'shipment_address',
    column: 'departure_time',
    category: 'origin',
    type: 'date',
    description: 'Actual departure from origin'
  },
  {
    id: 'origin_special_instructions',
    label: 'Origin Instructions',
    table: 'shipment_address',
    column: 'special_instructions',
    category: 'origin',
    type: 'string',
    description: 'Pickup instructions'
  },
  {
    id: 'origin_is_residential',
    label: 'Origin Residential',
    table: 'shipment_address',
    column: 'is_residential',
    category: 'origin',
    type: 'boolean',
    description: 'Residential pickup',
    groupable: true
  },

  {
    id: 'destination_company',
    label: 'Destination Company',
    table: 'shipment_report_view',
    column: 'destination_company',
    category: 'destination',
    type: 'string',
    description: 'Destination location company name',
    groupable: true
  },
  {
    id: 'destination_company_name',
    label: 'Destination Company Name',
    table: 'shipment_address',
    column: 'company_name',
    category: 'destination',
    type: 'string',
    description: 'Destination location company name (from address table)',
    groupable: true
  },
  {
    id: 'destination_address_line1',
    label: 'Destination Address',
    table: 'shipment_address',
    column: 'address_line1',
    category: 'destination',
    type: 'string',
    description: 'Destination street address'
  },
  {
    id: 'destination_city',
    label: 'Destination City',
    table: 'shipment_report_view',
    column: 'destination_city',
    category: 'destination',
    type: 'string',
    description: 'Delivery location city',
    groupable: true
  },
  {
    id: 'destination_state',
    label: 'Destination State',
    table: 'shipment_report_view',
    column: 'destination_state',
    category: 'destination',
    type: 'string',
    description: 'Delivery location state',
    groupable: true
  },
  {
    id: 'destination_zip',
    label: 'Destination ZIP',
    table: 'shipment_report_view',
    column: 'destination_zip',
    category: 'destination',
    type: 'string',
    description: 'Delivery location postal code',
    groupable: true
  },
  {
    id: 'destination_country',
    label: 'Destination Country',
    table: 'shipment_report_view',
    column: 'destination_country',
    category: 'destination',
    type: 'string',
    description: 'Delivery location country',
    groupable: true
  },
  {
    id: 'destination_contact_name',
    label: 'Destination Contact',
    table: 'shipment_address',
    column: 'contact_name',
    category: 'destination',
    type: 'string',
    description: 'Destination contact person'
  },
  {
    id: 'destination_contact_phone',
    label: 'Destination Phone',
    table: 'shipment_address',
    column: 'contact_phone',
    category: 'destination',
    type: 'string',
    description: 'Destination contact phone'
  },
  {
    id: 'destination_contact_email',
    label: 'Destination Email',
    table: 'shipment_address',
    column: 'contact_email',
    category: 'destination',
    type: 'string',
    description: 'Destination contact email'
  },
  {
    id: 'destination_reference_number',
    label: 'Destination Reference',
    table: 'shipment_address',
    column: 'reference_number',
    category: 'destination',
    type: 'string',
    description: 'Destination location reference number'
  },
  {
    id: 'destination_appointment_time',
    label: 'Destination Appointment',
    table: 'shipment_address',
    column: 'appointment_time',
    category: 'destination',
    type: 'date',
    description: 'Scheduled delivery appointment'
  },
  {
    id: 'destination_arrival_time',
    label: 'Destination Arrival',
    table: 'shipment_address',
    column: 'arrival_time',
    category: 'destination',
    type: 'date',
    description: 'Actual arrival at destination'
  },
  {
    id: 'destination_departure_time',
    label: 'Destination Departure',
    table: 'shipment_address',
    column: 'departure_time',
    category: 'destination',
    type: 'date',
    description: 'Actual departure from destination'
  },
  {
    id: 'destination_special_instructions',
    label: 'Destination Instructions',
    table: 'shipment_address',
    column: 'special_instructions',
    category: 'destination',
    type: 'string',
    description: 'Delivery instructions'
  },
  {
    id: 'destination_is_residential',
    label: 'Destination Residential',
    table: 'shipment_address',
    column: 'is_residential',
    category: 'destination',
    type: 'boolean',
    description: 'Residential delivery',
    groupable: true
  },

  {
    id: 'carrier_id',
    label: 'Carrier ID',
    table: 'shipment_report_view',
    column: 'carrier_id',
    category: 'carrier',
    type: 'number',
    format: 'integer',
    description: 'Carrier identifier',
    groupable: true
  },
  {
    id: 'carrier_name',
    label: 'Carrier Name',
    table: 'shipment_report_view',
    column: 'carrier_name',
    category: 'carrier',
    type: 'string',
    description: 'Carrier company name',
    groupable: true
  },
  {
    id: 'carrier_scac',
    label: 'Carrier SCAC',
    table: 'carrier',
    column: 'scac',
    category: 'carrier',
    type: 'string',
    description: 'Standard Carrier Alpha Code',
    groupable: true
  },
  {
    id: 'carrier_mc_number',
    label: 'MC Number',
    table: 'carrier',
    column: 'mc_number',
    category: 'carrier',
    type: 'string',
    description: 'Motor Carrier number',
    groupable: true
  },
  {
    id: 'carrier_dot_number',
    label: 'DOT Number',
    table: 'carrier',
    column: 'dot_number',
    category: 'carrier',
    type: 'string',
    description: 'Department of Transportation number',
    groupable: true
  },
  {
    id: 'carrier_account_number',
    label: 'Carrier Account',
    table: 'carrier',
    column: 'account_number',
    category: 'carrier',
    type: 'string',
    description: 'Account number with carrier'
  },
  {
    id: 'pro_number',
    label: 'PRO Number',
    table: 'shipment_carrier',
    column: 'pro_number',
    category: 'carrier',
    type: 'string',
    description: 'Progressive or tracking number',
    groupable: true
  },
  {
    id: 'driver_name',
    label: 'Driver Name',
    table: 'shipment_carrier',
    column: 'driver_name',
    category: 'carrier',
    type: 'string',
    description: 'Assigned driver name'
  },
  {
    id: 'driver_phone',
    label: 'Driver Phone',
    table: 'shipment_carrier',
    column: 'driver_phone',
    category: 'carrier',
    type: 'string',
    description: 'Driver phone number'
  },
  {
    id: 'truck_number',
    label: 'Truck Number',
    table: 'shipment_carrier',
    column: 'truck_number',
    category: 'carrier',
    type: 'string',
    description: 'Truck/tractor number'
  },
  {
    id: 'trailer_number',
    label: 'Trailer Number',
    table: 'shipment_carrier',
    column: 'trailer_number',
    category: 'carrier',
    type: 'string',
    description: 'Trailer number'
  },
  {
    id: 'assignment_status',
    label: 'Assignment Status',
    table: 'shipment_carrier',
    column: 'assignment_status',
    category: 'carrier',
    type: 'string',
    description: 'Carrier assignment status',
    groupable: true
  },
  {
    id: 'assigned_date',
    label: 'Assigned Date',
    table: 'shipment_carrier',
    column: 'assigned_date',
    category: 'carrier',
    type: 'date',
    description: 'When carrier was assigned'
  },
  {
    id: 'accepted_date',
    label: 'Accepted Date',
    table: 'shipment_carrier',
    column: 'accepted_date',
    category: 'carrier',
    type: 'date',
    description: 'When carrier accepted load'
  },
  {
    id: 'carrier_pay',
    label: 'Carrier Pay',
    table: 'shipment_carrier',
    column: 'carrier_pay',
    category: 'carrier',
    type: 'number',
    format: 'currency',
    description: 'Amount paid to carrier',
    aggregatable: true,
    adminOnly: true
  },

  {
    id: 'item_description',
    label: 'Item Description',
    table: 'shipment_item',
    column: 'description',
    category: 'lineItems',
    type: 'string',
    description: 'Item/commodity description'
  },
  {
    id: 'commodity',
    label: 'Commodity',
    table: 'shipment_item',
    column: 'commodity',
    category: 'lineItems',
    type: 'string',
    groupable: true
  },
  {
    id: 'freight_class',
    label: 'Freight Class',
    table: 'shipment_item',
    column: 'freight_class',
    category: 'lineItems',
    type: 'string',
    description: 'NMFC freight class',
    groupable: true
  },
  {
    id: 'nmfc_code',
    label: 'NMFC Code',
    table: 'shipment_item',
    column: 'nmfc_code',
    category: 'lineItems',
    type: 'string',
    description: 'NMFC item code',
    groupable: true
  },
  {
    id: 'item_quantity',
    label: 'Item Quantity',
    table: 'shipment_item',
    column: 'quantity',
    category: 'lineItems',
    type: 'number',
    format: 'integer',
    description: 'Number of handling units',
    aggregatable: true
  },
  {
    id: 'item_weight',
    label: 'Item Weight',
    table: 'shipment_item',
    column: 'weight',
    category: 'lineItems',
    type: 'number',
    format: 'decimal',
    description: 'Total weight',
    aggregatable: true
  },
  {
    id: 'weight_unit',
    label: 'Weight Unit',
    table: 'shipment_item',
    column: 'weight_unit',
    category: 'lineItems',
    type: 'string',
    description: 'Weight unit (LBS, KG)',
    groupable: true
  },
  {
    id: 'item_length',
    label: 'Item Length',
    table: 'shipment_item',
    column: 'length',
    category: 'lineItems',
    type: 'number',
    format: 'decimal',
    aggregatable: true
  },
  {
    id: 'item_width',
    label: 'Item Width',
    table: 'shipment_item',
    column: 'width',
    category: 'lineItems',
    type: 'number',
    format: 'decimal',
    aggregatable: true
  },
  {
    id: 'item_height',
    label: 'Item Height',
    table: 'shipment_item',
    column: 'height',
    category: 'lineItems',
    type: 'number',
    format: 'decimal',
    aggregatable: true
  },
  {
    id: 'dimension_unit',
    label: 'Dimension Unit',
    table: 'shipment_item',
    column: 'dimension_unit',
    category: 'lineItems',
    type: 'string',
    description: 'Dimension unit (IN, CM)',
    groupable: true
  },
  {
    id: 'package_type',
    label: 'Package Type',
    table: 'shipment_item',
    column: 'package_type',
    category: 'lineItems',
    type: 'string',
    description: 'Package type (pallet, box, etc.)',
    groupable: true
  },
  {
    id: 'number_of_packages',
    label: 'Number of Packages',
    table: 'shipment_item',
    column: 'number_of_packages',
    category: 'lineItems',
    type: 'number',
    format: 'integer',
    aggregatable: true
  },
  {
    id: 'is_hazmat',
    label: 'Is Hazmat',
    table: 'shipment_item',
    column: 'is_hazmat',
    category: 'lineItems',
    type: 'boolean',
    description: 'Hazardous materials flag',
    groupable: true
  },
  {
    id: 'hazmat_class',
    label: 'Hazmat Class',
    table: 'shipment_item',
    column: 'hazmat_class',
    category: 'lineItems',
    type: 'string',
    description: 'Hazmat classification',
    groupable: true
  },
  {
    id: 'hazmat_un_number',
    label: 'Hazmat UN Number',
    table: 'shipment_item',
    column: 'hazmat_un_number',
    category: 'lineItems',
    type: 'string',
    description: 'UN/NA identification number',
    groupable: true
  },
  {
    id: 'item_is_stackable',
    label: 'Item Stackable',
    table: 'shipment_item',
    column: 'is_stackable',
    category: 'lineItems',
    type: 'boolean',
    description: 'Item can be stacked',
    groupable: true
  },
  {
    id: 'declared_value',
    label: 'Declared Value',
    table: 'shipment_item',
    column: 'declared_value',
    category: 'lineItems',
    type: 'number',
    format: 'currency',
    description: 'Declared value for insurance',
    aggregatable: true
  },
  {
    id: 'item_number',
    label: 'Item Number',
    table: 'shipment_item',
    column: 'item_number',
    category: 'lineItems',
    type: 'string',
    description: 'Item/part number',
    groupable: true
  },
  {
    id: 'sku',
    label: 'SKU',
    table: 'shipment_item',
    column: 'sku',
    category: 'lineItems',
    type: 'string',
    description: 'Stock keeping unit',
    groupable: true
  },
  {
    id: 'item_descriptions',
    label: 'Item Descriptions',
    table: 'shipment_report_view',
    column: 'item_descriptions',
    category: 'lineItems',
    type: 'string',
    description: 'Product descriptions for all items in shipment',
    groupable: true
  },
  {
    id: 'item_count',
    label: 'Item Count',
    table: 'shipment_report_view',
    column: 'item_count',
    category: 'lineItems',
    type: 'number',
    format: 'integer',
    description: 'Number of line items in shipment',
    aggregatable: true
  },
  {
    id: 'total_item_weight',
    label: 'Total Item Weight',
    table: 'shipment_report_view',
    column: 'item_weight',
    category: 'lineItems',
    type: 'number',
    format: 'decimal',
    description: 'Total weight of all items',
    aggregatable: true
  },
  {
    id: 'total_quantity',
    label: 'Total Quantity',
    table: 'shipment_report_view',
    column: 'total_quantity',
    category: 'lineItems',
    type: 'number',
    format: 'integer',
    description: 'Total quantity of items',
    aggregatable: true
  },
  {
    id: 'total_packages',
    label: 'Total Packages',
    table: 'shipment_report_view',
    column: 'total_packages',
    category: 'lineItems',
    type: 'number',
    format: 'integer',
    description: 'Total number of packages',
    aggregatable: true
  },
  {
    id: 'shipment_freight_class',
    label: 'Freight Class',
    table: 'shipment_report_view',
    column: 'freight_class',
    category: 'lineItems',
    type: 'string',
    description: 'Freight classification',
    groupable: true
  },
  {
    id: 'shipment_commodity',
    label: 'Commodity',
    table: 'shipment_report_view',
    column: 'commodity',
    category: 'lineItems',
    type: 'string',
    description: 'Commodity type',
    groupable: true
  },
  {
    id: 'skus',
    label: 'SKUs',
    table: 'shipment_report_view',
    column: 'skus',
    category: 'lineItems',
    type: 'string',
    description: 'SKU numbers for items',
    groupable: false
  },
  {
    id: 'has_hazmat',
    label: 'Has Hazmat',
    table: 'shipment_report_view',
    column: 'has_hazmat',
    category: 'lineItems',
    type: 'boolean',
    description: 'Contains hazardous materials',
    groupable: true
  }
];

export const COLUMN_CATEGORIES = {
  shipment: { label: 'Shipment Info', icon: 'Package' },
  customer: { label: 'Customer', icon: 'Building' },
  financial: { label: 'Financial', icon: 'DollarSign' },
  origin: { label: 'Origin', icon: 'MapPin' },
  destination: { label: 'Destination', icon: 'Flag' },
  carrier: { label: 'Carrier', icon: 'Truck' },
  lineItems: { label: 'Line Items', icon: 'Box' }
};

export function getColumnsByCategory(category: string, canSeeAdminColumns: boolean = true): ReportColumn[] {
  return REPORT_COLUMNS.filter(col => {
    if (col.category !== category) return false;
    if (col.adminOnly && !canSeeAdminColumns) return false;
    return true;
  });
}

export function getColumnById(id: string): ReportColumn | undefined {
  return REPORT_COLUMNS.find(col => col.id === id);
}

export function getAggregatableColumns(canSeeAdminColumns: boolean = true): ReportColumn[] {
  return REPORT_COLUMNS.filter(col => {
    if (!col.aggregatable) return false;
    if (col.adminOnly && !canSeeAdminColumns) return false;
    return true;
  });
}

export function getGroupableColumns(canSeeAdminColumns: boolean = true): ReportColumn[] {
  return REPORT_COLUMNS.filter(col => {
    if (!col.groupable) return false;
    if (col.adminOnly && !canSeeAdminColumns) return false;
    return true;
  });
}

export type FieldDataType = 'text' | 'number' | 'date' | 'boolean' | 'uuid';

export interface FieldMetadata {
  field: string;
  displayLabel: string;
  dataType: FieldDataType;
  description?: string;
  adminOnly?: boolean;
  aggregations?: ('sum' | 'avg' | 'count' | 'min' | 'max')[];
  sampleValue?: string;
}

export interface TableMetadata {
  table: string;
  displayLabel: string;
  description: string;
  primaryKey: string;
  fields: FieldMetadata[];
}

export interface TableRelationship {
  fromTable: string;
  toTable: string;
  joinKey: string;
  displayLabel: string;
}

export const TABLE_METADATA: Record<string, TableMetadata> = {
  shipment: {
    table: 'shipment',
    displayLabel: 'Shipments',
    description: 'Main shipment records with customer, carrier, and financial data',
    primaryKey: 'load_id',
    fields: [
      { field: 'load_id', displayLabel: 'Load ID', dataType: 'number', aggregations: ['count'] },
      { field: 'load_number', displayLabel: 'Load Number', dataType: 'text' },
      { field: 'reference_number', displayLabel: 'Reference Number', dataType: 'text' },
      { field: 'customer_id', displayLabel: 'Customer ID', dataType: 'number' },
      { field: 'pickup_date', displayLabel: 'Pickup Date', dataType: 'date', aggregations: ['count', 'min', 'max'] },
      { field: 'delivery_date', displayLabel: 'Delivery Date', dataType: 'date', aggregations: ['count', 'min', 'max'] },
      { field: 'expected_delivery_date', displayLabel: 'Expected Delivery', dataType: 'date', aggregations: ['count', 'min', 'max'] },
      {
        field: 'retail',
        displayLabel: 'Total Cost',
        dataType: 'number',
        description: 'Amount charged to customer',
        aggregations: ['sum', 'avg', 'min', 'max'],
        sampleValue: '$1,250.00'
      },
      {
        field: 'cost',
        displayLabel: 'Carrier Cost',
        dataType: 'number',
        description: 'Cost paid to carrier',
        adminOnly: true,
        aggregations: ['sum', 'avg', 'min', 'max'],
        sampleValue: '$950.00'
      },
      { field: 'status_name', displayLabel: 'Status', dataType: 'text' },
      { field: 'mode_name', displayLabel: 'Mode', dataType: 'text' },
      { field: 'equipment_name', displayLabel: 'Equipment Type', dataType: 'text' },
      { field: 'origin_city', displayLabel: 'Origin City', dataType: 'text' },
      { field: 'origin_state', displayLabel: 'Origin State', dataType: 'text' },
      { field: 'origin_zip', displayLabel: 'Origin Zip', dataType: 'text' },
      { field: 'destination_city', displayLabel: 'Destination City', dataType: 'text' },
      { field: 'destination_state', displayLabel: 'Destination State', dataType: 'text' },
      { field: 'destination_zip', displayLabel: 'Destination Zip', dataType: 'text' },
      { field: 'miles', displayLabel: 'Miles', dataType: 'number', aggregations: ['sum', 'avg', 'min', 'max'], sampleValue: '450' },
    ]
  },
  shipment_item: {
    table: 'shipment_item',
    displayLabel: 'Line Items',
    description: 'Individual items within shipments',
    primaryKey: 'id',
    fields: [
      { field: 'load_id', displayLabel: 'Load ID', dataType: 'number' },
      { field: 'description', displayLabel: 'Item Description', dataType: 'text', description: 'Product or item description' },
      {
        field: 'quantity',
        displayLabel: 'Quantity',
        dataType: 'number',
        aggregations: ['sum', 'avg', 'min', 'max'],
        sampleValue: '24'
      },
      {
        field: 'weight',
        displayLabel: 'Weight',
        dataType: 'number',
        aggregations: ['sum', 'avg', 'min', 'max'],
        sampleValue: '1,200 lbs'
      },
      { field: 'sku', displayLabel: 'SKU', dataType: 'text' },
      { field: 'nmfc_code', displayLabel: 'NMFC Code', dataType: 'text' },
      { field: 'freight_class', displayLabel: 'Freight Class', dataType: 'text' },
    ]
  },
  shipment_carrier: {
    table: 'shipment_carrier',
    displayLabel: 'Carrier Assignments',
    description: 'Carrier assignments for shipments',
    primaryKey: 'id',
    fields: [
      { field: 'load_id', displayLabel: 'Load ID', dataType: 'number' },
      { field: 'carrier_name', displayLabel: 'Carrier Name', dataType: 'text' },
      { field: 'mc_number', displayLabel: 'MC Number', dataType: 'text' },
      { field: 'dot_number', displayLabel: 'DOT Number', dataType: 'text' },
      { field: 'scac_code', displayLabel: 'SCAC Code', dataType: 'text' },
    ]
  },
  shipment_address: {
    table: 'shipment_address',
    displayLabel: 'Addresses',
    description: 'Pickup and delivery addresses',
    primaryKey: 'id',
    fields: [
      { field: 'load_id', displayLabel: 'Load ID', dataType: 'number' },
      { field: 'address_type', displayLabel: 'Address Type', dataType: 'text', description: 'pickup or delivery' },
      { field: 'company_name', displayLabel: 'Company Name', dataType: 'text' },
      { field: 'address', displayLabel: 'Street Address', dataType: 'text' },
      { field: 'city', displayLabel: 'City', dataType: 'text' },
      { field: 'state', displayLabel: 'State', dataType: 'text' },
      { field: 'zip', displayLabel: 'Zip Code', dataType: 'text' },
      { field: 'country', displayLabel: 'Country', dataType: 'text' },
    ]
  },
  shipment_accessorial: {
    table: 'shipment_accessorial',
    displayLabel: 'Accessorials',
    description: 'Additional charges and services',
    primaryKey: 'id',
    fields: [
      { field: 'load_id', displayLabel: 'Load ID', dataType: 'number' },
      { field: 'accessorial_type', displayLabel: 'Accessorial Type', dataType: 'text' },
      {
        field: 'charge',
        displayLabel: 'Charge Amount',
        dataType: 'number',
        aggregations: ['sum', 'avg', 'min', 'max'],
        sampleValue: '$75.00'
      },
      { field: 'description', displayLabel: 'Description', dataType: 'text' },
    ]
  },
};

export const TABLE_RELATIONSHIPS: TableRelationship[] = [
  {
    fromTable: 'shipment',
    toTable: 'shipment_item',
    joinKey: 'load_id',
    displayLabel: 'Include Line Items'
  },
  {
    fromTable: 'shipment',
    toTable: 'shipment_carrier',
    joinKey: 'load_id',
    displayLabel: 'Include Carrier Details'
  },
  {
    fromTable: 'shipment',
    toTable: 'shipment_address',
    joinKey: 'load_id',
    displayLabel: 'Include Addresses'
  },
  {
    fromTable: 'shipment',
    toTable: 'shipment_accessorial',
    joinKey: 'load_id',
    displayLabel: 'Include Accessorials'
  },
];

export function getAvailableJoins(primaryTable: string): TableRelationship[] {
  return TABLE_RELATIONSHIPS.filter(rel => rel.fromTable === primaryTable);
}

export function getFieldsForTable(tableName: string, isAdmin: boolean = false): FieldMetadata[] {
  const metadata = TABLE_METADATA[tableName];
  if (!metadata) return [];

  return metadata.fields.filter(field => !field.adminOnly || isAdmin);
}

export function getNumericFieldsForTable(tableName: string, isAdmin: boolean = false): FieldMetadata[] {
  return getFieldsForTable(tableName, isAdmin).filter(field =>
    field.dataType === 'number' && field.aggregations && field.aggregations.length > 0
  );
}

export function getAllAvailableFields(primaryTable: string, joins: { table: string }[], isAdmin: boolean = false): FieldMetadata[] {
  const tables = [primaryTable, ...joins.map(j => j.table)];
  const allFields: FieldMetadata[] = [];

  tables.forEach(tableName => {
    const fields = getFieldsForTable(tableName, isAdmin);
    fields.forEach(field => {
      allFields.push({
        ...field,
        field: `${tableName}.${field.field}`,
        displayLabel: `${TABLE_METADATA[tableName]?.displayLabel}: ${field.displayLabel}`
      });
    });
  });

  return allFields;
}

import { Column } from '../types/visualBuilderTypes';

export const ALL_COLUMNS: Column[] = [
  { id: 'load_id', label: 'Load ID', category: 'shipment', type: 'number', description: 'Unique shipment identifier' },
  { id: 'reference_number', label: 'Reference Number', category: 'shipment', type: 'string' },
  { id: 'bol_number', label: 'BOL Number', category: 'shipment', type: 'string' },
  { id: 'pro_number', label: 'PRO Number', category: 'shipment', type: 'string' },
  { id: 'po_reference', label: 'PO Reference', category: 'shipment', type: 'string' },
  { id: 'status_name', label: 'Status', category: 'shipment', type: 'string', description: 'Current shipment status' },
  { id: 'mode_name', label: 'Mode', category: 'shipment', type: 'string', description: 'LTL, TL, Parcel, etc.' },
  { id: 'equipment_name', label: 'Equipment Type', category: 'shipment', type: 'string' },
  { id: 'service_type', label: 'Service Type', category: 'shipment', type: 'string' },
  { id: 'pickup_date', label: 'Pickup Date', category: 'shipment', type: 'date' },
  { id: 'delivery_date', label: 'Delivery Date', category: 'shipment', type: 'date' },
  { id: 'shipped_date', label: 'Shipped Date', category: 'shipment', type: 'date' },
  { id: 'created_date', label: 'Created Date', category: 'shipment', type: 'date' },
  { id: 'miles', label: 'Miles', category: 'shipment', type: 'number', description: 'Distance in miles' },
  { id: 'weight', label: 'Weight (lbs)', category: 'shipment', type: 'number' },
  { id: 'number_of_pallets', label: 'Pallets', category: 'shipment', type: 'number' },
  { id: 'linear_feet', label: 'Linear Feet', category: 'shipment', type: 'number' },
  { id: 'is_completed', label: 'Is Completed', category: 'shipment', type: 'boolean' },
  { id: 'is_cancelled', label: 'Is Cancelled', category: 'shipment', type: 'boolean' },
  { id: 'is_late', label: 'Is Late', category: 'shipment', type: 'boolean' },

  { id: 'retail', label: 'Retail (Your Charge)', category: 'financial', type: 'number', description: 'Amount you pay for shipping' },
  { id: 'retail_without_tax', label: 'Retail (No Tax)', category: 'financial', type: 'number' },
  { id: 'fuel_surcharge', label: 'Fuel Surcharge', category: 'financial', type: 'number' },
  { id: 'accessorial_total', label: 'Accessorial Charges', category: 'financial', type: 'number' },
  { id: 'shipment_value', label: 'Declared Value', category: 'financial', type: 'number' },

  { id: 'cost', label: 'Cost (Carrier Pay)', category: 'financial', type: 'number', description: 'Amount paid to carrier', adminOnly: true },
  { id: 'cost_without_tax', label: 'Cost (No Tax)', category: 'financial', type: 'number', adminOnly: true },
  { id: 'margin', label: 'Margin ($)', category: 'financial', type: 'number', description: 'Profit margin in dollars', adminOnly: true },
  { id: 'margin_percent', label: 'Margin (%)', category: 'financial', type: 'number', description: 'Profit margin percentage', adminOnly: true },
  { id: 'linehaul', label: 'Linehaul Cost', category: 'financial', type: 'number', adminOnly: true },
  { id: 'carrier_total', label: 'Carrier Total', category: 'financial', type: 'number', adminOnly: true },
  { id: 'target_rate', label: 'Target Rate', category: 'financial', type: 'number', adminOnly: true },

  { id: 'origin_city', label: 'Origin City', category: 'origin', type: 'string' },
  { id: 'origin_state', label: 'Origin State', category: 'origin', type: 'string' },
  { id: 'origin_zip', label: 'Origin ZIP', category: 'origin', type: 'string' },
  { id: 'origin_country', label: 'Origin Country', category: 'origin', type: 'string' },
  { id: 'shipper_name', label: 'Shipper Name', category: 'origin', type: 'string' },

  { id: 'dest_city', label: 'Destination City', category: 'destination', type: 'string' },
  { id: 'dest_state', label: 'Destination State', category: 'destination', type: 'string' },
  { id: 'dest_zip', label: 'Destination ZIP', category: 'destination', type: 'string' },
  { id: 'dest_country', label: 'Destination Country', category: 'destination', type: 'string' },
  { id: 'consignee_name', label: 'Consignee Name', category: 'destination', type: 'string' },

  { id: 'carrier_name', label: 'Carrier Name', category: 'carrier', type: 'string', description: 'Trucking company' },
  { id: 'carrier_code', label: 'Carrier Code', category: 'carrier', type: 'string' },
  { id: 'scac', label: 'SCAC Code', category: 'carrier', type: 'string' },
  { id: 'carrier_pro', label: 'Carrier PRO #', category: 'carrier', type: 'string' },

  { id: 'item_description', label: 'Product Description', category: 'products', type: 'string', description: 'Item/product name' },
  { id: 'item_descriptions', label: 'All Products', category: 'products', type: 'string', description: 'All products in shipment' },
  { id: 'commodity', label: 'Commodity', category: 'products', type: 'string' },
  { id: 'freight_class', label: 'Freight Class', category: 'products', type: 'string' },
  { id: 'nmfc_code', label: 'NMFC Code', category: 'products', type: 'string' },
  { id: 'sku', label: 'SKU', category: 'products', type: 'string' },
  { id: 'package_type', label: 'Package Type', category: 'products', type: 'string' },
  { id: 'item_weight', label: 'Item Weight', category: 'products', type: 'number' },
  { id: 'item_quantity', label: 'Item Quantity', category: 'products', type: 'number' },
  { id: 'item_count', label: 'Line Item Count', category: 'products', type: 'number' },
  { id: 'declared_value', label: 'Declared Value', category: 'products', type: 'number' },
  { id: 'has_hazmat', label: 'Has Hazmat', category: 'products', type: 'boolean' },

  { id: 'customer_name', label: 'Customer Name', category: 'customer', type: 'string' },
  { id: 'customer_id', label: 'Customer ID', category: 'customer', type: 'number' },

  { id: 'pickup_month', label: 'Pickup Month', category: 'time', type: 'string', description: 'YYYY-MM format' },
  { id: 'pickup_week', label: 'Pickup Week', category: 'time', type: 'string' },
  { id: 'pickup_year', label: 'Pickup Year', category: 'time', type: 'number' },
  { id: 'day_of_week', label: 'Day of Week', category: 'time', type: 'string' },
];

export const ADMIN_ONLY_COLUMNS = new Set(
  ALL_COLUMNS.filter(c => c.adminOnly).map(c => c.id)
);

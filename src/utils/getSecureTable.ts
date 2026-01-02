import { isRestrictedField } from '../security/restrictedFields';

export type SecureTableName =
  | 'shipment'
  | 'shipment_carrier'
  | 'shipment_address'
  | 'shipment_item'
  | 'shipment_accessorial'
  | 'shipment_detail'
  | 'shipment_note';

const customerViews: Record<SecureTableName, string> = {
  'shipment': 'shipment_customer_view',
  'shipment_carrier': 'shipment_carrier_customer_view',
  'shipment_address': 'shipment_address_customer_view',
  'shipment_item': 'shipment_item_customer_view',
  'shipment_accessorial': 'shipment_accessorial_customer_view',
  'shipment_detail': 'shipment_detail_customer_view',
  'shipment_note': 'shipment_note_customer_view',
};

export function getSecureTable(
  baseTable: SecureTableName,
  isAdmin: boolean,
  isViewingAsCustomer: boolean = false
): string {
  if (isAdmin && !isViewingAsCustomer) {
    return baseTable;
  }

  return customerViews[baseTable] || baseTable;
}

export function getSelectFields(
  baseFields: string,
  isAdmin: boolean,
  isViewingAsCustomer: boolean = false
): string {
  if (isAdmin && !isViewingAsCustomer) {
    return baseFields;
  }

  const fields = baseFields
    .split(',')
    .map(f => f.trim())
    .filter(f => {
      const cleanField = f.split('.').pop()?.split(' ')[0] || '';
      return !isRestrictedField(cleanField);
    });

  return fields.join(', ');
}

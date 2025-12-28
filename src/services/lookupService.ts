import { supabase } from '../lib/supabase';

export interface LookupData {
  modes: Map<number, { code: string; name: string }>;
  statuses: Map<number, { code: string; name: string }>;
  equipmentTypes: Map<number, { code: string; name: string }>;
  carriers: Map<number, { name: string; scac: string }>;
}

let lookupCache: LookupData | null = null;
let loadingPromise: Promise<LookupData> | null = null;

export const loadLookupTables = async (): Promise<LookupData> => {
  if (lookupCache) return lookupCache;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [modes, statuses, equipment, carriers] = await Promise.all([
      supabase.from('shipment_mode').select('mode_id, mode_code, mode_name'),
      supabase.from('shipment_status').select('status_id, status_code, status_name'),
      supabase.from('equipment_type').select('equipment_type_id, equipment_code, equipment_name'),
      supabase.from('carrier').select('carrier_id, carrier_name, scac'),
    ]);

    lookupCache = {
      modes: new Map(
        (modes.data || []).map((m) => [m.mode_id, { code: m.mode_code, name: m.mode_name }])
      ),
      statuses: new Map(
        (statuses.data || []).map((s) => [s.status_id, { code: s.status_code, name: s.status_name }])
      ),
      equipmentTypes: new Map(
        (equipment.data || []).map((e) => [
          e.equipment_type_id,
          { code: e.equipment_code, name: e.equipment_name },
        ])
      ),
      carriers: new Map(
        (carriers.data || []).map((c) => [c.carrier_id, { name: c.carrier_name, scac: c.scac }])
      ),
    };

    loadingPromise = null;
    return lookupCache;
  })();

  return loadingPromise;
};

export const getLookupDisplayValue = (
  lookups: LookupData | null,
  field: string,
  value: unknown
): string => {
  if (value === null || value === undefined) return '-';
  if (!lookups) return String(value);

  const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);

  switch (field) {
    case 'mode_id': {
      const mode = lookups.modes.get(numValue);
      return mode?.code || mode?.name || String(value);
    }

    case 'status_id': {
      const status = lookups.statuses.get(numValue);
      return status?.code || status?.name || String(value);
    }

    case 'equipment_type_id': {
      const equip = lookups.equipmentTypes.get(numValue);
      return equip?.code || equip?.name || String(value);
    }

    case 'carrier_id': {
      const carrier = lookups.carriers.get(numValue);
      return carrier?.name || String(value);
    }

    default:
      return String(value);
  }
};

export const getLookupDisplayValueAsync = async (
  field: string,
  value: unknown
): Promise<string> => {
  const lookups = await loadLookupTables();
  return getLookupDisplayValue(lookups, field, value);
};

export const clearLookupCache = () => {
  lookupCache = null;
  loadingPromise = null;
};

export const getLookupCache = (): LookupData | null => {
  return lookupCache;
};

export const formatFieldValue = (
  lookups: LookupData | null,
  fieldId: string,
  value: unknown
): string => {
  if (value === null || value === undefined) return '-';

  const lookupFields = ['mode_id', 'status_id', 'equipment_type_id', 'carrier_id'];
  if (lookupFields.includes(fieldId)) {
    return getLookupDisplayValue(lookups, fieldId, value);
  }

  if (fieldId === 'retail' || fieldId === 'cost' || fieldId === 'margin' || fieldId === 'target_rate' || fieldId === 'shipment_value' || fieldId === 'charge_amount' || fieldId === 'cost_amount') {
    const numVal = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numVal)) return '-';
    return `$${numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (fieldId === 'miles' || fieldId === 'number_of_pallets' || fieldId === 'total_weight' || fieldId === 'total_quantity') {
    const numVal = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numVal)) return '-';
    return numVal.toLocaleString('en-US');
  }

  if (fieldId === 'pickup_date' || fieldId === 'delivery_date' || fieldId === 'created_date' || fieldId === 'estimated_delivery_date' || fieldId === 'expected_delivery_date') {
    if (!value) return '-';
    try {
      return new Date(String(value)).toLocaleDateString('en-US');
    } catch {
      return String(value);
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

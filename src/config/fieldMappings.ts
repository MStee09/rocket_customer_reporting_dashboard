export interface FieldMapping {
  field: string;
  displayLabel: string;
  adminOnly?: boolean;
  description?: string;
}

export const FIELD_MAPPINGS: Record<string, FieldMapping> = {
  retail: {
    field: 'retail',
    displayLabel: 'Total Cost',
    description: 'Amount charged to customer',
  },
  cost: {
    field: 'cost',
    displayLabel: 'Carrier Cost',
    adminOnly: true,
    description: 'Cost paid to carrier',
  },
  revenue: {
    field: 'revenue',
    displayLabel: 'Total Cost',
    description: 'Amount charged to customer',
  },
  margin: {
    field: 'margin',
    displayLabel: 'Margin',
    adminOnly: true,
    description: 'Profit margin (Total Cost - Carrier Cost)',
  },
  load_number: {
    field: 'load_number',
    displayLabel: 'Load Number',
  },
  reference_number: {
    field: 'reference_number',
    displayLabel: 'Reference Number',
  },
  pickup_date: {
    field: 'pickup_date',
    displayLabel: 'Pickup Date',
  },
  delivery_date: {
    field: 'delivery_date',
    displayLabel: 'Delivery Date',
  },
  expected_delivery_date: {
    field: 'expected_delivery_date',
    displayLabel: 'Expected Delivery',
  },
};

export const getFieldLabel = (field: string, isAdmin: boolean = false): string => {
  const mapping = FIELD_MAPPINGS[field];

  if (!mapping) {
    return field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  if (mapping.adminOnly && !isAdmin) {
    return '';
  }

  return mapping.displayLabel;
};

export const isFieldVisible = (field: string, isAdmin: boolean = false): boolean => {
  const mapping = FIELD_MAPPINGS[field];

  if (!mapping) {
    return true;
  }

  if (mapping.adminOnly && !isAdmin) {
    return false;
  }

  return true;
};

export const calculateMargin = (retail: number, cost: number): number => {
  return retail - cost;
};

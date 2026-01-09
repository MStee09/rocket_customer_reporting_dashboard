export const RESTRICTED_FIELDS = [
  'cost',
  'cost_amount',
  'cost_per_mile',
  'cost_without_tax',
  'margin',
  'margin_percent',
  'margin_amount',
  'profit',
  'markup',
  'wholesale',
  'carrier_cost',
  'carrier_pay',
  'carrier_rate',
  'target_rate',
  'buy_rate',
  'sell_rate',
  'net_revenue',
  'commission',
  'commission_percent',
];

const RESTRICTED_FIELDS_SET = new Set<string>(
  RESTRICTED_FIELDS.map(f => f.toLowerCase())
);

export function isRestrictedField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-]/g, '');

  if (RESTRICTED_FIELDS_SET.has(fieldName.toLowerCase())) {
    return true;
  }

  return RESTRICTED_FIELDS.some(restricted => {
    const normalizedRestricted = restricted.toLowerCase().replace(/[_-]/g, '');
    return normalized.includes(normalizedRestricted) || normalizedRestricted.includes(normalized);
  });
}

export function filterRestrictedFields(fields: string[]): string[] {
  return fields.filter(field => !isRestrictedField(field));
}

export function findRestrictedFieldsInString(text: string): string[] {
  const found: string[] = [];
  const normalized = text.toLowerCase();

  for (const field of RESTRICTED_FIELDS) {
    const patterns = [
      new RegExp(`\\b${field}\\b`),
      new RegExp(`"${field}"`),
      new RegExp(`'${field}'`),
    ];
    if (patterns.some(pattern => pattern.test(normalized))) {
      found.push(field);
    }
  }

  return found;
}

export function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN

You have full access to all fields including:
- cost, margin, margin_percent, cost_per_mile
- carrier_cost, carrier_pay, carrier_rate
- profit, markup, commission

You can perform margin analysis, cost comparisons, and profitability reports.`;
  }

  return `## ACCESS LEVEL: CUSTOMER

RESTRICTED FIELDS (DO NOT USE): cost, margin, margin_percent, cost_per_mile, carrier_cost, profit, commission

### IMPORTANT DISTINCTION
When customers say "cost", "spend", or "expensive", they mean THEIR freight spend (what they pay).
This is the **retail** field and IS available to them.

- Customer "cost" = **retail** field (what customer pays for shipping)
- Internal "cost" = **cost** field (what we pay carriers) - RESTRICTED

If asked about margins, internal costs, or profitability, explain that this data is not available in customer reports.`;
}

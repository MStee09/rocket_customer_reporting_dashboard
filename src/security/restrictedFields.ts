export const RESTRICTED_FIELDS = [
  'cost',
  'cost_amount',
  'cost_per_mile',
  'cost_without_tax',
  'margin',
  'margin_percent',
  'margin_amount',
  'carrier_cost',
  'carrier_pay',
  'carrier_rate',
  'target_rate',
  'buy_rate',
  'sell_rate',
  'commission',
  'commission_percent',
] as const;

export type RestrictedField = typeof RESTRICTED_FIELDS[number];

const RESTRICTED_FIELDS_SET = new Set<string>(
  RESTRICTED_FIELDS.map(f => f.toLowerCase())
);

export function isRestrictedField(fieldName: string): boolean {
  return RESTRICTED_FIELDS_SET.has(fieldName.toLowerCase());
}

export function filterRestrictedFields(fields: string[]): string[] {
  return fields.filter(field => !isRestrictedField(field));
}

export function findRestrictedFieldsInString(str: string): string[] {
  const lowerStr = str.toLowerCase();
  return RESTRICTED_FIELDS.filter(field => {
    const patterns = [
      new RegExp(`\\b${field}\\b`),
      new RegExp(`"${field}"`),
      new RegExp(`'${field}'`),
    ];
    return patterns.some(pattern => pattern.test(lowerStr));
  });
}

export function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN\nYou have full access including cost, margin, margin_percent, cost_per_mile.`;
  }
  return `## ACCESS LEVEL: CUSTOMER
RESTRICTED FIELDS (DO NOT USE): cost, margin, margin_percent, cost_per_mile, carrier_cost

### IMPORTANT DISTINCTION
When customers say "cost", "spend", or "expensive", they mean THEIR freight spend (what they pay).
This is the **retail** field and IS available to them.

- Customer "cost" = **retail** field (what customer pays for shipping)
- Internal "cost" = **cost** field (what Go Rocket pays carriers) - RESTRICTED`;
}

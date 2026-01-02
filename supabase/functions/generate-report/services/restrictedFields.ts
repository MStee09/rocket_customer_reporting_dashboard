export const RESTRICTED_FIELDS = [
  'cost',
  'margin',
  'profit',
  'markup',
  'wholesale',
  'buy_rate',
  'net_cost',
  'carrier_cost',
  'internal_cost',
  'commission'
];

export function isRestrictedField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return RESTRICTED_FIELDS.some(restricted => 
    lower === restricted || 
    lower.includes(restricted) ||
    lower.includes('_cost') ||
    lower.includes('cost_') ||
    lower.includes('margin') ||
    lower.includes('profit')
  );
}

export function findRestrictedFieldsInString(str: string): string[] {
  const lower = str.toLowerCase();
  return RESTRICTED_FIELDS.filter(field => lower.includes(field));
}

export function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN
You have full access to all fields including cost, margin, and profit data.`;
  }
  
  return `## ACCESS LEVEL: CUSTOMER
IMPORTANT: You do NOT have access to cost, margin, or profit fields.
Never include these in reports: ${RESTRICTED_FIELDS.join(', ')}.
If asked about costs or margins, explain this data is not available.`;
}
export const RESTRICTED_FIELDS = [
  'cost',
  'margin',
  'profit',
  'markup',
  'wholesale',
  'buy_rate',
  'carrier_cost',
  'net_revenue',
  'commission'
];

export function isRestrictedField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-]/g, '');
  return RESTRICTED_FIELDS.some(restricted => {
    const normalizedRestricted = restricted.toLowerCase().replace(/[_-]/g, '');
    return normalized.includes(normalizedRestricted) || normalizedRestricted.includes(normalized);
  });
}

export function findRestrictedFieldsInString(text: string): string[] {
  const found: string[] = [];
  const normalized = text.toLowerCase();
  
  for (const field of RESTRICTED_FIELDS) {
    if (normalized.includes(field.toLowerCase())) {
      found.push(field);
    }
  }
  
  return found;
}

export function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN
You have full access to all fields including financial/cost data.`;
  }
  
  return `## ACCESS LEVEL: CUSTOMER
You are helping a customer. You MUST NOT include these restricted fields in any reports:
${RESTRICTED_FIELDS.map(f => `- ${f}`).join('\n')}

If a customer asks about costs, margins, or profitability, politely explain that this information is not available in their reports.`;
}
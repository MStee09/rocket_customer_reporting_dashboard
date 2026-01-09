// ============================================================================
// TYPESCRIPT FILE 1 OF 4: restrictedFields.ts
// Location: supabase/functions/generate-report/services/restrictedFields.ts
// Action: CREATE NEW FILE
// ============================================================================

export const RESTRICTED_FIELDS: string[] = [
  'cost',
  'margin',
  'margin_percent',
  'buy_rate',
  'carrier_cost',
  'profit',
  'net_revenue',
];

export function isRestrictedField(fieldName: string): boolean {
  return RESTRICTED_FIELDS.includes(fieldName.toLowerCase());
}

export function getAccessControlPrompt(isAdmin: boolean): string {
  if (isAdmin) {
    return `## ACCESS LEVEL: ADMIN

You have full access to all fields including:
- ${RESTRICTED_FIELDS.join(', ')}

You can perform margin analysis, cost comparisons, and profitability reports.`;
  }

  return `## ACCESS LEVEL: CUSTOMER

You have access to customer-facing data only.
You CANNOT access or reference: ${RESTRICTED_FIELDS.join(', ')}.

If asked about margins, costs, or profitability, explain that this data is not available.`;
}

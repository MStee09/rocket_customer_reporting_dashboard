# PHASE 1: RESTRICTED FIELDS (Security - Do First)

## Time: ~15 minutes
## Risk: Low
## Impact: Eliminates 5 duplicate field definitions, single source of truth

---

## PASTE 1 of 5: Create Edge Function Service File

**Instruction for Bolt:**
> Create new file `supabase/functions/generate-report/services/restrictedFields.ts` with this content:

```typescript
/**
 * RESTRICTED FIELDS - SINGLE SOURCE OF TRUTH
 * 
 * These fields contain sensitive business data that should NEVER be exposed
 * to customers through AI reports, sample values, or any other mechanism.
 */

export const RESTRICTED_FIELDS = Object.freeze([
  // Cost fields (what Go Rocket pays carriers - internal)
  'cost',
  'cost_amount',
  'cost_per_mile',
  'cost_without_tax',
  
  // Margin fields (profit margins - internal)
  'margin',
  'margin_percent',
  'margin_amount',
  
  // Carrier cost fields (carrier payment details - internal)
  'carrier_cost',
  'carrier_pay',
  'carrier_rate',
  
  // Rate fields (pricing strategy - internal)
  'target_rate',
  'buy_rate',
  'sell_rate',
  
  // Commission fields (sales compensation - internal)
  'commission',
  'commission_percent',
] as const);

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
  return `## ACCESS LEVEL: CUSTOMER\nRESTRICTED FIELDS (DO NOT USE): cost, margin, margin_percent, cost_per_mile, carrier_cost\n\n### IMPORTANT DISTINCTION\nWhen customers say "cost", "spend", or "expensive", they mean THEIR freight spend (what they pay).\nThis is the **retail** field and IS available to them.\n\n- ✅ Customer "cost" = **retail** field (what customer pays for shipping)\n- ❌ Internal "cost" = **cost** field (what Go Rocket pays carriers) - RESTRICTED`;
}
```

---

## PASTE 2 of 5: Update Edge Function Imports

**Instruction for Bolt:**
> In `supabase/functions/generate-report/index.ts`, make these changes:
>
> 1. Add this import after line 2 (after the Anthropic import):
> ```typescript
> import { RESTRICTED_FIELDS, isRestrictedField, findRestrictedFieldsInString, getAccessControlPrompt } from './services/restrictedFields.ts';
> ```
>
> 2. DELETE line 92 which says:
> ```typescript
> const ADMIN_ONLY_FIELDS = ["cost", "margin", "margin_percent", "carrier_cost", "cost_per_mile"];
> ```
>
> 3. Replace ALL occurrences of `ADMIN_ONLY_FIELDS` with `RESTRICTED_FIELDS` (there should be about 4-5 occurrences)
>
> 4. DELETE the `getAccessControlPrompt` function (around lines 541-546) since we now import it

---

## PASTE 3 of 5: Create Frontend Shared File

**Instruction for Bolt:**
> Create new file `src/security/restrictedFields.ts` with this content:

```typescript
/**
 * RESTRICTED FIELDS - SINGLE SOURCE OF TRUTH (Frontend)
 * 
 * These fields contain sensitive business data that should NEVER be exposed
 * to customers through AI reports, sample values, or any other mechanism.
 */

export const RESTRICTED_FIELDS = [
  // Cost fields (what Go Rocket pays carriers - internal)
  'cost',
  'cost_amount',
  'cost_per_mile',
  'cost_without_tax',
  
  // Margin fields (profit margins - internal)
  'margin',
  'margin_percent',
  'margin_amount',
  
  // Carrier cost fields (carrier payment details - internal)
  'carrier_cost',
  'carrier_pay',
  'carrier_rate',
  
  // Rate fields (pricing strategy - internal)
  'target_rate',
  'buy_rate',
  'sell_rate',
  
  // Commission fields (sales compensation - internal)
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
```

---

## PASTE 4 of 5: Update getSecureTable.ts

**Instruction for Bolt:**
> In `src/utils/getSecureTable.ts`, make these changes:
>
> 1. Add this import at the top:
> ```typescript
> import { isRestrictedField } from '@/security/restrictedFields';
> ```
>
> 2. DELETE lines 32-38 which define `adminOnlyFields`:
> ```typescript
> const adminOnlyFields = new Set([
>   'cost',
>   'cost_without_tax',
>   'carrier_pay',
>   'cost_amount',
>   'target_rate'
> ]);
> ```
>
> 3. In the `getSelectFields` function, change line 54 from:
> ```typescript
> return !adminOnlyFields.has(cleanField);
> ```
> to:
> ```typescript
> return !isRestrictedField(cleanField);
> ```

---

## PASTE 5 of 5: Update schemaCompiler.ts

**Instruction for Bolt:**
> In `src/ai/compiler/schemaCompiler.ts`, make these changes:
>
> 1. Add this import at the top:
> ```typescript
> import { isRestrictedField } from '@/security/restrictedFields';
> ```
>
> 2. DELETE line 7 which defines `ADMIN_ONLY_FIELDS`:
> ```typescript
> const ADMIN_ONLY_FIELDS = ['cost', 'margin', 'carrier_cost'];
> ```
>
> 3. Change line 77 from:
> ```typescript
> adminOnly: ADMIN_ONLY_FIELDS.includes(col.column_name) || context?.admin_only,
> ```
> to:
> ```typescript
> adminOnly: isRestrictedField(col.column_name) || context?.admin_only,
> ```

---

## PASTE 6 of 5 (Bonus): Update accessControl.ts

**Instruction for Bolt:**
> In `src/ai/policies/accessControl.ts`, make these changes:
>
> 1. Add this import at the top:
> ```typescript
> import { RESTRICTED_FIELDS, isRestrictedField } from '@/security/restrictedFields';
> ```
>
> 2. DELETE lines 8-12 which define `ACCESS_RULES`:
> ```typescript
> const ACCESS_RULES: AccessRule[] = [
>   { field: 'cost', requiredRole: 'admin', action: 'hide' },
>   { field: 'margin', requiredRole: 'admin', action: 'hide' },
>   { field: 'carrier_cost', requiredRole: 'admin', action: 'hide' },
> ];
> ```
>
> 3. Replace `ACCESS_RULES.map(r => r.field)` with `[...RESTRICTED_FIELDS]` everywhere it appears (about 3 places)

---

## ✅ PHASE 1 COMPLETE

**Test by:**
1. Run the app
2. Log in as a customer (not admin)
3. Try to create a report that uses "cost" or "margin"
4. Verify the AI refuses or uses "retail" instead

**Deploy the edge function:**
```bash
supabase functions deploy generate-report
```

---

## Ready for Phase 2?
Phase 2 adds token budget (cost control) to prevent runaway AI loops.

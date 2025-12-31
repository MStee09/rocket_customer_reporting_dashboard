// src/ai/policies/accessControl.ts
// Enforces field-level access control on AI outputs
// This is CODE enforcement, not just prompt instructions

import { AIReportDefinition, ReportSection } from '../../types/aiReport';
import { AccessRule, AccessContext, AccessControlResult } from '../types';

const ACCESS_RULES: AccessRule[] = [
  { field: 'cost', requiredRole: 'admin', action: 'hide' },
  { field: 'margin', requiredRole: 'admin', action: 'hide' },
  { field: 'carrier_cost', requiredRole: 'admin', action: 'hide' },
];

export function getPromptAccessInstructions(context: AccessContext): string {
  if (context.isAdmin) {
    return `## ACCESS LEVEL: ADMIN

You have full access to all data fields including:
- cost (carrier cost)
- margin (profit margin)
- All financial metrics

You can build reports using any available field.`;
  }

  const restrictedFields = ACCESS_RULES.map(r => r.field);

  return `## ACCESS LEVEL: CUSTOMER

RESTRICTED FIELDS - DO NOT USE:
${restrictedFields.map(f => `- ${f}`).join('\n')}

### IMPORTANT DISTINCTION

When customers say "cost", "spend", or "expensive", they mean THEIR freight spend (what they pay).
This is the **retail** field and IS available to them.

- ✅ Customer "cost" = **retail** field (what customer pays for shipping)
- ❌ Internal "cost" = **cost** field (what Go Rocket pays carriers) - RESTRICTED

### EXAMPLES

- "Which states cost the most?" → Use **retail**, NOT cost field
- "Show me freight spend" → Use **retail**
- "Most expensive carriers" → Group by carrier_name, aggregate **retail**

These are legitimate customer questions about their own shipping expenses.
DO NOT treat these as access violations.

### TRUE VIOLATIONS

Only flag if customer explicitly asks about:
- Go Rocket's carrier costs
- Margin or profit calculations
- Internal pricing data

NEVER include restricted fields (cost, margin, carrier_cost) in any report section, calculated field, or filter.`;
}

export function enforceAccessControl(
  report: AIReportDefinition,
  context: AccessContext
): AccessControlResult {
  if (context.isAdmin) {
    return { allowed: true, sanitizedReport: report };
  }

  const restrictedFields = ACCESS_RULES.map(r => r.field);
  const violations: string[] = [];
  const sanitized = JSON.parse(JSON.stringify(report)) as AIReportDefinition;

  // Check and remove sections with restricted fields
  for (let i = sanitized.sections.length - 1; i >= 0; i--) {
    const section = sanitized.sections[i];
    const sectionViolations = checkSectionForViolations(section, restrictedFields);

    if (sectionViolations.length > 0) {
      violations.push(...sectionViolations.map(v =>
        `Section "${section.title || section.type}": ${v}`
      ));
      sanitized.sections.splice(i, 1);
    }
  }

  // Check calculated fields at report level
  if (sanitized.calculatedFields) {
    for (let i = sanitized.calculatedFields.length - 1; i >= 0; i--) {
      const calc = sanitized.calculatedFields[i];
      const usesRestricted = restrictedFields.some(f =>
        calc.formula?.toLowerCase().includes(f) ||
        calc.fields?.some(cf => cf.toLowerCase() === f)
      );

      if (usesRestricted) {
        violations.push(`Calculated field "${calc.name}" uses restricted fields`);
        sanitized.calculatedFields.splice(i, 1);
      }
    }
  }

  if (violations.length > 0) {
    console.warn(`[ACCESS CONTROL] Customer ${context.customerId} - Violations sanitized:`, violations);
  }

  return {
    allowed: violations.length === 0,
    sanitizedReport: sanitized,
    violations: violations.length > 0 ? violations : undefined,
  };
}

function checkSectionForViolations(section: ReportSection, restrictedFields: string[]): string[] {
  const violations: string[] = [];
  const config = section.config as Record<string, any>;

  if (!config) return violations;

  if (config.metric?.field && restrictedFields.includes(config.metric.field.toLowerCase())) {
    violations.push(`uses restricted metric field: ${config.metric.field}`);
  }

  if (config.groupBy && restrictedFields.includes(config.groupBy.toLowerCase())) {
    violations.push(`groups by restricted field: ${config.groupBy}`);
  }

  if (config.metrics && Array.isArray(config.metrics)) {
    for (const m of config.metrics) {
      if (m.field && restrictedFields.includes(m.field.toLowerCase())) {
        violations.push(`uses restricted metric: ${m.field}`);
      }
    }
  }

  if (config.columns && Array.isArray(config.columns)) {
    for (const col of config.columns) {
      if (col.field && restrictedFields.includes(col.field.toLowerCase())) {
        violations.push(`displays restricted column: ${col.field}`);
      }
    }
  }

  if (config.filters && Array.isArray(config.filters)) {
    for (const filter of config.filters) {
      if (filter.field && restrictedFields.includes(filter.field.toLowerCase())) {
        violations.push(`filters on restricted field: ${filter.field}`);
      }
    }
  }

  if (config.calculatedFields && Array.isArray(config.calculatedFields)) {
    for (const calc of config.calculatedFields) {
      const usesRestricted = restrictedFields.some(f =>
        calc.formula?.toLowerCase().includes(f) ||
        calc.fields?.some((cf: string) => cf.toLowerCase() === f)
      );
      if (usesRestricted) {
        violations.push(`calculated field uses restricted data`);
      }
    }
  }

  return violations;
}

export function isFieldAccessible(field: string, context: AccessContext): boolean {
  if (context.isAdmin) return true;
  const restrictedFields = ACCESS_RULES.map(r => r.field);
  return !restrictedFields.includes(field.toLowerCase());
}

export function getRestrictedFields(context: AccessContext): string[] {
  if (context.isAdmin) return [];
  return ACCESS_RULES.map(r => r.field);
}

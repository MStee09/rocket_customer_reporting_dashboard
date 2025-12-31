// src/ai/compiler/schemaCompiler.ts
// Compiles database schema into AI context

import { supabase } from '../../lib/supabase';
import { SchemaContext, SchemaField, DataProfile } from '../types';

const ADMIN_ONLY_FIELDS = ['cost', 'margin', 'carrier_cost'];

export async function compileSchemaContext(customerId: string): Promise<SchemaContext> {
  // Get schema columns from metadata table
  const { data: columns, error: columnsError } = await supabase
    .from('schema_columns')
    .select('*')
    .eq('view_name', 'shipment_report_view')
    .order('ordinal_position');

  if (columnsError) {
    console.error('Failed to fetch schema columns:', columnsError);
  }

  // Get field business context
  const { data: fieldContext, error: contextError } = await supabase
    .from('field_business_context')
    .select('*');

  if (contextError) {
    console.error('Failed to fetch field context:', contextError);
  }

  // Get customer data profile
  let dataProfile: DataProfile = {
    totalShipments: 0,
    stateCount: 0,
    carrierCount: 0,
    monthsOfData: 0,
    topStates: [],
    topCarriers: [],
    avgShipmentsPerDay: 0,
  };

  try {
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_customer_data_profile', { p_customer_id: customerId });

    if (!profileError && profileData) {
      dataProfile = {
        totalShipments: profileData.totalShipments || 0,
        stateCount: profileData.stateCount || 0,
        carrierCount: profileData.carrierCount || 0,
        monthsOfData: profileData.monthsOfData || 0,
        topStates: profileData.topStates || [],
        topCarriers: profileData.topCarriers || [],
        avgShipmentsPerDay: profileData.avgShipmentsPerDay || 0,
        hasCanadaData: profileData.hasCanadaData,
      };
    }
  } catch (e) {
    console.error('Error fetching data profile:', e);
  }

  // Build context map
  const contextMap = new Map<string, any>();
  (fieldContext || []).forEach(fc => {
    contextMap.set(fc.field_name, fc);
  });

  // Merge columns with context
  const fields: SchemaField[] = (columns || []).map(col => {
    const context = contextMap.get(col.column_name);
    return {
      name: col.column_name,
      type: col.data_type,
      isGroupable: col.is_groupable ?? true,
      isAggregatable: col.is_aggregatable ?? false,
      businessContext: context?.business_description,
      aiInstructions: context?.ai_instructions,
      adminOnly: ADMIN_ONLY_FIELDS.includes(col.column_name) || context?.admin_only,
    };
  });

  return { fields, dataProfile };
}

export function formatSchemaForPrompt(schema: SchemaContext, isAdmin: boolean): string {
  let output = '## AVAILABLE DATA FIELDS\n\n';
  output += 'You can ONLY use these fields in reports. Do NOT reference any field not listed here.\n\n';
  output += '| Field | Type | Group By | Aggregate | Description |\n';
  output += '|-------|------|----------|-----------|-------------|\n';

  for (const field of schema.fields) {
    if (!isAdmin && field.adminOnly) continue;

    const groupable = field.isGroupable ? '✓' : '';
    const aggregatable = field.isAggregatable ? 'SUM/AVG' : 'COUNT';
    const description = field.businessContext || '';
    const adminNote = field.adminOnly ? ' (ADMIN)' : '';

    output += `| ${field.name} | ${field.type} | ${groupable} | ${aggregatable} | ${description}${adminNote} |\n`;
  }

  output += '\n## CUSTOMER DATA PROFILE\n\n';
  output += `- **Total Shipments:** ${schema.dataProfile.totalShipments.toLocaleString()}\n`;
  output += `- **Ships to:** ${schema.dataProfile.stateCount} states`;
  if (schema.dataProfile.hasCanadaData) output += ' (including Canadian provinces)';
  output += '\n';
  output += `- **Uses:** ${schema.dataProfile.carrierCount} carriers\n`;
  output += `- **Data History:** ${schema.dataProfile.monthsOfData} months\n`;
  output += `- **Volume:** ~${schema.dataProfile.avgShipmentsPerDay.toFixed(1)} shipments/day\n`;

  if (schema.dataProfile.topStates.length > 0) {
    output += `- **Top Destinations:** ${schema.dataProfile.topStates.slice(0, 5).join(', ')}\n`;
  }
  if (schema.dataProfile.topCarriers.length > 0) {
    output += `- **Top Carriers:** ${schema.dataProfile.topCarriers.slice(0, 3).join(', ')}\n`;
  }

  output += '\n### CRITICAL RULES\n';
  output += '1. **Only use fields listed above** - anything else will cause errors\n';
  output += '2. **Respect Group By column** - only fields marked ✓ can be grouped\n';
  output += '3. **Respect Aggregate column** - numeric fields support SUM/AVG, others only COUNT\n';
  if (!isAdmin) {
    output += '4. **Financial data note**: Use `retail` for customer spend/cost analysis.\n';
    output += '   The fields `cost`, `margin`, `carrier_cost` are internal Go Rocket data and not available.\n';
  }

  output += '\n### COMMON MAPPINGS\n';
  output += 'When customers use these terms, map them to the correct fields:\n';
  output += '- "cost", "spend", "freight cost", "shipping cost" → use `retail` field\n';
  output += '- "expensive", "most costly" → sort by `retail` descending\n';
  output += '- "cost per shipment" → avg(retail)\n';
  output += '- "total spend" → sum(retail)\n';
  output += '- "cheapest carriers" → carrier_name grouped by avg(retail) ascending\n';

  return output;
}

export function getAvailableFields(schema: SchemaContext, isAdmin: boolean): string[] {
  return schema.fields.filter(f => isAdmin || !f.adminOnly).map(f => f.name);
}

export function isFieldAvailable(schema: SchemaContext, fieldName: string, isAdmin: boolean): boolean {
  const field = schema.fields.find(f => f.name === fieldName);
  if (!field) return false;
  if (!isAdmin && field.adminOnly) return false;
  return true;
}

export function isFieldGroupable(schema: SchemaContext, fieldName: string): boolean {
  const field = schema.fields.find(f => f.name === fieldName);
  return field?.isGroupable ?? false;
}

export function isFieldAggregatable(schema: SchemaContext, fieldName: string): boolean {
  const field = schema.fields.find(f => f.name === fieldName);
  return field?.isAggregatable ?? false;
}

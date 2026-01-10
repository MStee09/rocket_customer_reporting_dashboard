import { supabase } from '../../lib/supabase';
import { SchemaContext, SchemaField, DataProfile } from '../types';
import { isRestrictedField } from '../../security/restrictedFields';

export async function compileSchemaContext(customerId: string): Promise<SchemaContext> {
  const fields = await fetchSchemaFields();
  const dataProfile = await fetchDataProfile(customerId);

  return { fields, dataProfile };
}

async function fetchSchemaFields(): Promise<SchemaField[]> {
  try {
    const { data, error } = await supabase
      .from('schema_columns_metadata')
      .select('column_name, data_type, is_groupable, is_aggregatable, business_context, ai_instructions, category')
      .eq('view_name', 'shipment_report_view')
      .order('ordinal_position');

    if (!error && data && data.length > 0) {
      console.log(`[SchemaCompiler] Loaded ${data.length} fields from schema_columns_metadata`);
      return data.map(col => ({
        name: col.column_name,
        type: col.data_type,
        isGroupable: col.is_groupable ?? true,
        isAggregatable: col.is_aggregatable ?? false,
        businessContext: col.business_context,
        aiInstructions: col.ai_instructions,
        adminOnly: isRestrictedField(col.column_name),
        category: col.category
      }));
    }
  } catch (e) {
    console.warn('[SchemaCompiler] Dynamic view failed:', e);
  }

  try {
    const { data, error } = await supabase
      .from('schema_columns')
      .select('column_name, data_type, is_groupable, is_aggregatable')
      .eq('view_name', 'shipment_report_view')
      .order('ordinal_position');

    if (!error && data && data.length > 0) {
      console.log(`[SchemaCompiler] Loaded ${data.length} fields from schema_columns table`);

      const { data: contextData } = await supabase
        .from('field_business_context')
        .select('field_name, business_description, ai_instructions');

      const contextMap = new Map(
        (contextData || []).map(c => [c.field_name, c])
      );

      return data.map(col => {
        const ctx = contextMap.get(col.column_name);
        return {
          name: col.column_name,
          type: col.data_type,
          isGroupable: col.is_groupable ?? true,
          isAggregatable: col.is_aggregatable ?? false,
          businessContext: ctx?.business_description,
          aiInstructions: ctx?.ai_instructions,
          adminOnly: isRestrictedField(col.column_name)
        };
      });
    }
  } catch (e) {
    console.warn('[SchemaCompiler] Table fallback failed:', e);
  }

  try {
    const { data, error } = await supabase.rpc('get_available_fields', { p_include_context: true });

    if (!error && data && data.length > 0) {
      console.log(`[SchemaCompiler] Loaded ${data.length} fields from RPC`);
      return data.map((col: Record<string, unknown>) => ({
        name: col.column_name as string,
        type: col.data_type as string,
        isGroupable: (col.is_groupable as boolean) ?? true,
        isAggregatable: (col.is_aggregatable as boolean) ?? false,
        businessContext: col.business_context as string | undefined,
        aiInstructions: col.ai_instructions as string | undefined,
        adminOnly: isRestrictedField(col.column_name as string),
        category: col.category as string | undefined
      }));
    }
  } catch (e) {
    console.warn('[SchemaCompiler] RPC fallback failed:', e);
  }

  console.error('[SchemaCompiler] All sources failed, using hardcoded defaults');
  return getDefaultSchema();
}

function getDefaultSchema(): SchemaField[] {
  return [
    { name: 'load_id', type: 'text', isGroupable: false, isAggregatable: false },
    { name: 'customer_id', type: 'integer', isGroupable: true, isAggregatable: false },
    { name: 'reference_number', type: 'text', isGroupable: false, isAggregatable: false },

    { name: 'pickup_date', type: 'date', isGroupable: true, isAggregatable: false },
    { name: 'delivery_date', type: 'date', isGroupable: true, isAggregatable: false },
    { name: 'expected_delivery_date', type: 'date', isGroupable: true, isAggregatable: false },

    { name: 'retail', type: 'numeric', isGroupable: false, isAggregatable: true,
      businessContext: 'Customer freight cost' },
    { name: 'miles', type: 'numeric', isGroupable: false, isAggregatable: true },

    { name: 'carrier_name', type: 'text', isGroupable: true, isAggregatable: false,
      businessContext: 'Carrier company name' },
    { name: 'carrier_scac', type: 'text', isGroupable: true, isAggregatable: false },

    { name: 'status_name', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'is_completed', type: 'boolean', isGroupable: true, isAggregatable: false },
    { name: 'is_cancelled', type: 'boolean', isGroupable: true, isAggregatable: false },
    { name: 'is_late', type: 'boolean', isGroupable: true, isAggregatable: false,
      businessContext: 'Delivery was/is late' },

    { name: 'mode_name', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'equipment_name', type: 'text', isGroupable: true, isAggregatable: false },

    { name: 'origin_company', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'origin_city', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'origin_state', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'origin_zip', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'origin_country', type: 'text', isGroupable: true, isAggregatable: false },

    { name: 'destination_company', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'destination_city', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'destination_state', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'destination_zip', type: 'text', isGroupable: true, isAggregatable: false },
    { name: 'destination_country', type: 'text', isGroupable: true, isAggregatable: false },

    { name: 'item_descriptions', type: 'text', isGroupable: false, isAggregatable: false,
      businessContext: 'Searchable text of all item descriptions',
      aiInstructions: 'Use ILIKE for product keyword search' },
    { name: 'primary_commodity', type: 'text', isGroupable: true, isAggregatable: false,
      businessContext: 'Most common commodity type' },
    { name: 'total_weight', type: 'numeric', isGroupable: false, isAggregatable: true,
      businessContext: 'Combined weight of all items (lbs)' },
    { name: 'item_count', type: 'integer', isGroupable: false, isAggregatable: true,
      businessContext: 'Number of line items' },
    { name: 'freight_classes', type: 'text', isGroupable: true, isAggregatable: false,
      businessContext: 'LTL freight classifications' },
    { name: 'has_hazmat', type: 'boolean', isGroupable: true, isAggregatable: false,
      businessContext: 'Contains hazardous materials' }
  ];
}

async function fetchDataProfile(customerId: string): Promise<DataProfile> {
  const defaultProfile: DataProfile = {
    totalShipments: 0,
    stateCount: 0,
    carrierCount: 0,
    monthsOfData: 0,
    topStates: [],
    topCarriers: [],
    avgShipmentsPerDay: 0,
  };

  try {
    const { data, error } = await supabase
      .rpc('get_customer_data_profile', { p_customer_id: parseInt(customerId, 10) });

    if (error || !data) {
      console.error('[SchemaCompiler] Data profile error:', error);
      return defaultProfile;
    }

    return {
      totalShipments: data.total_shipments || 0,
      stateCount: data.state_count || 0,
      carrierCount: data.carrier_count || 0,
      monthsOfData: data.months_of_data || 0,
      topStates: data.top_states || [],
      topCarriers: data.top_carriers || [],
      avgShipmentsPerDay: data.avg_shipments_per_day || 0,
      hasCanadaData: data.has_canada_data || false,
    };
  } catch (e) {
    console.error('[SchemaCompiler] Data profile exception:', e);
    return defaultProfile;
  }
}

export function formatSchemaForPrompt(schema: SchemaContext, isAdmin: boolean): string {
  let output = '## AVAILABLE DATA FIELDS\n\n';
  output += 'You can ONLY use these fields in reports. Do NOT reference any field not listed here.\n\n';
  output += '| Field | Type | Group By | Aggregate | Description |\n';
  output += '|-------|------|----------|-----------|-------------|\n';

  for (const field of schema.fields) {
    if (!isAdmin && field.adminOnly) continue;

    const groupable = field.isGroupable ? 'Y' : '';
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
  output += '2. **Respect Group By column** - only fields marked Y can be grouped\n';
  output += '3. **Respect Aggregate column** - numeric fields support SUM/AVG, others only COUNT\n';
  if (!isAdmin) {
    output += '4. **Financial data note**: Use `retail` for customer spend/cost analysis.\n';
    output += '   The fields `cost`, `margin`, `carrier_cost` are internal Go Rocket data and not available.\n';
  }

  output += '\n### PRODUCT SEARCH\n';
  output += 'To find shipments by product/commodity:\n';
  output += '- Use `item_descriptions ILIKE \'%keyword%\'` for text search\n';
  output += '- Group by `primary_commodity` for category breakdown\n';
  output += '- Use `total_weight`, `item_count` for volume analysis\n';

  output += '\n### COMMON MAPPINGS\n';
  output += 'When customers use these terms, map them to the correct fields:\n';
  output += '- "cost", "spend", "freight cost", "shipping cost" -> use `retail` field\n';
  output += '- "expensive", "most costly" -> sort by `retail` descending\n';
  output += '- "cost per shipment" -> avg(retail)\n';
  output += '- "total spend" -> sum(retail)\n';
  output += '- "cheapest carriers" -> carrier_name grouped by avg(retail) ascending\n';
  output += '- "drawer system", "cargoglide", product names -> search `item_descriptions`\n';

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

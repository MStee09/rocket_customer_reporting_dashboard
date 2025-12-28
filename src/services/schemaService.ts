import { SupabaseClient } from '@supabase/supabase-js';
import { loadLookupTables, LookupData } from './lookupService';
import {
  ALL_FIELDS,
  SHIPMENT_FIELDS,
  CUSTOMER_FIELDS,
  CARRIER_FIELDS,
  LOCATION_FIELDS,
  ITEM_FIELDS,
  ACCESSORIAL_FIELDS,
  FieldDefinition,
  FieldType,
} from '../config/schema/fieldSchema';

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'lookup' | 'id' | 'percentage';
  label: string;
  description?: string;
  lookupTable?: string;
  format?: string;
  aggregatable?: boolean;
  groupable?: boolean;
  adminOnly?: boolean;
}

export interface TableSchema {
  name: string;
  label: string;
  description: string;
  columns: ColumnSchema[];
  primaryKey: string;
}

export interface LookupValue {
  id: number;
  code: string;
  name: string;
}

export interface LookupValues {
  [lookupTable: string]: LookupValue[];
}

export interface MetricDefinition {
  name: string;
  description: string;
  calculation: string;
  format: 'number' | 'currency' | 'percent';
  adminOnly?: boolean;
}

export interface SchemaContext {
  tables: TableSchema[];
  lookups: LookupValues;
  commonMetrics: MetricDefinition[];
  customerInfo: {
    name: string;
    dataDateRange: { earliest: string; latest: string };
    totalRecords: number;
  };
}

export interface SampleDataPatterns {
  patterns: string[];
  examples: string[];
}

const convertFieldType = (type: FieldType): ColumnSchema['type'] => {
  if (type === 'percentage') return 'number';
  return type as ColumnSchema['type'];
};

const fieldToColumnSchema = (field: FieldDefinition): ColumnSchema => ({
  name: field.column,
  type: convertFieldType(field.type),
  label: field.label,
  description: field.description,
  lookupTable: field.lookup?.table,
  aggregatable: field.availableForAggregation,
  groupable: field.availableForGrouping,
  adminOnly: field.adminOnly,
});

const shipmentTableSchema: TableSchema = {
  name: 'shipment',
  label: 'Shipments',
  description: 'Freight shipment records including costs, dates, modes, and delivery details',
  primaryKey: 'load_id',
  columns: SHIPMENT_FIELDS.map(fieldToColumnSchema),
};

const customerTableSchema: TableSchema = {
  name: 'customer',
  label: 'Customers',
  description: 'Customer company information and account status',
  primaryKey: 'customer_id',
  columns: CUSTOMER_FIELDS.map(fieldToColumnSchema),
};

const carrierTableSchema: TableSchema = {
  name: 'shipment_carrier',
  label: 'Carrier Assignments',
  description: 'Carrier assignments including driver info, PRO numbers, and carrier pay',
  primaryKey: 'shipment_carrier_id',
  columns: CARRIER_FIELDS.map(fieldToColumnSchema),
};

const locationTableSchema: TableSchema = {
  name: 'shipment_address',
  label: 'Shipment Addresses',
  description: 'Origin and destination locations with contact info and appointment times',
  primaryKey: 'address_id',
  columns: LOCATION_FIELDS.map(fieldToColumnSchema),
};

const itemTableSchema: TableSchema = {
  name: 'shipment_item',
  label: 'Shipment Items',
  description: 'Line items including weight, dimensions, hazmat info, and declared values',
  primaryKey: 'item_id',
  columns: ITEM_FIELDS.map(fieldToColumnSchema),
};

const accessorialTableSchema: TableSchema = {
  name: 'shipment_accessorial',
  label: 'Accessorials',
  description: 'Additional charges and services for shipments',
  primaryKey: 'accessorial_id',
  columns: ACCESSORIAL_FIELDS.map(fieldToColumnSchema),
};

export const commonMetrics: MetricDefinition[] = [
  {
    name: 'Total Shipments',
    description: 'Count of all shipments',
    calculation: 'COUNT(*)',
    format: 'number',
  },
  {
    name: 'Total Revenue',
    description: 'Sum of customer charges',
    calculation: 'SUM(retail)',
    format: 'currency',
  },
  {
    name: 'Total Cost',
    description: 'Sum of carrier costs',
    calculation: 'SUM(cost)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Total Margin',
    description: 'Revenue minus cost',
    calculation: 'SUM(retail) - SUM(cost)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Margin Percent',
    description: 'Margin as percentage of revenue',
    calculation: '(SUM(retail) - SUM(cost)) / SUM(retail) * 100',
    format: 'percent',
    adminOnly: true,
  },
  {
    name: 'Average Revenue',
    description: 'Average revenue per shipment',
    calculation: 'AVG(retail)',
    format: 'currency',
  },
  {
    name: 'Average Cost',
    description: 'Average cost per shipment',
    calculation: 'AVG(cost)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Total Miles',
    description: 'Sum of all miles',
    calculation: 'SUM(miles)',
    format: 'number',
  },
  {
    name: 'Average Miles',
    description: 'Average miles per shipment',
    calculation: 'AVG(miles)',
    format: 'number',
  },
  {
    name: 'Revenue Per Mile',
    description: 'Average revenue per mile',
    calculation: 'SUM(retail) / NULLIF(SUM(miles), 0)',
    format: 'currency',
  },
  {
    name: 'Cost Per Mile',
    description: 'Average cost per mile',
    calculation: 'SUM(cost) / NULLIF(SUM(miles), 0)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Total Weight',
    description: 'Sum of shipment weights',
    calculation: 'SUM(total_weight)',
    format: 'number',
  },
  {
    name: 'Total Pallets',
    description: 'Sum of pallets shipped',
    calculation: 'SUM(number_of_pallets)',
    format: 'number',
  },
  {
    name: 'Revenue Per Pallet',
    description: 'Average revenue per pallet',
    calculation: 'SUM(retail) / NULLIF(SUM(number_of_pallets), 0)',
    format: 'currency',
  },
  {
    name: 'Total Carrier Pay',
    description: 'Sum of carrier pay amounts',
    calculation: 'SUM(carrier_pay)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Average Carrier Pay',
    description: 'Average carrier pay per shipment',
    calculation: 'AVG(carrier_pay)',
    format: 'currency',
    adminOnly: true,
  },
  {
    name: 'Total Declared Value',
    description: 'Sum of all declared shipment values',
    calculation: 'SUM(shipment_value)',
    format: 'currency',
  },
];

const convertLookupData = (lookups: LookupData): LookupValues => {
  const result: LookupValues = {};

  result.shipment_mode = Array.from(lookups.modes.entries()).map(([id, data]) => ({
    id,
    code: data.code,
    name: data.name,
  }));

  result.shipment_status = Array.from(lookups.statuses.entries()).map(([id, data]) => ({
    id,
    code: data.code,
    name: data.name,
  }));

  result.equipment_type = Array.from(lookups.equipmentTypes.entries()).map(([id, data]) => ({
    id,
    code: data.code,
    name: data.name,
  }));

  result.carrier = Array.from(lookups.carriers.entries()).map(([id, data]) => ({
    id,
    code: data.scac,
    name: data.name,
  }));

  return result;
};

export async function buildSchemaContext(
  supabase: SupabaseClient,
  customerId: number,
  isAdmin: boolean = false
): Promise<SchemaContext> {
  const lookups = await loadLookupTables();

  const { data: customerData } = await supabase
    .from('customer')
    .select('company_name')
    .eq('customer_id', customerId)
    .maybeSingle();

  const { data: earliestData } = await supabase
    .from('shipment')
    .select('pickup_date')
    .eq('customer_id', customerId)
    .not('pickup_date', 'is', null)
    .order('pickup_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: latestData } = await supabase
    .from('shipment')
    .select('pickup_date')
    .eq('customer_id', customerId)
    .not('pickup_date', 'is', null)
    .order('pickup_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await supabase
    .from('shipment')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId);

  const filterColumns = (columns: ColumnSchema[]) => {
    if (isAdmin) return columns;
    return columns.filter(col => !col.adminOnly);
  };

  const tables: TableSchema[] = [
    {
      ...shipmentTableSchema,
      columns: filterColumns(shipmentTableSchema.columns),
    },
    customerTableSchema,
    {
      ...carrierTableSchema,
      columns: filterColumns(carrierTableSchema.columns),
    },
    locationTableSchema,
    itemTableSchema,
    {
      ...accessorialTableSchema,
      columns: filterColumns(accessorialTableSchema.columns),
    },
  ];

  const metrics = isAdmin
    ? commonMetrics
    : commonMetrics.filter(m => !m.adminOnly);

  return {
    tables,
    lookups: convertLookupData(lookups),
    commonMetrics: metrics,
    customerInfo: {
      name: customerData?.company_name || 'Customer',
      dataDateRange: {
        earliest: earliestData?.pickup_date || '',
        latest: latestData?.pickup_date || '',
      },
      totalRecords: count || 0,
    },
  };
}

export async function sampleColumnValues(
  supabase: SupabaseClient,
  customerId: number,
  columnName: string,
  limit: number = 20
): Promise<string[]> {
  const { data } = await supabase
    .from('shipment')
    .select(columnName)
    .eq('customer_id', customerId)
    .not(columnName, 'is', null)
    .limit(limit * 2);

  if (!data) return [];

  const values = [...new Set(data.map(row => String(row[columnName])))];
  return values.slice(0, limit);
}

export async function sampleDescriptionPatterns(
  supabase: SupabaseClient,
  customerId: number
): Promise<SampleDataPatterns> {
  const { data: itemData } = await supabase
    .from('shipment_item')
    .select('description, load_id')
    .limit(100);

  if (!itemData || itemData.length === 0) {
    return { patterns: [], examples: [] };
  }

  const { data: customerShipments } = await supabase
    .from('shipment')
    .select('load_id')
    .eq('customer_id', customerId)
    .limit(500);

  const customerLoadIds = new Set(customerShipments?.map(s => s.load_id) || []);
  const customerItems = itemData.filter(item => customerLoadIds.has(item.load_id));

  const descriptions = customerItems
    .map(row => row.description)
    .filter(Boolean) as string[];

  if (descriptions.length === 0) {
    return { patterns: [], examples: [] };
  }

  const examples = descriptions.slice(0, 10);

  const words: Record<string, number> = {};
  descriptions.forEach(desc => {
    desc.toUpperCase().split(/\s+/).forEach(word => {
      const cleaned = word.replace(/[^A-Z0-9]/g, '');
      if (cleaned.length > 3) {
        words[cleaned] = (words[cleaned] || 0) + 1;
      }
    });
  });

  const patterns = Object.entries(words)
    .filter(([, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);

  return { patterns, examples };
}

export async function getTopValues(
  supabase: SupabaseClient,
  customerId: number,
  columnName: string,
  limit: number = 10
): Promise<Array<{ value: string; count: number }>> {
  const { data } = await supabase
    .from('shipment')
    .select(columnName)
    .eq('customer_id', customerId)
    .not(columnName, 'is', null);

  if (!data) return [];

  const counts: Record<string, number> = {};
  data.forEach(row => {
    const value = String(row[columnName]);
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildAISystemPrompt(
  schema: SchemaContext,
  sampleData?: SampleDataPatterns
): string {
  const formatDateRange = () => {
    const { earliest, latest } = schema.customerInfo.dataDateRange;
    if (!earliest || !latest) return 'No data available';
    try {
      const start = new Date(earliest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const end = new Date(latest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${start} to ${end}`;
    } catch {
      return `${earliest} to ${latest}`;
    }
  };

  return `You are an AI assistant that helps users build custom freight analytics reports and dashboards.

## CUSTOMER CONTEXT
Customer: ${schema.customerInfo.name}
Data Range: ${formatDateRange()}
Total Shipments: ${schema.customerInfo.totalRecords.toLocaleString()}

## AVAILABLE DATA TABLES

${schema.tables.map((table, index) => `### ${index + 1}. ${table.label}
${table.description}

**Columns Available:**
${table.columns.map(col => `- ${col.name}: ${col.label}${col.description ? ` - ${col.description}` : ''}${col.lookupTable ? ` (lookup: ${col.lookupTable})` : ''}`).join('\n')}
`).join('\n')}

## FIELD CAPABILITIES

**Groupable Fields** (can use for breakdowns/categories):
${schema.tables.flatMap(t => t.columns.filter(col => col.groupable).map(col => `- ${col.name}: ${col.label}`)).join('\n')}

**Aggregatable Fields** (can SUM, AVG, COUNT, MIN, MAX):
${schema.tables.flatMap(t => t.columns.filter(col => col.aggregatable).map(col => `- ${col.name}: ${col.label} (${col.type})`)).join('\n')}

**Date Fields** (can filter and group by time periods):
${schema.tables.flatMap(t => t.columns.filter(col => col.type === 'date').map(col => `- ${col.name}: ${col.label}`)).join('\n')}

### Lookup Values
${Object.entries(schema.lookups).map(([table, values]) => {
  const displayValues = values.slice(0, 10).map(v => v.code || v.name).join(', ');
  const suffix = values.length > 10 ? ` (+${values.length - 10} more)` : '';
  return `**${table}**: ${displayValues}${suffix}`;
}).join('\n')}

### Common Metrics You Can Calculate
${schema.commonMetrics.map(m => `- **${m.name}**: ${m.description}`).join('\n')}

${sampleData && sampleData.patterns.length > 0 ? `
## SAMPLE DATA PATTERNS
Common terms in shipment descriptions: ${sampleData.patterns.join(', ')}
Example descriptions: ${sampleData.examples.slice(0, 5).map(e => `"${e}"`).join(', ')}
` : ''}

## YOUR CAPABILITIES
You can help users create:
1. **KPI Cards** - Single metrics like Total Revenue, Shipment Count
2. **Charts** - Bar, Line, Pie charts showing trends and distributions
3. **Tables** - Detailed data views with sorting and filtering
4. **Dashboards** - Combinations of the above

## RESPONSE FORMAT
When the user describes what they want, respond with:
1. A brief confirmation of what you understood
2. Any clarifying questions if needed
3. A JSON report definition when ready

Report Definition JSON Structure:
\`\`\`json
{
  "name": "Report Name",
  "description": "What this report shows",
  "type": "kpi" | "bar_chart" | "line_chart" | "pie_chart" | "table",
  "config": {
    "metric": "calculation expression",
    "groupBy": "column_name (optional)",
    "filters": [],
    "columns": [],
    "sortBy": "column_name (optional)",
    "limit": 10
  }
}
\`\`\`

Be conversational and helpful. Ask questions to clarify requirements. Suggest improvements based on available data.`;
}

export function getAvailableFields(isAdmin: boolean = false): FieldDefinition[] {
  if (isAdmin) return ALL_FIELDS;
  return ALL_FIELDS.filter(f => !f.adminOnly);
}

export function getGroupableFields(isAdmin: boolean = false): FieldDefinition[] {
  return getAvailableFields(isAdmin).filter(f => f.availableForGrouping);
}

export function getAggregatableFields(isAdmin: boolean = false): FieldDefinition[] {
  return getAvailableFields(isAdmin).filter(f => f.availableForAggregation);
}

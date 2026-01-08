import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// =============================================================================
// TYPES
// =============================================================================

interface RequestBody {
  question: string;
  customerId: string;
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferences?: {
    showReasoning?: boolean;
    forceMode?: 'quick' | 'deep' | 'visual';
  };
}

interface ReasoningStep {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
}

interface FollowUpQuestion {
  id: string;
  question: string;
}

type VisualizationType =
  | 'bar' | 'pie' | 'line' | 'area' | 'stat'
  | 'treemap' | 'heatmap' | 'radar' | 'waterfall'
  | 'choropleth' | 'flowmap'
  | 'table';

interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  subtitle?: string;
  data: unknown;
  config?: Record<string, unknown>;
}

// =============================================================================
// SEMANTIC LAYER: FIELD METADATA
// =============================================================================

interface FieldMetadata {
  type: 'numeric' | 'categorical' | 'date' | 'boolean';
  unit?: string;
  canGroupBy: boolean;
  canAggregate: boolean;
  canBucket: boolean;
  suggestedBuckets?: Array<{ label: string; min: number; max: number }>;
  displayName: string;
  description?: string;
}

const FIELD_METADATA: Record<string, FieldMetadata> = {
  // === NUMERIC FIELDS (can be aggregated AND bucketed) ===
  retail: {
    type: 'numeric',
    unit: 'USD',
    canGroupBy: false,
    canAggregate: true,
    canBucket: true,
    displayName: 'Cost',
    description: 'Shipment cost/retail price',
    suggestedBuckets: [
      { label: '$0-$500', min: 0, max: 500 },
      { label: '$500-$1,000', min: 500, max: 1000 },
      { label: '$1,000-$2,500', min: 1000, max: 2500 },
      { label: '$2,500-$5,000', min: 2500, max: 5000 },
      { label: '$5,000+', min: 5000, max: 999999 },
    ]
  },
  miles: {
    type: 'numeric',
    unit: 'miles',
    canGroupBy: false,
    canAggregate: true,
    canBucket: true,
    displayName: 'Miles',
    description: 'Shipment distance',
    suggestedBuckets: [
      { label: '0-250 mi', min: 0, max: 250 },
      { label: '250-500 mi', min: 250, max: 500 },
      { label: '500-1,000 mi', min: 500, max: 1000 },
      { label: '1,000-1,500 mi', min: 1000, max: 1500 },
      { label: '1,500+ mi', min: 1500, max: 999999 },
    ]
  },
  total_weight: {
    type: 'numeric',
    unit: 'lbs',
    canGroupBy: false,
    canAggregate: true,
    canBucket: true,
    displayName: 'Weight',
    description: 'Total shipment weight',
    suggestedBuckets: [
      { label: '0-500 lbs', min: 0, max: 500 },
      { label: '500-1,000 lbs', min: 500, max: 1000 },
      { label: '1,000-2,500 lbs', min: 1000, max: 2500 },
      { label: '2,500-5,000 lbs', min: 2500, max: 5000 },
      { label: '5,000+ lbs', min: 5000, max: 999999 },
    ]
  },

  // === CATEGORICAL FIELDS (group by only) ===
  carrier_name: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Carrier',
    description: 'Shipping carrier name'
  },
  origin_state: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Origin State',
    description: 'Shipment origin state'
  },
  destination_state: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Destination State',
    description: 'Shipment destination state'
  },
  mode_name: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Mode',
    description: 'Shipping mode (LTL, FTL, etc.)'
  },
  equipment_name: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Equipment',
    description: 'Equipment type'
  },
  status_name: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Status',
    description: 'Shipment status'
  },
  origin_city: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Origin City'
  },
  destination_city: {
    type: 'categorical',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Destination City'
  },

  // === DATE FIELDS ===
  created_date: {
    type: 'date',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Created Date'
  },
  pickup_date: {
    type: 'date',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Pickup Date'
  },
  delivery_date: {
    type: 'date',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Delivery Date'
  },

  // === BOOLEAN FIELDS ===
  is_late: {
    type: 'boolean',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Late Status'
  },
  is_completed: {
    type: 'boolean',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Completed'
  },
  has_hazmat: {
    type: 'boolean',
    canGroupBy: true,
    canAggregate: false,
    canBucket: false,
    displayName: 'Hazmat'
  }
};

// =============================================================================
// DERIVED METRICS REGISTRY
// =============================================================================

interface DerivedMetric {
  formula: string;
  requires: string[];
  unit: string;
  displayName: string;
}

const DERIVED_METRICS: Record<string, DerivedMetric> = {
  cost_per_mile: {
    formula: 'retail / miles',
    requires: ['retail', 'miles'],
    unit: '$/mile',
    displayName: 'Cost per Mile'
  },
  cost_per_pound: {
    formula: 'retail / total_weight',
    requires: ['retail', 'total_weight'],
    unit: '$/lb',
    displayName: 'Cost per Pound'
  },
  avg_cost: {
    formula: 'avg(retail)',
    requires: ['retail'],
    unit: 'USD',
    displayName: 'Average Cost'
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isNumericField(fieldName: string): boolean {
  const metadata = FIELD_METADATA[fieldName];
  return metadata?.type === 'numeric';
}

function canFieldBeBucketed(fieldName: string): boolean {
  const metadata = FIELD_METADATA[fieldName];
  return metadata?.canBucket === true;
}

function getDefaultBuckets(fieldName: string): Array<{ label: string; min: number; max: number }> {
  const metadata = FIELD_METADATA[fieldName];
  return metadata?.suggestedBuckets || [];
}

function formatMetricName(name: string): string {
  // Check derived metrics first
  const derived = DERIVED_METRICS[name];
  if (derived) return derived.displayName;
  
  // Check field metadata
  const field = FIELD_METADATA[name];
  if (field) return field.displayName;
  
  // Fallback to formatting the name
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function determineFormat(metric: string): string {
  const lowerMetric = metric.toLowerCase();
  if (lowerMetric.includes('cost') || lowerMetric.includes('retail') || lowerMetric.includes('price') || lowerMetric.includes('spend') || lowerMetric === 'cost_per_mile' || lowerMetric === 'cost_per_pound') {
    return 'currency';
  }
  if (lowerMetric.includes('percent') || lowerMetric.includes('rate') || lowerMetric.includes('ratio')) {
    return 'percent';
  }
  return 'number';
}

// =============================================================================
// UNIFIED TOOL DEFINITIONS (6 Core Tools)
// =============================================================================

const INVESTIGATION_TOOLS: Anthropic.Tool[] = [
  // === TOOL 1: SCHEMA DISCOVERY ===
  {
    name: "get_field_info",
    description: `Get information about available data fields and what analysis is possible.
Returns: list of fields with their types, whether they can be grouped/aggregated/bucketed.
Use this when you need to understand the data schema or validate a query approach.`,
    input_schema: {
      type: "object" as const,
      properties: {
        field_name: { 
          type: "string", 
          description: "Optional: specific field to get info about. If omitted, returns all fields." 
        }
      },
      required: []
    }
  },

  // === TOOL 2: UNIVERSAL ANALYSIS (THE KEY UNIFIED TOOL) ===
  {
    name: "analyze_metric",
    description: `Universal analysis tool that handles ALL "X by Y" questions. AUTO-DETECTS whether to:
- Group by categorical field (carrier, state, mode)
- Bucket by numeric field (mileage bands, cost brackets, weight ranges)
- Calculate derived metrics (cost per mile, cost per pound)

This is your PRIMARY tool for most analysis questions. The system automatically:
1. Detects if group_by is numeric → creates appropriate buckets
2. Detects if group_by is categorical → standard grouping
3. Calculates derived metrics if requested

Examples:
- "cost by carrier" → group_by: "carrier_name", metric: "retail"
- "cost by mileage bands" → group_by: "miles", metric: "retail" (auto-buckets!)
- "cost per mile by distance" → group_by: "miles", metric: "retail", derived_metric: "cost_per_mile"
- "shipment count by state" → group_by: "origin_state", metric: "retail", aggregation: "count"`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { 
          type: "string", 
          description: "Field to aggregate (e.g., 'retail', 'miles', 'total_weight')" 
        },
        aggregation: { 
          type: "string", 
          enum: ["sum", "avg", "count", "min", "max"],
          description: "How to aggregate the metric" 
        },
        group_by: { 
          type: "string", 
          description: "Field to group by - can be categorical (carrier_name) OR numeric (miles). Numeric fields are auto-bucketed." 
        },
        derived_metric: { 
          type: "string", 
          enum: ["cost_per_mile", "cost_per_pound", "none"],
          description: "Optional: calculate a derived 'per unit' metric. Use for 'cost per mile' type questions." 
        },
        limit: { 
          type: "number", 
          description: "Max groups to return (default: 15)" 
        },
        time_range: {
          type: "string",
          enum: ["last7", "last30", "last90", "last180", "all"],
          description: "Optional time filter"
        }
      },
      required: ["metric", "aggregation", "group_by"]
    }
  },

  // === TOOL 3: TIME SERIES ===
  {
    name: "get_trend",
    description: `Get time-series trend data for a metric.
Returns: data points over time (daily, weekly, or monthly).
Use for "show me trend" or "how has X changed over time" questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to trend (e.g., 'retail', 'miles')" },
        aggregation: { type: "string", enum: ["sum", "avg", "count"], description: "Aggregation" },
        period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time granularity" },
        range: { type: "string", description: "Time range (e.g., 'last30', 'last90', 'last180')" }
      },
      required: ["metric", "aggregation", "period"]
    }
  },

  // === TOOL 4: PERIOD COMPARISON ===
  {
    name: "compare_periods",
    description: `Compare a metric across two time periods to show change.
Returns: values for both periods, absolute change, percent change.
Use for "how has X changed" or "compare this month to last month" questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to compare (e.g., 'retail')" },
        aggregation: { type: "string", enum: ["sum", "avg", "count"], description: "How to aggregate" },
        period1: { type: "string", description: "Current period (e.g., 'last30', 'last7', 'last90')" },
        period2: { type: "string", description: "Previous period to compare against (e.g., 'last60', 'last180')" }
      },
      required: ["metric", "aggregation", "period1", "period2"]
    }
  },

  // === TOOL 5: ANOMALY DETECTION ===
  {
    name: "detect_anomalies",
    description: `Find anomalies - spikes, drops, outliers, unusual patterns in data.
Returns: list of anomalies with deviation scores and type (high/low).
Use for "what's unusual" or "find problems" type questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string", description: "Metric to analyze for anomalies" },
        group_by: { type: "string", description: "Grouping dimension (e.g., find anomalies per carrier)" },
        sensitivity: { type: "string", enum: ["high", "medium", "low"], description: "Detection sensitivity (high catches more)" }
      },
      required: ["metric"]
    }
  },

  // === TOOL 6: SUMMARY STATS ===
  {
    name: "get_summary_stats",
    description: `Get summary statistics for the customer's data.
Returns: total shipments, total spend, avg cost, top carriers, date range.
Use as a starting point for overview questions.`,
    input_schema: {
      type: "object" as const,
      properties: {
        time_range: { type: "string", description: "Time range (e.g., 'last30', 'last90', 'all')" }
      },
      required: []
    }
  }
];

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are an expert logistics data analyst. Your job is to investigate shipping data and provide actionable insights with visualizations.

## CRITICAL: USE analyze_metric FOR ALMOST EVERYTHING

The \`analyze_metric\` tool is your PRIMARY analysis tool. It handles:
- Categorical grouping: "cost by carrier" → group_by: "carrier_name"
- Numeric bucketing: "cost by mileage bands" → group_by: "miles" (AUTO-BUCKETS!)
- Derived metrics: "cost per mile" → derived_metric: "cost_per_mile"

### How It Works
The tool AUTO-DETECTS the field type:
- If group_by is numeric (miles, retail, total_weight) → Creates smart buckets automatically
- If group_by is categorical (carrier_name, origin_state) → Standard grouping

### Question → Tool Mapping
| Question Pattern | Tool | Key Parameters |
|-----------------|------|----------------|
| "cost by carrier" | analyze_metric | group_by: "carrier_name", metric: "retail" |
| "cost by mileage bands" | analyze_metric | group_by: "miles", metric: "retail" |
| "cost per mile by distance" | analyze_metric | group_by: "miles", derived_metric: "cost_per_mile" |
| "shipments by state" | analyze_metric | group_by: "origin_state", aggregation: "count" |
| "trend over time" | get_trend | period: "weekly" |
| "compare to last month" | compare_periods | period1: "last30", period2: "last60" |
| "what's unusual" | detect_anomalies | sensitivity: "medium" |
| "overview of my data" | get_summary_stats | time_range: "last90" |

### Available Fields
**Metrics (for aggregation):** retail (cost), miles, total_weight
**Dimensions (for grouping):** carrier_name, origin_state, destination_state, mode_name, equipment_name, status_name
**Derived Metrics:** cost_per_mile, cost_per_pound

### IMPORTANT RULES
1. ALWAYS use analyze_metric for "X by Y" questions
2. For mileage/weight/cost bands → the tool auto-buckets, just pass the numeric field
3. For "per mile" or "per pound" questions → use derived_metric parameter
4. Never guess at numbers - always use tools

## RESPONSE FORMAT
After investigating:
1. Lead with a direct answer
2. Include key supporting data points
3. Note any caveats
4. Suggest 2-3 follow-up questions`;

// =============================================================================
// TOOL EXECUTION
// =============================================================================

async function executeToolCall(
  supabase: SupabaseClient,
  customerId: string,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'get_field_info': {
      const fieldName = toolInput.field_name as string | undefined;
      
      if (fieldName) {
        const metadata = FIELD_METADATA[fieldName];
        if (!metadata) {
          return { error: `Unknown field: ${fieldName}`, available_fields: Object.keys(FIELD_METADATA) };
        }
        return { field: fieldName, ...metadata };
      }
      
      // Return all fields organized by type
      const fields = {
        numeric_fields: Object.entries(FIELD_METADATA)
          .filter(([_, m]) => m.type === 'numeric')
          .map(([name, m]) => ({ name, displayName: m.displayName, canBucket: m.canBucket })),
        categorical_fields: Object.entries(FIELD_METADATA)
          .filter(([_, m]) => m.type === 'categorical')
          .map(([name, m]) => ({ name, displayName: m.displayName })),
        derived_metrics: Object.entries(DERIVED_METRICS)
          .map(([name, m]) => ({ name, displayName: m.displayName, formula: m.formula }))
      };
      return fields;
    }

    case 'analyze_metric': {
      const groupBy = toolInput.group_by as string;
      const metric = toolInput.metric as string;
      const aggregation = toolInput.aggregation as string;
      const derivedMetric = (toolInput.derived_metric as string) || 'none';
      const limit = (toolInput.limit as number) || 15;
      const timeRange = toolInput.time_range as string | undefined;

      // Detect if this needs bucketing
      const needsBucketing = isNumericField(groupBy) && canFieldBeBucketed(groupBy);

      if (needsBucketing) {
        // BUCKETED ANALYSIS PATH
        return await executeBucketedAnalysis(supabase, customerId, {
          bucketField: groupBy,
          metric,
          aggregation,
          derivedMetric,
          timeRange
        });
      } else {
        // CATEGORICAL GROUPING PATH
        return await executeCategoricalAnalysis(supabase, customerId, {
          groupBy,
          metric,
          aggregation,
          derivedMetric,
          limit,
          timeRange
        });
      }
    }

    case 'get_trend': {
      const metric = toolInput.metric as string;
      const period = toolInput.period as string;
      const range = (toolInput.range as string) || 'last90';

      const rangeDays: Record<string, number> = {
        'last30': 30, 'last60': 60, 'last90': 90, 'last180': 180, 'lastyear': 365
      };
      const days = rangeDays[range.toLowerCase()] || 90;

      const { data } = await supabase
        .from('shipment_report_view')
        .select(`created_date, ${metric}`)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('created_date', { ascending: true });

      if (!data || data.length === 0) {
        return { trend: [], message: 'No data found for the specified period' };
      }

      const grouped = new Map<string, number[]>();
      for (const row of data) {
        const date = new Date(row.created_date);
        let key: string;
        if (period === 'daily') key = date.toISOString().split('T')[0];
        else if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(parseFloat(row[metric]) || 0);
      }

      const agg = toolInput.aggregation as string;
      const trend = Array.from(grouped.entries()).map(([periodKey, values]) => {
        let value: number;
        switch (agg) {
          case 'sum': value = values.reduce((a, b) => a + b, 0); break;
          case 'avg': value = values.reduce((a, b) => a + b, 0) / values.length; break;
          case 'count': value = values.length; break;
          default: value = values.reduce((a, b) => a + b, 0);
        }
        return { period: periodKey, value, count: values.length };
      });

      return { trend, metric, aggregation: agg };
    }

    case 'compare_periods': {
      const periodDays: Record<string, number> = {
        'last7': 7, 'last30': 30, 'last60': 60, 'last90': 90,
        'last180': 180, 'lastyear': 365
      };
      const days1 = periodDays[(toolInput.period1 as string).toLowerCase()] || 30;
      const days2 = periodDays[(toolInput.period2 as string).toLowerCase()] || 60;

      const { data: period1Data } = await supabase
        .from('shipment_report_view')
        .select(toolInput.metric as string)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: period2Data } = await supabase
        .from('shipment_report_view')
        .select(toolInput.metric as string)
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', new Date(Date.now() - days2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lt('created_date', new Date(Date.now() - days1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const agg = toolInput.aggregation as string;
      const calcValue = (data: any[], field: string, agg: string) => {
        if (!data || data.length === 0) return 0;
        const values = data.map(r => parseFloat(r[field]) || 0).filter(v => !isNaN(v));
        if (values.length === 0) return 0;
        switch (agg) {
          case 'sum': return values.reduce((a, b) => a + b, 0);
          case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
          case 'count': return data.length;
          default: return values.reduce((a, b) => a + b, 0);
        }
      };

      const val1 = calcValue(period1Data || [], toolInput.metric as string, agg);
      const val2 = calcValue(period2Data || [], toolInput.metric as string, agg);
      const changePercent = val2 !== 0 ? ((val1 - val2) / val2) * 100 : 0;

      return {
        period1: { label: toolInput.period1, value: val1, count: period1Data?.length || 0 },
        period2: { label: toolInput.period2, value: val2, count: period2Data?.length || 0 },
        change: { absolute: val1 - val2, percent: changePercent }
      };
    }

    case 'detect_anomalies': {
      const metric = toolInput.metric as string;
      const groupBy = (toolInput.group_by as string) || 'carrier_name';

      const { data } = await supabase.rpc('preview_grouping', {
        p_customer_id: customerId,
        p_group_by: groupBy,
        p_metric: metric,
        p_aggregation: 'sum',
        p_limit: 50
      });

      if (!data || !data.results || data.results.length < 3) {
        return { anomalies: [], message: 'Not enough data for anomaly detection' };
      }

      const values = data.results.map((g: any) => g.value);
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length);
      const threshold = toolInput.sensitivity === 'high' ? 1.5 : toolInput.sensitivity === 'low' ? 3 : 2;

      const anomalies = data.results
        .filter((g: any) => Math.abs(g.value - mean) > threshold * stdDev)
        .map((g: any) => ({
          group: g.name,
          value: g.value,
          deviation: ((g.value - mean) / stdDev).toFixed(2),
          type: g.value > mean ? 'high' : 'low'
        }));

      return { anomalies, stats: { mean, stdDev, threshold }, group_by: groupBy };
    }

    case 'get_summary_stats': {
      const timeRange = (toolInput.time_range as string) || 'last90';
      const rangeDays: Record<string, number> = {
        'last30': 30, 'last60': 60, 'last90': 90, 'last180': 180, 'lastyear': 365, 'all': 9999
      };
      const days = rangeDays[timeRange.toLowerCase()] || 90;

      const dateFilter = days < 9999
        ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '1900-01-01';

      const { data: shipments } = await supabase
        .from('shipment_report_view')
        .select('retail, miles, carrier_name, created_date, total_weight')
        .eq('customer_id', parseInt(customerId, 10))
        .gte('created_date', dateFilter);

      if (!shipments || shipments.length === 0) {
        return { message: 'No shipments found', stats: {} };
      }

      const totalRetail = shipments.reduce((sum, s) => sum + (parseFloat(s.retail) || 0), 0);
      const totalMiles = shipments.reduce((sum, s) => sum + (parseFloat(s.miles) || 0), 0);
      const totalWeight = shipments.reduce((sum, s) => sum + (parseFloat(s.total_weight) || 0), 0);
      const carriers = new Set(shipments.map(s => s.carrier_name).filter(Boolean));
      const dates = shipments.map(s => s.created_date).filter(Boolean).sort();

      return {
        total_shipments: shipments.length,
        total_cost: totalRetail,
        total_miles: totalMiles,
        total_weight: totalWeight,
        avg_cost: totalRetail / shipments.length,
        avg_miles: totalMiles / shipments.length,
        cost_per_mile: totalMiles > 0 ? totalRetail / totalMiles : 0,
        unique_carriers: carriers.size,
        date_range: {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        }
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// =============================================================================
// SPECIALIZED ANALYSIS FUNCTIONS
// =============================================================================

async function executeBucketedAnalysis(
  supabase: SupabaseClient,
  customerId: string,
  params: {
    bucketField: string;
    metric: string;
    aggregation: string;
    derivedMetric: string;
    timeRange?: string;
  }
): Promise<unknown> {
  const { bucketField, metric, aggregation, derivedMetric, timeRange } = params;
  const bucketDefs = getDefaultBuckets(bucketField);

  // Build select fields based on derived metric needs
  let selectFields = `${bucketField}, ${metric}`;
  if (derivedMetric === 'cost_per_mile') {
    selectFields = `${bucketField}, ${metric}, miles`;
  } else if (derivedMetric === 'cost_per_pound') {
    selectFields = `${bucketField}, ${metric}, total_weight`;
  }

  // Build query with optional time filter
  let query = supabase
    .from('shipment_report_view')
    .select(selectFields)
    .eq('customer_id', parseInt(customerId, 10))
    .not(bucketField, 'is', null)
    .not(metric, 'is', null)
    .limit(10000);

  if (timeRange && timeRange !== 'all') {
    const rangeDays: Record<string, number> = {
      'last7': 7, 'last30': 30, 'last90': 90, 'last180': 180
    };
    const days = rangeDays[timeRange] || 90;
    query = query.gte('created_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Bucketed analysis error:', error);
    return { error: error.message, buckets: [] };
  }

  if (!data || data.length === 0) {
    return { buckets: [], message: 'No data found for bucketed analysis' };
  }

  // Bucket the data
  const bucketResults = bucketDefs.map(bucket => {
    const bucketData = data.filter(r => {
      const val = parseFloat(r[bucketField]) || 0;
      return val >= bucket.min && val < bucket.max;
    });

    const metricValues = bucketData.map(r => parseFloat(r[metric]) || 0);
    
    let value: number = 0;
    switch (aggregation) {
      case 'sum': value = metricValues.reduce((a, b) => a + b, 0); break;
      case 'avg': value = metricValues.length > 0 ? metricValues.reduce((a, b) => a + b, 0) / metricValues.length : 0; break;
      case 'count': value = bucketData.length; break;
      case 'min': value = metricValues.length > 0 ? Math.min(...metricValues) : 0; break;
      case 'max': value = metricValues.length > 0 ? Math.max(...metricValues) : 0; break;
    }

    // Calculate derived metric if requested
    let derivedValue: number | undefined;
    if (derivedMetric === 'cost_per_mile') {
      const totalMetric = metricValues.reduce((a, b) => a + b, 0);
      const totalMiles = bucketData.reduce((sum, r) => sum + (parseFloat(r.miles) || 0), 0);
      derivedValue = totalMiles > 0 ? totalMetric / totalMiles : 0;
    } else if (derivedMetric === 'cost_per_pound') {
      const totalMetric = metricValues.reduce((a, b) => a + b, 0);
      const totalWeight = bucketData.reduce((sum, r) => sum + (parseFloat(r.total_weight) || 0), 0);
      derivedValue = totalWeight > 0 ? totalMetric / totalWeight : 0;
    }

    return {
      label: bucket.label,
      value: Math.round(value * 100) / 100,
      count: bucketData.length,
      derived_value: derivedValue !== undefined ? Math.round(derivedValue * 100) / 100 : undefined
    };
  }).filter(b => b.count > 0);

  return {
    is_bucketed: true,
    buckets: bucketResults,
    bucket_field: bucketField,
    metric,
    aggregation,
    derived_metric: derivedMetric !== 'none' ? derivedMetric : undefined,
    total_records: data.length
  };
}

async function executeCategoricalAnalysis(
  supabase: SupabaseClient,
  customerId: string,
  params: {
    groupBy: string;
    metric: string;
    aggregation: string;
    derivedMetric: string;
    limit: number;
    timeRange?: string;
  }
): Promise<unknown> {
  const { groupBy, metric, aggregation, derivedMetric, limit, timeRange } = params;

  // Use the existing preview_grouping function for simple categorical grouping
  const { data, error } = await supabase.rpc('preview_grouping', {
    p_customer_id: customerId,
    p_group_by: groupBy,
    p_metric: metric,
    p_aggregation: aggregation,
    p_limit: limit
  });

  if (error) {
    console.error('Categorical analysis error:', error);
    return { error: error.message, results: [] };
  }

  // If derived metric requested, we need additional calculation
  if (derivedMetric && derivedMetric !== 'none' && data?.results) {
    // Need to fetch additional data for derived calculation
    const derivedConfig = DERIVED_METRICS[derivedMetric];
    if (derivedConfig) {
      // For now, return the basic results with a note about derived metrics
      return {
        is_bucketed: false,
        group_by: groupBy,
        metric,
        aggregation,
        results: data.results,
        total_groups: data.total_groups,
        derived_metric_note: `Derived metric ${derivedMetric} available for bucketed analysis`
      };
    }
  }

  return {
    is_bucketed: false,
    group_by: groupBy,
    metric,
    aggregation,
    results: data?.results || [],
    total_groups: data?.total_groups || 0
  };
}

// =============================================================================
// VISUALIZATION GENERATION
// =============================================================================

function generateVisualization(toolName: string, toolInput: Record<string, unknown>, result: unknown): Visualization | null {
  const id = crypto.randomUUID();

  // Handle unified analyze_metric tool
  if (toolName === 'analyze_metric' && result && typeof result === 'object') {
    const data = result as {
      is_bucketed?: boolean;
      buckets?: Array<{ label: string; value: number; count: number; derived_value?: number }>;
      results?: Array<{ name: string; value: number; count: number }>;
      metric?: string;
      group_by?: string;
      bucket_field?: string;
      derived_metric?: string;
    };

    if (data.is_bucketed && data.buckets && data.buckets.length > 0) {
      // Bucketed analysis → bar chart
      const metric = data.metric || toolInput.metric as string;
      const bucketField = data.bucket_field || toolInput.group_by as string;
      const derivedMetric = data.derived_metric;
      const useDerived = derivedMetric && data.buckets[0].derived_value !== undefined;

      const title = useDerived
        ? `${formatMetricName(derivedMetric!)} by ${formatMetricName(bucketField)} Bands`
        : `${formatMetricName(metric)} by ${formatMetricName(bucketField)} Bands`;

      return {
        id,
        type: 'bar',
        title,
        subtitle: `${data.buckets.length} bands`,
        data: {
          data: data.buckets.map(b => ({
            label: b.label,
            value: useDerived ? b.derived_value! : b.value,
            count: b.count
          })),
          format: determineFormat(useDerived ? derivedMetric! : metric)
        },
        config: { metric, bucketField, derivedMetric, is_bucketed: true }
      };
    } else if (data.results && data.results.length > 0) {
      // Categorical grouping → bar chart
      const metric = data.metric || toolInput.metric as string;
      const groupBy = data.group_by || toolInput.group_by as string;

      return {
        id,
        type: 'bar',
        title: `${formatMetricName(metric)} by ${formatMetricName(groupBy)}`,
        data: {
          data: data.results.slice(0, 10).map(g => ({
            label: g.name || 'Unknown',
            value: Math.round(g.value * 100) / 100
          })),
          format: determineFormat(metric)
        },
        config: { metric, groupBy, is_bucketed: false }
      };
    }
  }

  // Handle get_trend
  if (toolName === 'get_trend' && result && typeof result === 'object') {
    const data = result as { trend?: Array<{ period: string; value: number; count: number }>; metric?: string };
    if (data.trend && data.trend.length > 0) {
      const metric = (data.metric || toolInput.metric) as string;
      return {
        id,
        type: 'line',
        title: `${formatMetricName(metric)} Over Time`,
        data: {
          data: data.trend.map(t => ({
            label: t.period,
            value: Math.round(t.value * 100) / 100
          })),
          format: determineFormat(metric)
        },
        config: { metric, period: toolInput.period }
      };
    }
  }

  // Handle compare_periods
  if (toolName === 'compare_periods' && result && typeof result === 'object') {
    const data = result as {
      period1: { label: string; value: number; count: number };
      period2: { label: string; value: number; count: number };
      change: { absolute: number; percent: number };
    };
    const metric = toolInput.metric as string;
    const changePercent = Math.round(data.change.percent * 10) / 10;
    return {
      id,
      type: 'stat',
      title: formatMetricName(metric),
      data: {
        value: Math.round(data.period1.value * 100) / 100,
        format: determineFormat(metric),
        comparison: {
          value: changePercent,
          label: `vs ${data.period2.label}`,
          direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral'
        }
      },
      config: { metric }
    };
  }

  // Handle get_summary_stats
  if (toolName === 'get_summary_stats' && result && typeof result === 'object') {
    const data = result as { total_cost?: number; total_shipments?: number };
    if (data.total_cost !== undefined) {
      return {
        id,
        type: 'stat',
        title: 'Total Spend',
        data: {
          value: Math.round(data.total_cost * 100) / 100,
          format: 'currency'
        },
        config: {}
      };
    }
  }

  return null;
}

// =============================================================================
// QUESTION CLASSIFICATION
// =============================================================================

function classifyQuestion(question: string): { mode: 'quick' | 'deep' | 'visual'; confidence: number; reason: string } {
  const q = question.toLowerCase();

  const quickPatterns = [
    /^(how many|what('?s| is) the (total|count|number)|count of)/i,
    /^(what|who) (is|are) (the )?(top|best|worst|highest|lowest)/i,
    /simple|quick|fast|just tell me/i
  ];

  const visualPatterns = [
    /show me|visualize|chart|graph|plot|display|breakdown/i,
    /over time|trend|by (month|week|day|year)/i,
    /compare|vs|versus|distribution/i,
    /by (carrier|state|mode|mileage|distance|weight)/i,
    /bands|ranges|buckets|tiers/i
  ];

  const deepPatterns = [
    /why|how come|explain|analyze|investigate|dig into/i,
    /root cause|problem|issue|anomal/i,
    /understand|figure out|what('?s| is) (happening|going on|wrong)/i
  ];

  for (const pattern of quickPatterns) {
    if (pattern.test(q)) {
      return { mode: 'quick', confidence: 0.8, reason: 'Simple factual question' };
    }
  }

  for (const pattern of visualPatterns) {
    if (pattern.test(q)) {
      return { mode: 'visual', confidence: 0.85, reason: 'Visualization requested' };
    }
  }

  for (const pattern of deepPatterns) {
    if (pattern.test(q)) {
      return { mode: 'deep', confidence: 0.9, reason: 'Analytical investigation needed' };
    }
  }

  if (q.length > 100) {
    return { mode: 'deep', confidence: 0.7, reason: 'Complex question' };
  }

  return { mode: 'deep', confidence: 0.6, reason: 'Default to thorough analysis' };
}

// =============================================================================
// SYSTEM PROMPT LOADER
// =============================================================================

async function loadSystemPrompt(supabase: SupabaseClient): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_key', 'investigator_system_prompt')
      .maybeSingle();

    if (error) {
      console.warn('[Investigate] Failed to load custom system prompt:', error.message);
      return DEFAULT_SYSTEM_PROMPT;
    }

    return data?.setting_value || DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.warn('[Investigate] Error loading system prompt:', err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { question, customerId, userId, conversationHistory = [], preferences = {} } = body;

    if (!question || !customerId) {
      return new Response(
        JSON.stringify({ success: false, error: "question and customerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const systemPrompt = await loadSystemPrompt(supabase);

    const classification = classifyQuestion(question);
    const mode = preferences.forceMode || classification.mode;

    console.log(`[Investigate] Mode: ${mode}, Confidence: ${classification.confidence}, Reason: ${classification.reason}`);

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const reasoningSteps: ReasoningStep[] = [{
      type: 'routing',
      content: `Mode: ${mode} (${classification.reason})`
    }];
    let toolCallCount = 0;
    const visualizations: Visualization[] = [];

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
      { role: "user", content: question }
    ];

    const maxTurns = mode === 'quick' ? 3 : mode === 'visual' ? 5 : 8;
    let currentMessages = [...messages];
    let finalAnswer = "";

    for (let turn = 0; turn < maxTurns; turn++) {
      console.log(`[Investigate] Turn ${turn + 1}/${maxTurns}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: mode === 'quick' ? 2048 : 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools: INVESTIGATION_TOOLS,
        tool_choice: { type: "auto" }
      });

      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          reasoningSteps.push({
            type: 'thinking',
            content: block.text.slice(0, 500)
          });
        }
      }

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") {
          finalAnswer = textBlock.text;
        }
        break;
      }

      const toolUseBlocks = response.content.filter(c => c.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(c => c.type === "text");
        if (textBlock && textBlock.type === "text") {
          finalAnswer = textBlock.text;
        }
        break;
      }

      currentMessages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== "tool_use") continue;

        toolCallCount++;
        console.log(`[Investigate] Tool: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0, 200));

        reasoningSteps.push({
          type: 'tool_call',
          content: `Calling ${toolUse.name}`,
          toolName: toolUse.name
        });

        const result = await executeToolCall(
          supabase,
          customerId,
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        const viz = generateVisualization(toolUse.name, toolUse.input as Record<string, unknown>, result);
        if (viz) {
          visualizations.push(viz);
        }

        const resultSummary = JSON.stringify(result).slice(0, 400);
        reasoningSteps.push({
          type: 'tool_result',
          content: resultSummary,
          toolName: toolUse.name
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      currentMessages.push({ role: "user", content: toolResults });
    }

    // Extract follow-up questions
    const followUpQuestions: FollowUpQuestion[] = [];
    const followUpMatch = finalAnswer.match(/follow[- ]?up questions?:?\s*\n([\s\S]*?)(?:\n\n|$)/i);
    if (followUpMatch) {
      const lines = followUpMatch[1].split('\n').filter(l => l.trim());
      for (const line of lines.slice(0, 3)) {
        const cleaned = line.replace(/^[-\d.)\*]+\s*/, '').trim();
        if (cleaned.length > 10) {
          followUpQuestions.push({
            id: crypto.randomUUID(),
            question: cleaned
          });
        }
      }
    }

    if (followUpQuestions.length === 0) {
      const contextualFollowUps = [
        "How does this compare to previous periods?",
        "What's driving these numbers?",
        "Are there any outliers I should know about?"
      ];
      for (const q of contextualFollowUps) {
        followUpQuestions.push({ id: crypto.randomUUID(), question: q });
      }
    }

    const processingTimeMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        answer: finalAnswer,
        reasoning: preferences.showReasoning !== false ? reasoningSteps : [],
        followUpQuestions,
        visualizations,
        metadata: {
          processingTimeMs,
          toolCallCount,
          mode,
          classification: {
            detected: classification.mode,
            confidence: classification.confidence,
            reason: classification.reason
          },
          iterations: currentMessages.length - messages.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Investigate] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Investigation failed",
        answer: "I encountered an error during the investigation. Please try again.",
        reasoning: [],
        followUpQuestions: [],
        visualizations: [],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          toolCallCount: 0,
          mode: 'deep',
          iterations: 0
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

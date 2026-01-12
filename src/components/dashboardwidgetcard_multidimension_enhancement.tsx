/**
 * DASHBOARD WIDGET CARD MULTI-DIMENSION ENHANCEMENT
 * 
 * Add this logic to DashboardWidgetCard.tsx to handle rendering
 * of multi-dimension widgets created by the Visual Builder.
 * 
 * INTEGRATION: Add these changes to the existing DashboardWidgetCard.tsx
 */

// =============================================================================
// STEP 1: ADD IMPORTS (if not already present)
// =============================================================================

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// =============================================================================
// STEP 2: ADD TYPES
// =============================================================================

interface MultiDimensionData {
  primary_group: string;
  secondary_group: string;
  value: number;
  count: number;
}

interface GroupedChartData {
  primaryGroup: string;
  [secondaryGroup: string]: string | number;
}

// =============================================================================
// STEP 3: ADD COLOR PALETTE
// =============================================================================

const GROUPED_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// =============================================================================
// STEP 4: ADD MULTI-DIMENSION QUERY HANDLER
// Inside the fetchData function, add this check for multi-dimension widgets
// =============================================================================

/*
// Add this inside fetchData, after checking for isVisualBuilderWidget:

if (isVisualBuilderWidget && widget.dataSource?.isMultiDimension) {
  const { 
    groupByColumn, 
    secondaryGroupBy, 
    metricColumn, 
    aggregation, 
    aiConfig 
  } = widget.dataSource;

  console.log('[DashboardWidgetCard] Multi-dimension widget query:', {
    groupByColumn,
    secondaryGroupBy,
    metricColumn,
    aggregation,
  });

  // Build comma-separated group_by for the RPC
  const groupBy = `${groupByColumn},${secondaryGroupBy}`;
  
  // Build filters
  const queryFilters: Array<{ field: string; operator: string; value: string }> = [
    { field: 'pickup_date', operator: 'gte', value: dateRange.start },
    { field: 'pickup_date', operator: 'lte', value: dateRange.end },
  ];

  // Add product filters if present
  if (aiConfig?.searchTerms && aiConfig.searchTerms.length > 0) {
    for (const term of aiConfig.searchTerms) {
      queryFilters.push({
        field: 'description',
        operator: 'ilike',
        value: term
      });
    }
  }

  // Determine table
  const needsShipmentItem = groupByColumn === 'description' || 
                            (aiConfig?.searchTerms && aiConfig.searchTerms.length > 0);
  const tableName = needsShipmentItem ? 'shipment_item' : 'shipment';

  const { data: result, error: queryError } = await supabase.rpc('mcp_aggregate', {
    p_table_name: tableName,
    p_customer_id: customerId ? parseInt(customerId) : 0,
    p_is_admin: isAdmin(),
    p_group_by: groupBy,
    p_metric: metricColumn,
    p_aggregation: aggregation || 'avg',
    p_filters: queryFilters,
    p_limit: 200,
  });

  if (queryError) {
    console.error('[DashboardWidgetCard] Multi-dimension query error:', queryError);
    throw new Error(queryError.message);
  }

  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  
  if (parsed?.error) {
    throw new Error(parsed.error);
  }

  const rawData: MultiDimensionData[] = parsed?.data || [];
  
  // Transform to grouped format
  const secondaryGroups = [...new Set(rawData.map(d => d.secondary_group))].filter(Boolean).sort();
  const groupedMap = new Map<string, GroupedChartData>();
  
  for (const row of rawData) {
    if (!row.primary_group) continue;
    
    if (!groupedMap.has(row.primary_group)) {
      groupedMap.set(row.primary_group, { primaryGroup: row.primary_group });
    }
    
    const entry = groupedMap.get(row.primary_group)!;
    entry[row.secondary_group] = Math.round(row.value * 100) / 100;
  }

  const grouped = Array.from(groupedMap.values());

  console.log('[DashboardWidgetCard] Multi-dimension results:', grouped.length, 'groups');

  return { 
    data: grouped, 
    type: 'grouped_bar', 
    secondaryGroups,
    rawData 
  };
}
*/

// =============================================================================
// STEP 5: ADD GROUPED BAR CHART RENDERER
// Add this function and use it in the render logic
// =============================================================================

const renderGroupedBarChart = (
  data: GroupedChartData[],
  secondaryGroups: string[],
  metricColumn: string
) => {
  const formatValue = (val: number) => {
    if (metricColumn === 'retail' || metricColumn === 'cost') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis 
          dataKey="primaryGroup" 
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis 
          tick={{ fontSize: 10 }}
          tickFormatter={(val) => {
            if (metricColumn === 'retail' || metricColumn === 'cost') {
              if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
              return `$${val}`;
            }
            return val.toLocaleString();
          }}
          width={50}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [formatValue(value), name]}
          contentStyle={{ fontSize: 11 }}
        />
        <Legend 
          wrapperStyle={{ fontSize: 10, paddingTop: 5 }}
          iconSize={8}
        />
        {secondaryGroups.map((group, index) => (
          <Bar 
            key={group}
            dataKey={group}
            name={group}
            fill={GROUPED_COLORS[index % GROUPED_COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// =============================================================================
// STEP 6: UPDATE THE RENDER SWITCH
// In the component's render section where you switch on chart type:
// =============================================================================

/*
// Add this case in your chart type switch:

case 'grouped_bar':
  if (widgetResult.secondaryGroups && widgetResult.secondaryGroups.length > 0) {
    return renderGroupedBarChart(
      widgetResult.data as GroupedChartData[],
      widgetResult.secondaryGroups,
      widget.dataSource?.metricColumn || 'retail'
    );
  }
  // Fallback to regular bar if no secondary groups
  return renderBarChart(widgetResult.data);
*/

// =============================================================================
// STEP 7: WIDGET DATA SOURCE TYPE UPDATE
// Make sure your widget types include these fields:
// =============================================================================

/*
interface WidgetDataSource {
  // ... existing fields ...
  secondaryGroupBy?: string;
  isMultiDimension?: boolean;
}

interface WidgetResult {
  data: any[];
  type: 'chart' | 'table' | 'kpi' | 'grouped_bar';
  secondaryGroups?: string[];
  rawData?: any[];
}
*/

// =============================================================================
// FULL INTEGRATION EXAMPLE
// =============================================================================

/*
Here's how the complete flow works:

1. User creates widget: "average cost by product by origin state"

2. Visual Builder detects multi-dimension, saves widget with:
   {
     dataSource: {
       groupByColumn: 'description',
       secondaryGroupBy: 'origin_state',
       metricColumn: 'cost',
       aggregation: 'avg',
       isMultiDimension: true
     }
   }

3. DashboardWidgetCard loads widget, detects isMultiDimension

4. Calls mcp_aggregate with p_group_by: 'description,origin_state'

5. Gets back data like:
   [
     { primary_group: "Drawer", secondary_group: "CA", value: 245 },
     { primary_group: "Drawer", secondary_group: "TX", value: 198 },
     { primary_group: "CargoGlide", secondary_group: "CA", value: 312 },
     ...
   ]

6. Transforms to grouped format:
   [
     { primaryGroup: "Drawer", CA: 245, TX: 198 },
     { primaryGroup: "CargoGlide", CA: 312, TX: 287 },
   ]

7. Renders grouped bar chart with:
   - X-axis: primaryGroup (Drawer, CargoGlide, ...)
   - Multiple bars per group: CA (blue), TX (green), ...
   - Legend showing state colors
*/

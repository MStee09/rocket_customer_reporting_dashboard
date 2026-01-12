/**
 * VISUAL BUILDER MULTI-DIMENSION ENHANCEMENT
 * 
 * This file contains the functions and logic to add to VisualBuilderV5Working.tsx
 * to support multi-dimension queries like "average cost by product BY origin state"
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add the new types at the top of the file
 * 2. Add the helper functions after existing helpers
 * 3. Update the AI prompt handler to detect multi-dimension queries
 * 4. Add the grouped bar chart renderer
 */

// =============================================================================
// STEP 1: NEW TYPES (add near top of file with other types)
// =============================================================================

interface MultiDimensionData {
  primary_group: string;
  secondary_group: string;
  value: number;
  count: number;
}

interface GroupedChartData {
  primaryGroup: string;
  [secondaryGroup: string]: string | number; // Dynamic keys for each secondary group
}

interface MultiDimensionConfig {
  primaryGroupBy: string;      // e.g., 'description'
  secondaryGroupBy: string;    // e.g., 'origin_state'
  metric: string;              // e.g., 'retail'
  aggregation: string;         // e.g., 'avg'
  isMultiDimension: true;
}

// =============================================================================
// STEP 2: DETECTION FUNCTION (add after extractProductTerms)
// =============================================================================

/**
 * Detect if a prompt is asking for multi-dimension analysis
 * Returns null if not multi-dimension, or the parsed config if it is
 */
const detectMultiDimensionQuery = (prompt: string): MultiDimensionConfig | null => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Patterns that indicate multi-dimension queries
  // "X by Y by Z" or "X per Y by Z" or "X for each Y grouped by Z"
  const patterns = [
    // "average cost by product by state"
    /(?:average|avg|total|sum|count)\s+(\w+)\s+(?:by|per|for)\s+(\w+)\s+(?:by|per|grouped by|for each)\s+(\w+)/i,
    // "cost per product category by origin"
    /(\w+)\s+(?:per|by|for)\s+(\w+)\s+(?:category\s+)?(?:by|per|grouped by)\s+(\w+)/i,
    // "breakdown of cost by product and state"
    /breakdown\s+of\s+(\w+)\s+by\s+(\w+)\s+(?:and|&)\s+(\w+)/i,
    // "product cost grouped by origin location"
    /(\w+)\s+(\w+)\s+grouped\s+by\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = lowerPrompt.match(pattern);
    if (match) {
      const [, metric, primaryDim, secondaryDim] = match;
      
      // Map common terms to actual column names
      const columnMap: Record<string, string> = {
        'product': 'description',
        'products': 'description',
        'item': 'description',
        'items': 'description',
        'description': 'description',
        'state': 'origin_state',
        'origin': 'origin_state',
        'destination': 'destination_state',
        'dest': 'destination_state',
        'carrier': 'carrier_name',
        'mode': 'mode_id',
        'location': 'origin_state',
        'month': 'pickup_month',
        'week': 'pickup_week',
      };

      const metricMap: Record<string, string> = {
        'cost': 'cost',
        'costs': 'cost',
        'price': 'retail',
        'prices': 'retail',
        'retail': 'retail',
        'revenue': 'retail',
        'weight': 'total_weight',
        'miles': 'miles',
        'shipments': 'load_id',
        'count': 'load_id',
      };

      const resolvedPrimary = columnMap[primaryDim] || primaryDim;
      const resolvedSecondary = columnMap[secondaryDim] || secondaryDim;
      const resolvedMetric = metricMap[metric] || 'retail';

      // Determine aggregation based on metric
      let aggregation = 'avg';
      if (lowerPrompt.includes('total') || lowerPrompt.includes('sum')) {
        aggregation = 'sum';
      } else if (lowerPrompt.includes('count') || resolvedMetric === 'load_id') {
        aggregation = 'count';
      }

      console.log('[VisualBuilder] Detected multi-dimension query:', {
        metric: resolvedMetric,
        primaryGroupBy: resolvedPrimary,
        secondaryGroupBy: resolvedSecondary,
        aggregation
      });

      return {
        primaryGroupBy: resolvedPrimary,
        secondaryGroupBy: resolvedSecondary,
        metric: resolvedMetric,
        aggregation,
        isMultiDimension: true
      };
    }
  }

  // Also check for explicit "by X by Y" patterns
  const byByMatch = lowerPrompt.match(/by\s+(\w+)\s+(?:and|by)\s+(\w+)/i);
  if (byByMatch) {
    // This is a secondary indicator - need more context
    console.log('[VisualBuilder] Found "by X by Y" pattern but needs more context');
  }

  return null;
};

// =============================================================================
// STEP 3: MULTI-DIMENSION QUERY FUNCTION (add after queryProductCategories)
// =============================================================================

/**
 * Execute a multi-dimension aggregate query
 * Returns data structured for grouped bar charts
 */
const queryMultiDimension = async (
  config: MultiDimensionConfig,
  customerId: number | null,
  dateFilter?: { start: string; end: string },
  productFilters?: string[]
): Promise<{ raw: MultiDimensionData[]; grouped: GroupedChartData[]; secondaryGroups: string[] }> => {
  console.log('[VisualBuilder] Multi-dimension query:', config);

  // Build filters
  const filters: Array<{ field: string; operator: string; value: string }> = [];
  
  if (dateFilter?.start && dateFilter?.end) {
    filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
    filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
  }

  // Add product filters if specified
  if (productFilters && productFilters.length > 0) {
    // For multiple products, we'll query each and combine
    // Or use OR logic if the DB supports it
    productFilters.forEach(term => {
      filters.push({ field: 'description', operator: 'ilike', value: term });
    });
  }

  // Determine the base table
  const needsShipmentItem = config.primaryGroupBy === 'description' || 
                            productFilters && productFilters.length > 0;
  const tableName = needsShipmentItem ? 'shipment_item' : 'shipment';

  // Build comma-separated group_by
  const groupBy = `${config.primaryGroupBy},${config.secondaryGroupBy}`;

  try {
    const { data, error } = await supabase.rpc('mcp_aggregate', {
      p_table_name: tableName,
      p_customer_id: customerId || 0,
      p_is_admin: customerId === null || customerId === 0,
      p_group_by: groupBy,
      p_metric: config.metric,
      p_aggregation: config.aggregation,
      p_filters: filters,
      p_limit: 200  // Higher limit for multi-dimension
    });

    if (error) {
      console.error('[VisualBuilder] Multi-dimension RPC error:', error);
      throw error;
    }

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (parsed?.error) {
      console.error('[VisualBuilder] Multi-dimension query error:', parsed.error);
      throw new Error(parsed.error);
    }

    const rawData: MultiDimensionData[] = parsed?.data || [];
    console.log('[VisualBuilder] Multi-dimension raw results:', rawData.length, 'rows');

    // Transform to grouped chart format
    const { grouped, secondaryGroups } = transformToGroupedData(rawData);

    return { raw: rawData, grouped, secondaryGroups };
  } catch (err) {
    console.error('[VisualBuilder] Multi-dimension query exception:', err);
    throw err;
  }
};

/**
 * Transform multi-dimension data into format suitable for grouped bar chart
 * Input:  [{ primary_group: "Drawer", secondary_group: "CA", value: 245 }, ...]
 * Output: [{ primaryGroup: "Drawer", CA: 245, TX: 198, ... }, ...]
 */
const transformToGroupedData = (
  data: MultiDimensionData[]
): { grouped: GroupedChartData[]; secondaryGroups: string[] } => {
  // Get unique secondary groups (for chart legend/bars)
  const secondaryGroups = [...new Set(data.map(d => d.secondary_group))].filter(Boolean).sort();
  
  // Group by primary dimension
  const groupedMap = new Map<string, GroupedChartData>();
  
  for (const row of data) {
    if (!row.primary_group) continue;
    
    if (!groupedMap.has(row.primary_group)) {
      groupedMap.set(row.primary_group, { 
        primaryGroup: row.primary_group 
      });
    }
    
    const entry = groupedMap.get(row.primary_group)!;
    entry[row.secondary_group] = Math.round(row.value * 100) / 100;
  }

  const grouped = Array.from(groupedMap.values());
  console.log('[VisualBuilder] Transformed grouped data:', grouped.length, 'primary groups,', secondaryGroups.length, 'secondary groups');

  return { grouped, secondaryGroups };
};

// =============================================================================
// STEP 4: GROUPED BAR CHART COMPONENT (add in render section)
// =============================================================================

// Color palette for secondary groups
const GROUPED_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

/**
 * Render a grouped bar chart for multi-dimension data
 * Used in the PreviewPanel section
 */
const renderGroupedBarChart = (
  data: GroupedChartData[],
  secondaryGroups: string[],
  config: { metric: string; aggregation: string }
) => {
  const formatValue = (val: number) => {
    if (config.metric === 'retail' || config.metric === 'cost') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis 
          dataKey="primaryGroup" 
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => {
            if (config.metric === 'retail' || config.metric === 'cost') {
              return `$${(val / 1000).toFixed(0)}k`;
            }
            return val.toLocaleString();
          }}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [formatValue(value), name]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: 20 }}
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
// STEP 5: UPDATE handleAISubmit TO DETECT MULTI-DIMENSION
// =============================================================================

// Add this check near the beginning of handleAISubmit, after the product terms check:

/*
  // STEP 1.5: Check if this is a multi-dimension query
  const multiDimConfig = detectMultiDimensionQuery(aiPrompt);
  
  if (multiDimConfig) {
    console.log('[VisualBuilder] Multi-dimension query detected:', multiDimConfig);
    setAiReasoning([
      { type: 'routing', content: `Multi-dimension analysis: ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}` },
      { type: 'thinking', content: 'Using grouped aggregation for dual-dimension breakdown' }
    ]);

    try {
      const queryCustomerId = targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId);
      
      // Check if we also have product filters
      const productTerms = extractProductTerms(aiPrompt);
      
      const { raw, grouped, secondaryGroups } = await queryMultiDimension(
        multiDimConfig,
        queryCustomerId,
        dateRange,
        productTerms.length > 0 ? productTerms : undefined
      );

      if (grouped.length > 0) {
        setConfig(prev => ({
          ...prev,
          name: `${multiDimConfig.aggregation.toUpperCase()} ${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
          description: `Shows ${multiDimConfig.aggregation} ${multiDimConfig.metric} broken down by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
          chartType: 'grouped_bar',  // New chart type!
          groupByColumn: multiDimConfig.primaryGroupBy,
          secondaryGroupBy: multiDimConfig.secondaryGroupBy,
          metricColumn: multiDimConfig.metric,
          aggregation: multiDimConfig.aggregation,
          data: grouped,
          rawMultiDimData: raw,
          secondaryGroups: secondaryGroups,
          isMultiDimension: true,
          aiConfig: {
            title: `${multiDimConfig.metric} by ${multiDimConfig.primaryGroupBy} and ${multiDimConfig.secondaryGroupBy}`,
            xAxis: multiDimConfig.primaryGroupBy,
            yAxis: multiDimConfig.metric,
            aggregation: multiDimConfig.aggregation.toUpperCase(),
            filters: [],
            searchTerms: productTerms
          }
        }));
        
        setHasResults(true);
        setAiReasoning(prev => [...prev, 
          { type: 'tool_result', content: `Found ${grouped.length} primary groups × ${secondaryGroups.length} secondary groups` }
        ]);
        setAiLoading(false);
        return;
      }
    } catch (err) {
      console.error('[VisualBuilder] Multi-dimension query failed:', err);
      setAiError(`Multi-dimension query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAiLoading(false);
      return;
    }
  }
*/

// =============================================================================
// STEP 6: UPDATE CHART RENDERING TO HANDLE GROUPED BARS
// =============================================================================

// In the renderChart function or preview panel, add a case for grouped_bar:

/*
  // Inside the chart rendering logic:
  if (config.chartType === 'grouped_bar' && config.isMultiDimension) {
    return renderGroupedBarChart(
      config.data as GroupedChartData[],
      config.secondaryGroups as string[],
      { metric: config.metricColumn, aggregation: config.aggregation }
    );
  }
*/

// =============================================================================
// STEP 7: UPDATE THE CONFIG TYPE (in types section)
// =============================================================================

// Add these fields to your WidgetConfig interface:
/*
  interface WidgetConfig {
    // ... existing fields ...
    secondaryGroupBy?: string;
    secondaryGroups?: string[];
    rawMultiDimData?: MultiDimensionData[];
    isMultiDimension?: boolean;
  }
*/

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
Prompts that will now work:
- "average cost by product by state"
- "total retail per description by origin"
- "breakdown of cost by item and destination state"
- "show me revenue by product category by carrier"
- "average cost by drawer system, cargoglide by origin location"

The result will be a grouped bar chart where:
- X-axis: Primary group (e.g., product names)
- Bars: Secondary group (e.g., states)
- Y-axis: Aggregated metric value
- Legend: Shows each secondary group with its color
*/

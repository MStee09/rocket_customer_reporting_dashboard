import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import type { MultiDimensionData, GroupedChartData } from '../types/visualBuilderTypes';
import type { MultiDimensionConfig } from './visualBuilderUtils';

export async function queryProductCategories(
  terms: string[],
  metric: string,
  aggregation: string,
  customerId: number | null,
  dateFilter?: { start: string; end: string }
): Promise<Array<{ label: string; value: number }>> {
  const results: Array<{ label: string; value: number }> = [];

  logger.log('[VisualBuilder] Product query - terms:', terms, 'metric:', metric, 'dateFilter:', dateFilter);

  for (const term of terms) {
    try {
      const filters: Array<{ field: string; operator: string; value: string }> = [
        { field: 'description', operator: 'ilike', value: term }
      ];

      if (dateFilter?.start && dateFilter?.end) {
        filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
        filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
      }

      logger.log(`[VisualBuilder] Querying "${term}" with filters:`, filters);

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: 'shipment_item',
        p_customer_id: customerId || 0,
        p_is_admin: customerId === null || customerId === 0,
        p_group_by: 'description',
        p_metric: metric,
        p_aggregation: aggregation,
        p_filters: filters,
        p_limit: 100
      });

      if (error) {
        console.error(`[VisualBuilder] RPC error for "${term}":`, error);
        continue;
      }

      let parsed = typeof data === 'string' ? JSON.parse(data) : data;
      logger.log(`[VisualBuilder] Raw result for "${term}":`, parsed);

      if (parsed?.error) {
        console.error(`[VisualBuilder] Query error for "${term}":`, parsed.error);
        continue;
      }

      const rows = parsed?.data || [];
      logger.log(`[VisualBuilder] Rows for "${term}":`, rows.length, rows);

      if (rows.length > 0) {
        let totalValue = 0;
        let count = 0;
        for (const row of rows) {
          if (row.value !== null && row.value !== undefined) {
            totalValue += Number(row.value);
            count++;
          }
        }

        if (count > 0) {
          const finalValue = aggregation === 'avg' ? totalValue / count : totalValue;
          results.push({
            label: term,
            value: Math.round(finalValue * 100) / 100
          });
          logger.log(`[VisualBuilder] ✓ ${term}: ${finalValue.toFixed(2)}`);
        }
      } else {
        logger.log(`[VisualBuilder] No data for "${term}"`);
      }
    } catch (err) {
      console.error(`[VisualBuilder] Exception for "${term}":`, err);
    }
  }

  logger.log('[VisualBuilder] Final results:', results);
  return results;
}

export async function queryMultiDimension(
  config: MultiDimensionConfig,
  customerId: number | null,
  dateFilter?: { start: string; end: string },
  productFilters?: string[]
): Promise<{ raw: MultiDimensionData[]; grouped: GroupedChartData[]; secondaryGroups: string[] }> {
  logger.log('[VisualBuilder] Multi-dimension query:', config);

  const needsShipmentItem = config.primaryGroupBy === 'description' ||
                            (productFilters && productFilters.length > 0);
  const tableName = needsShipmentItem ? 'shipment_item' : 'shipment';

  if (productFilters && productFilters.length > 0 && config.primaryGroupBy === 'description') {
    logger.log('[VisualBuilder] Product category query - aggregating by category');

    const categoryData = new Map<string, Map<string, { total: number; count: number }>>();
    const allSecondaryGroups = new Set<string>();
    const allRawData: MultiDimensionData[] = [];

    for (const term of productFilters) {
      const filters: Array<{ field: string; operator: string; value: string }> = [];

      if (dateFilter?.start && dateFilter?.end) {
        filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
        filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
      }

      filters.push({ field: 'description', operator: 'ilike', value: term });

      logger.log(`[VisualBuilder] Querying multi-dim for category "${term}"`);

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: customerId || 0,
        p_is_admin: customerId === null || customerId === 0,
        p_group_by: `description,${config.secondaryGroupBy}`,
        p_metric: config.metric,
        p_aggregation: config.aggregation,
        p_filters: filters,
        p_limit: 100
      });

      if (error) {
        console.error(`[VisualBuilder] Multi-dimension RPC error for "${term}":`, error);
        continue;
      }

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      if (parsed?.error) {
        console.error(`[VisualBuilder] Multi-dimension query error for "${term}":`, parsed.error);
        continue;
      }

      const rows = parsed?.data || [];
      logger.log(`[VisualBuilder] Results for "${term}":`, rows.length, 'rows');

      if (!categoryData.has(term)) {
        categoryData.set(term, new Map());
      }
      const categoryStates = categoryData.get(term)!;

      for (const row of rows) {
        const state = row.secondary_group || 'Unknown';
        allSecondaryGroups.add(state);

        if (!categoryStates.has(state)) {
          categoryStates.set(state, { total: 0, count: 0 });
        }

        const stateData = categoryStates.get(state)!;
        if (config.aggregation === 'avg') {
          stateData.total += row.value * row.count;
          stateData.count += row.count;
        } else if (config.aggregation === 'sum') {
          stateData.total += row.value;
          stateData.count += row.count;
        } else if (config.aggregation === 'count') {
          stateData.total += row.count;
          stateData.count += 1;
        } else {
          stateData.total += row.value;
          stateData.count += 1;
        }

        allRawData.push({
          primary_group: term,
          secondary_group: state,
          value: row.value,
          count: row.count
        });
      }
    }

    const secondaryGroups = Array.from(allSecondaryGroups).sort();
    const grouped: GroupedChartData[] = [];

    for (const [category, stateMap] of categoryData) {
      const entry: GroupedChartData = { primaryGroup: category };

      for (const [state, data] of stateMap) {
        let value: number;
        if (config.aggregation === 'avg') {
          value = data.count > 0 ? data.total / data.count : 0;
        } else {
          value = data.total;
        }
        entry[state] = Math.round(value * 100) / 100;
      }

      grouped.push(entry);
    }

    logger.log('[VisualBuilder] Category aggregation complete:', grouped.length, 'categories,', secondaryGroups.length, 'states');
    logger.log('[VisualBuilder] Grouped data:', grouped);

    return { raw: allRawData, grouped, secondaryGroups };
  }

  const filters: Array<{ field: string; operator: string; value: string }> = [];

  if (dateFilter?.start && dateFilter?.end) {
    filters.push({ field: 'pickup_date', operator: 'gte', value: dateFilter.start });
    filters.push({ field: 'pickup_date', operator: 'lte', value: dateFilter.end });
  }

  const groupBy = `${config.primaryGroupBy},${config.secondaryGroupBy}`;

  const { data, error } = await supabase.rpc('mcp_aggregate', {
    p_table_name: tableName,
    p_customer_id: customerId || 0,
    p_is_admin: customerId === null || customerId === 0,
    p_group_by: groupBy,
    p_metric: config.metric,
    p_aggregation: config.aggregation,
    p_filters: filters,
    p_limit: 200
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
  logger.log('[VisualBuilder] Multi-dimension raw results:', rawData.length, 'rows');

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
  logger.log('[VisualBuilder] Transformed:', grouped.length, 'primary groups,', secondaryGroups.length, 'secondary groups');

  return { raw: rawData, grouped, secondaryGroups };
}

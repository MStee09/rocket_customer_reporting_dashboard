import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { WidgetQueryConfig } from '../types/BuilderSchemaV3';

export interface DateRange {
  start: string;
  end: string;
}

export interface QueryExecutionContext {
  customerId?: number;
  dateRange?: DateRange;
  isAdmin?: boolean;
}

export interface QueryResult {
  success: boolean;
  data: any[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export function useWidgetQuery() {
  const { isAdmin, effectiveCustomerId } = useAuth();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    config: WidgetQueryConfig,
    context?: QueryExecutionContext
  ): Promise<QueryResult> => {
    setIsExecuting(true);
    setError(null);
    const startTime = Date.now();

    try {
      const filters = buildFilters(config.filters || [], context?.dateRange);
      const adminMode = context?.isAdmin ?? isAdmin();
      const customerId = adminMode ? 0 : (context?.customerId ?? effectiveCustomerId ?? 0);

      let data: any;
      let queryError: any;

      if (config.joins && config.joins.length > 0) {
        const response = await supabase.rpc('mcp_query_with_join', {
          p_base_table: config.baseTable,
          p_customer_id: customerId,
          p_is_admin: adminMode,
          p_joins: config.joins.map(j => ({ table: j.table, type: j.type || 'left' })),
          p_select: config.select || ['*'],
          p_filters: filters,
          p_group_by: config.groupBy || null,
          p_aggregations: config.aggregations || null,
          p_order_by: config.orderBy || null,
          p_limit: config.limit || 1000,
        });
        data = response.data;
        queryError = response.error;
      } else if (config.aggregations && config.aggregations.length > 0 && config.groupBy && config.groupBy.length > 0) {
        const agg = config.aggregations[0];
        const response = await supabase.rpc('mcp_aggregate', {
          p_table_name: config.baseTable,
          p_customer_id: customerId,
          p_is_admin: adminMode,
          p_group_by: config.groupBy[0],
          p_metric: agg.field,
          p_aggregation: agg.function,
          p_filters: filters,
          p_limit: config.limit || 100,
        });
        data = response.data;
        queryError = response.error;
      } else {
        const response = await supabase.rpc('mcp_query_table', {
          p_table_name: config.baseTable,
          p_customer_id: customerId,
          p_is_admin: adminMode,
          p_select: config.select || ['*'],
          p_filters: filters,
          p_group_by: config.groupBy || null,
          p_aggregations: config.aggregations || null,
          p_order_by: config.orderBy || null,
          p_order_dir: config.orderDir || 'desc',
          p_limit: config.limit || 1000,
        });
        data = response.data;
        queryError = response.error;
      }

      if (queryError) throw new Error(queryError.message);

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows = parsed?.data || parsed || [];

      const queryResult: QueryResult = {
        success: true,
        data: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        executionTimeMs: Date.now() - startTime,
      };

      setResult(queryResult);
      return queryResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      setError(errorMessage);

      const errorResult: QueryResult = {
        success: false,
        data: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: errorMessage,
      };

      setResult(errorResult);
      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, [isAdmin, effectiveCustomerId]);

  return { isExecuting, result, error, execute };
}

function buildFilters(
  configFilters: Array<{ field: string; operator: string; value: any; useDateRange?: boolean }>,
  dateRange?: DateRange
): Array<{ field: string; operator: string; value: any }> {
  const filters: Array<{ field: string; operator: string; value: any }> = [];

  for (const filter of configFilters) {
    if (filter.useDateRange) continue;
    filters.push({ field: filter.field, operator: filter.operator, value: filter.value });
  }

  if (dateRange) {
    filters.push({ field: 'pickup_date', operator: 'gte', value: dateRange.start });
    filters.push({ field: 'pickup_date', operator: 'lte', value: dateRange.end });
  }

  return filters;
}

export async function executeWidgetQuery(config: WidgetQueryConfig, context: QueryExecutionContext): Promise<QueryResult> {
  const startTime = Date.now();
  try {
    const filters = buildFilters(config.filters || [], context.dateRange);
    const customerId = context.isAdmin ? 0 : (context.customerId ?? 0);

    let data: any;
    let error: any;

    if (config.joins && config.joins.length > 0) {
      const response = await supabase.rpc('mcp_query_with_join', {
        p_base_table: config.baseTable,
        p_customer_id: customerId,
        p_is_admin: context.isAdmin ?? false,
        p_joins: config.joins,
        p_select: config.select || ['*'],
        p_filters: filters,
        p_group_by: config.groupBy || null,
        p_aggregations: config.aggregations || null,
        p_order_by: config.orderBy || null,
        p_limit: config.limit || 1000,
      });
      data = response.data;
      error = response.error;
    } else {
      const response = await supabase.rpc('mcp_query_table', {
        p_table_name: config.baseTable,
        p_customer_id: customerId,
        p_is_admin: context.isAdmin ?? false,
        p_select: config.select || ['*'],
        p_filters: filters,
        p_group_by: config.groupBy || null,
        p_aggregations: config.aggregations || null,
        p_order_by: config.orderBy || null,
        p_order_dir: config.orderDir || 'desc',
        p_limit: config.limit || 1000,
      });
      data = response.data;
      error = response.error;
    }

    if (error) throw new Error(error.message);

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const rows = parsed?.data || parsed || [];

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [rows],
      rowCount: Array.isArray(rows) ? rows.length : 1,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success: false,
      data: [],
      rowCount: 0,
      executionTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Query failed',
    };
  }
}

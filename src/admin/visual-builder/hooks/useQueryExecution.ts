import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { queryProductCategories } from '../utils/visualBuilderQueries';
import { ADMIN_ONLY_COLUMNS } from '../config/columnDefinitions';
import { WidgetConfig, EditableFilter, ColumnDefinition } from '../types/visualBuilderTypes';

interface AggregateRow {
  label?: string;
  value?: number;
  [key: string]: string | number | undefined;
}

type TargetScope = 'admin' | 'customer';

interface UseQueryExecutionParams {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  targetScope: TargetScope;
  targetCustomerId: number | null;
  effectiveCustomerId: number | null;
  canSeeAdminColumns: boolean;
  dateRange: { start: string; end: string };
  editableFilters: EditableFilter[];
  availableColumns: ColumnDefinition[];
  setHasResults: (value: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isProductQuery: boolean;
  setIsProductQuery: (value: boolean) => void;
}

export function useQueryExecution({
  config,
  setConfig,
  targetScope,
  targetCustomerId,
  effectiveCustomerId,
  canSeeAdminColumns,
  dateRange,
  editableFilters,
  availableColumns,
  setHasResults,
  showToast,
  isProductQuery,
  setIsProductQuery,
}: UseQueryExecutionParams) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!config.data || config.data.length === 0) return;

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const filterTerms = editableFilters
        .filter(f => f.field === 'item_description' && f.value.trim())
        .map(f => f.value.trim());

      const shouldUseProductQuery =
        (config.groupByColumn === 'item_description' && filterTerms.length > 0) ||
        (isProductQuery && filterTerms.length > 0 && config.groupByColumn === 'item_description');

      if (shouldUseProductQuery) {
        logger.log('[VisualBuilder] Refreshing product query with terms:', filterTerms);

        const results = await queryProductCategories(
          filterTerms,
          config.metricColumn || (canSeeAdminColumns ? 'cost' : 'retail'),
          config.aggregation || 'avg',
          targetScope === 'admin' ? null : (targetCustomerId || effectiveCustomerId),
          dateRange
        );

        setConfig(prev => ({
          ...prev,
          data: results,
          aiConfig: prev.aiConfig ? {
            ...prev.aiConfig,
            searchTerms: filterTerms,
          } : undefined,
        }));

        showToast(`Updated: ${results.length} categories`, 'success');
      } else if (config.groupByColumn && config.metricColumn) {
        logger.log('[VisualBuilder] Refreshing regular query:', config.groupByColumn, config.metricColumn);
        setIsProductQuery(false);

        const queryFilters = [
          { field: 'pickup_date', operator: 'gte', value: dateRange.start },
          { field: 'pickup_date', operator: 'lte', value: dateRange.end },
          ...editableFilters.filter(f => f.value.trim()).map(f => ({
            field: f.field,
            operator: f.operator === 'contains' ? 'ilike' : f.operator,
            value: f.operator === 'contains' ? `%${f.value}%` : f.value,
          })),
        ];

        const { data, error } = await supabase.rpc('mcp_aggregate', {
          p_table_name: 'shipment',
          p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
          p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
          p_group_by: config.groupByColumn,
          p_metric: config.metricColumn,
          p_aggregation: config.aggregation,
          p_filters: queryFilters,
          p_limit: 20,
        });

        if (error) throw error;

        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const rows: AggregateRow[] = parsed?.data || parsed || [];

        const chartData = rows.map((row: AggregateRow) => ({
          label: String(row.label || 'Unknown'),
          value: Number(row.value || 0),
        }));

        setConfig(prev => ({ ...prev, data: chartData }));
        showToast(`Updated: ${chartData.length} data points`, 'success');
      } else {
        showToast('Select both X and Y axis to refresh', 'info');
      }
    } catch (err) {
      console.error('[VisualBuilder] Refresh error:', err);
      setPreviewError(err instanceof Error ? err.message : 'Refresh failed');
      showToast('Refresh failed', 'error');
    } finally {
      setPreviewLoading(false);
    }
  }, [
    config.data,
    config.groupByColumn,
    config.metricColumn,
    config.aggregation,
    config.aiConfig,
    isProductQuery,
    editableFilters,
    canSeeAdminColumns,
    targetScope,
    targetCustomerId,
    effectiveCustomerId,
    dateRange,
    showToast,
    setConfig,
    setIsProductQuery,
  ]);

  const runManualQuery = useCallback(async () => {
    if (!config.groupByColumn || !config.metricColumn) {
      setPreviewError('Select both Group By and Metric columns');
      return;
    }

    if (!canSeeAdminColumns) {
      if (ADMIN_ONLY_COLUMNS.has(config.metricColumn) || ADMIN_ONLY_COLUMNS.has(config.groupByColumn)) {
        setPreviewError('Access denied: You do not have permission to view this data');
        return;
      }
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const groupCol = availableColumns.find(c => c.id === config.groupByColumn);
      const metricCol = availableColumns.find(c => c.id === config.metricColumn);

      if (!groupCol || !metricCol) {
        throw new Error('Invalid column selection');
      }

      const isProductQueryLocal = config.groupByColumn === 'item_description' || config.groupByColumn === 'description';
      const tableName = isProductQueryLocal ? 'shipment_item' : 'shipment';
      const groupByField = isProductQueryLocal ? 'description' : config.groupByColumn;

      const queryFilters = [
        { field: 'pickup_date', operator: 'gte', value: dateRange.start },
        { field: 'pickup_date', operator: 'lte', value: dateRange.end },
        ...editableFilters.filter(f => f.value.trim()).map(f => ({
          field: f.field === 'item_description' ? 'description' : f.field,
          operator: f.operator === 'contains' ? 'ilike' : f.operator,
          value: f.operator === 'contains' ? `%${f.value}%` : f.value,
        })),
      ];

      logger.log('[VisualBuilder] Manual query - table:', tableName, 'groupBy:', groupByField, 'metric:', config.metricColumn);

      const { data, error } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: targetScope === 'admin' ? 0 : (targetCustomerId || effectiveCustomerId || 0),
        p_is_admin: targetScope === 'admin' && canSeeAdminColumns,
        p_group_by: groupByField,
        p_metric: config.metricColumn,
        p_aggregation: config.aggregation,
        p_filters: queryFilters,
        p_limit: 20,
      });

      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const rows: AggregateRow[] = parsed?.data || parsed || [];

      const chartData = rows.map((row: AggregateRow) => {
        const labelKey = Object.keys(row).find(k => typeof row[k] === 'string') || config.groupByColumn;
        const valueKey = Object.keys(row).find(k =>
          k.includes(config.aggregation!) ||
          k === 'value' ||
          (typeof row[k] === 'number' && k !== labelKey)
        );
        return {
          label: String(row[labelKey!] || 'Unknown'),
          value: Number(row[valueKey!] || row.value || 0),
        };
      });

      setConfig(prev => ({ ...prev, data: chartData }));
      setHasResults(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [
    config.groupByColumn,
    config.metricColumn,
    config.aggregation,
    targetScope,
    targetCustomerId,
    effectiveCustomerId,
    dateRange,
    canSeeAdminColumns,
    availableColumns,
    editableFilters,
    setConfig,
    setHasResults,
  ]);

  return {
    runManualQuery,
    refreshData,
    previewLoading,
    previewError,
    setPreviewError,
  };
}

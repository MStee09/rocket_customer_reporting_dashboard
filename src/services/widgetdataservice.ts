import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { getWidgetById } from '../config/widgets/widgetRegistry';
import type { TableData } from '../utils/tabletransform';
import type { ReportExecutionParams, DateRange } from '../types/report';
import type { WidgetData } from '../config/widgets/widgetTypes';
import { createWidgetDataFetchers, defaultShipmentQuery } from './widgetFetchers';

export interface WidgetExecutionResult {
  widgetId: string;
  widgetName: string;
  widgetData: WidgetData;
  tableData: TableData;
  executedAt: string;
}

interface VisualBuilderWidgetDataSource {
  groupByColumn?: string;
  metricColumn?: string;
  aggregation?: string;
  filters?: Array<{ field: string; operator: string; value: string }>;
  aiConfig?: {
    searchTerms?: string[];
  };
  secondaryGroupByColumn?: string;
  secondaryGroupBy?: string;
}

interface VisualBuilderWidget {
  name: string;
  type?: string;
  dataSource?: VisualBuilderWidgetDataSource;
}

interface LoadedWidget {
  widget: VisualBuilderWidget;
  ownerCustomerId?: number;
}

async function loadVisualBuilderWidget(widgetId: string, customerId?: number): Promise<LoadedWidget | null> {
  if (customerId) {
    const { data, error } = await supabase.storage
      .from('custom-widgets')
      .download(`customer/${customerId}/${widgetId}.json`);

    if (!error && data) {
      const widget = JSON.parse(await data.text());
      logger.log('[widgetdataservice] Widget found at customer path:', customerId);
      return { widget, ownerCustomerId: customerId };
    }
  }

  const { data: adminData, error: adminError } = await supabase.storage
    .from('custom-widgets')
    .download(`admin/${widgetId}.json`);

  if (!adminError && adminData) {
    const widget = JSON.parse(await adminData.text());
    logger.log('[widgetdataservice] Widget found in admin folder');
    return { widget, ownerCustomerId: undefined };
  }

  const { data: systemData, error: systemError } = await supabase.storage
    .from('custom-widgets')
    .download(`system/${widgetId}.json`);

  if (!systemError && systemData) {
    const widget = JSON.parse(await systemData.text());
    logger.log('[widgetdataservice] Widget found in system folder');
    return { widget, ownerCustomerId: undefined };
  }

  logger.log('[widgetdataservice] Widget not found at provided paths, searching all customer folders for:', widgetId);

  const { data: customerFolders, error: listError } = await supabase.storage
    .from('custom-widgets')
    .list('customer');

  if (!listError && customerFolders) {
    for (const folder of customerFolders) {
      if (folder.name) {
        const folderCustomerId = parseInt(folder.name, 10);
        if (!isNaN(folderCustomerId)) {
          const { data: widgetData, error: widgetError } = await supabase.storage
            .from('custom-widgets')
            .download(`customer/${folderCustomerId}/${widgetId}.json`);

          if (!widgetError && widgetData) {
            const widget = JSON.parse(await widgetData.text());
            logger.log('[widgetdataservice] Widget found in customer folder:', folderCustomerId);
            return { widget, ownerCustomerId: folderCustomerId };
          }
        }
      }
    }
  }

  logger.log('[widgetdataservice] Widget not found in any location');
  return null;
}

export class WidgetNotFoundError extends Error {
  constructor(widgetId: string) {
    super(`Widget not found: ${widgetId}`);
    this.name = 'WidgetNotFoundError';
  }
}

export class WidgetExecutionError extends Error {
  constructor(widgetId: string, cause: Error) {
    super(`Failed to execute widget ${widgetId}: ${cause.message}`);
    this.name = 'WidgetExecutionError';
    this.cause = cause;
  }
}

async function fetchWidgetRowData(
  widgetId: string,
  dateRange: DateRange,
  customerId?: number,
  filters?: Record<string, string | number>
): Promise<{ rows: Record<string, unknown>[]; columns: { key: string; label: string; type: string }[] }> {
  const customerFilter = customerId ? [customerId] : [];
  const carrierFilter = filters?.carrier ? Number(filters.carrier) : null;

  const widgetDataFetchers = createWidgetDataFetchers({
    customerFilter,
    dateRange,
    carrierFilter,
    filters,
  });

  const fetcher = widgetDataFetchers[widgetId];

  if (fetcher) {
    return await fetcher();
  }

  return await defaultShipmentQuery(customerFilter, dateRange);
}

export async function executeWidget(
  widgetId: string,
  params: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  logger.log('[widgetdataservice] executeWidget called widgetId:', widgetId);
  logger.log('[widgetdataservice] executeWidget customerId:', customerId);
  logger.log('[widgetdataservice] executeWidget params.dateRange:', params.dateRange);

  const dateRange = params.dateRange || getDefaultDateRange();
  const customerIdNum = customerId ? Number(customerId) : undefined;

  logger.log('[widgetdataservice] Using dateRange:', dateRange.start, 'to', dateRange.end);
  logger.log('[widgetdataservice] Using customerIdNum:', customerIdNum);

  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) {
    logger.log('[widgetdataservice] Widget not in registry, checking for Visual Builder widget:', widgetId);

    const loadedWidgetResult = await loadVisualBuilderWidget(widgetId, customerIdNum);

    if (loadedWidgetResult && loadedWidgetResult.widget?.dataSource?.groupByColumn) {
      const customWidget = loadedWidgetResult.widget;
      const effectiveCustomerIdNum = loadedWidgetResult.ownerCustomerId || customerIdNum;

      logger.log('[widgetdataservice] Found Visual Builder widget:', customWidget.name);
      logger.log('[widgetdataservice] Widget owner customer ID:', loadedWidgetResult.ownerCustomerId);
      logger.log('[widgetdataservice] Effective customer ID for query:', effectiveCustomerIdNum);
      logger.log('[widgetdataservice] Widget dataSource:', JSON.stringify(customWidget.dataSource, null, 2));

      const { groupByColumn, metricColumn, aggregation, filters: savedFilters, aiConfig, secondaryGroupByColumn, secondaryGroupBy } = customWidget.dataSource;

      const actualSecondaryGroupBy = secondaryGroupByColumn || secondaryGroupBy;

      logger.log('[widgetdataservice] groupByColumn:', groupByColumn);
      logger.log('[widgetdataservice] secondaryGroupBy (actual):', actualSecondaryGroupBy);
      logger.log('[widgetdataservice] aiConfig:', JSON.stringify(aiConfig));
      logger.log('[widgetdataservice] searchTerms:', aiConfig?.searchTerms);

      const isProductQuery = groupByColumn === 'item_description' || groupByColumn === 'description';
      const tableName = isProductQuery ? 'shipment_item' : 'shipment';
      const groupByField = isProductQuery ? 'description' : groupByColumn;

      const searchTerms = aiConfig?.searchTerms || [];
      const isMultiDimension = actualSecondaryGroupBy && searchTerms.length > 0;

      logger.log('[widgetdataservice] isMultiDimension:', isMultiDimension, 'searchTerms.length:', searchTerms.length);

      if (isMultiDimension) {
        logger.log('[widgetdataservice] Multi-dimension query - grouping by', groupByField, 'and', actualSecondaryGroupBy);

        let detailRows: Record<string, unknown>[] = [];

        if (isProductQuery) {
          logger.log('[widgetdataservice] Multi-dim product query fetching actual shipment items');
          logger.log('[widgetdataservice]   - customer_id:', effectiveCustomerIdNum);
          logger.log('[widgetdataservice]   - date range:', dateRange.start, 'to', dateRange.end);
          logger.log('[widgetdataservice]   - search terms:', searchTerms);

          const { data: itemData, error: itemError } = await supabase
            .rpc('get_shipment_items_with_dates', {
              p_customer_id: effectiveCustomerIdNum || 0,
              p_start_date: dateRange.start,
              p_end_date: dateRange.end,
              p_search_terms: searchTerms,
              p_limit: 500
            });

          if (itemError) {
            console.error('[widgetdataservice] Multi-dim get_shipment_items_with_dates error:', itemError);
            detailRows = [];
          } else {
            logger.log('[widgetdataservice] Multi-dim fetched', (itemData || []).length, 'actual shipment_item rows');
            detailRows = itemData || [];
          }

          if (actualSecondaryGroupBy === 'origin_state' || actualSecondaryGroupBy === 'destination_state') {
            // Convert string load_ids to integers for shipment_address query
            const loadIds = [...new Set((detailRows || []).map((r: Record<string, unknown>) => parseInt(r.load_id as string, 10)))].filter(id => !isNaN(id));

            if (loadIds.length > 0) {
              logger.log('[widgetdataservice] Fetching addresses for', loadIds.length, 'load_ids');
              const { data: addresses, error: addrError } = await supabase
                .from('shipment_address')
                .select('load_id, city, state, address_type')
                .in('load_id', loadIds);

              if (addrError) {
                console.error('[widgetdataservice] Address lookup error:', addrError);
              } else {
                logger.log('[widgetdataservice] Found', (addresses || []).length, 'address records');
              }

              const addressMap = new Map<number, { origin_state?: string; destination_state?: string }>();
              for (const addr of addresses || []) {
                if (!addressMap.has(addr.load_id)) {
                  addressMap.set(addr.load_id, {});
                }
                if (addr.address_type === 1) {
                  addressMap.get(addr.load_id)!.origin_state = addr.state;
                } else if (addr.address_type === 2) {
                  addressMap.get(addr.load_id)!.destination_state = addr.state;
                }
              }

              detailRows = (detailRows || []).map((row: Record<string, unknown>) => {
                const loadIdNum = parseInt(row.load_id as string, 10);
                const addrs = addressMap.get(loadIdNum) || {};
                return {
                  ...row,
                  origin_state: addrs.origin_state || '',
                  destination_state: addrs.destination_state || ''
                };
              });
              logger.log('[widgetdataservice] Multi-dim added state data to', detailRows.length, 'rows');
            }
          }
        } else {
          let detailQuery = supabase
            .from('shipment')
            .select('load_id, reference_number, pickup_date, delivery_date, retail, cost')
            .gte('pickup_date', dateRange.start)
            .lte('pickup_date', dateRange.end)
            .limit(500);

          if (effectiveCustomerIdNum) {
            detailQuery = detailQuery.eq('customer_id', effectiveCustomerIdNum);
          }

          const { data } = await detailQuery;
          detailRows = data || [];

          if (actualSecondaryGroupBy === 'origin_state' || actualSecondaryGroupBy === 'destination_state') {
            const loadIds = (detailRows || []).map((r: Record<string, unknown>) => r.load_id as string);

            if (loadIds.length > 0) {
              const { data: addresses } = await supabase
                .from('shipment_address')
                .select('load_id, city, state, address_type')
                .in('load_id', loadIds);

              const addressMap = new Map<string, { origin_state?: string; destination_state?: string }>();
              for (const addr of addresses || []) {
                if (!addressMap.has(addr.load_id)) {
                  addressMap.set(addr.load_id, {});
                }
                if (addr.address_type === 1) {
                  addressMap.get(addr.load_id)!.origin_state = addr.state;
                } else if (addr.address_type === 2) {
                  addressMap.get(addr.load_id)!.destination_state = addr.state;
                }
              }

              detailRows = (detailRows || []).map((row: Record<string, unknown>) => {
                const addrs = addressMap.get(row.load_id as string) || {};
                return {
                  ...row,
                  origin_state: addrs.origin_state || '',
                  destination_state: addrs.destination_state || ''
                };
              });
            }
          }
        }

        const allChartData: Array<{
          primary_group: string;
          secondary_group: string;
          value: number;
          count: number;
        }> = [];

        const aggregationMap = new Map<string, { total: number; count: number }>();

        for (const row of detailRows) {
          const description = row.description as string || '';
          const secondaryValue = row[actualSecondaryGroupBy] as string || '';
          const metricValue = parseFloat(row[metricColumn] as string || '0') || 0;

          for (const term of searchTerms) {
            if (description.toLowerCase().includes(term.toLowerCase())) {
              const key = `${term}|||${secondaryValue}`;
              if (!aggregationMap.has(key)) {
                aggregationMap.set(key, { total: 0, count: 0 });
              }
              const agg = aggregationMap.get(key)!;
              agg.total += metricValue;
              agg.count += 1;
              break;
            }
          }
        }

        for (const [key, agg] of aggregationMap) {
          const [term, secondary] = key.split('|||');
          if (secondary) {
            const value = aggregation === 'avg' && agg.count > 0
              ? Math.round((agg.total / agg.count) * 100) / 100
              : aggregation === 'sum' ? agg.total : agg.total;
            allChartData.push({
              primary_group: term,
              secondary_group: secondary,
              value,
              count: agg.count
            });
          }
        }

        logger.log('[widgetdataservice] Multi-dim chartData computed:', allChartData.length, 'entries from', detailRows.length, 'detail rows');

        const columns = isProductQuery
          ? [
              { key: 'load_id', label: 'Load ID', type: 'string' as const },
              { key: 'description', label: 'Product', type: 'string' as const },
              { key: actualSecondaryGroupBy, label: actualSecondaryGroupBy.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), type: 'string' as const },
              { key: metricColumn, label: metricColumn.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), type: 'currency' as const },
              { key: 'quantity', label: 'Quantity', type: 'number' as const },
            ]
          : [
              { key: 'load_id', label: 'Load ID', type: 'string' as const },
              { key: 'reference_number', label: 'Reference', type: 'string' as const },
              { key: actualSecondaryGroupBy, label: actualSecondaryGroupBy.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), type: 'string' as const },
              { key: metricColumn, label: metricColumn.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), type: 'currency' as const },
              { key: 'pickup_date', label: 'Pickup Date', type: 'date' as const },
            ];

        const rows = detailRows;

        const tableData: TableData = {
          columns,
          rows,
          metadata: {
            rowCount: rows.length,
            generatedAt: new Date().toISOString(),
          }
        };

        const secondaryGroups = [...new Set(allChartData.map(d => d.secondary_group))].filter(Boolean).sort();
        const groupedMap = new Map<string, Record<string, number | string>>();

        for (const row of allChartData) {
          if (!groupedMap.has(row.primary_group)) {
            groupedMap.set(row.primary_group, { primaryGroup: row.primary_group });
          }
          groupedMap.get(row.primary_group)![row.secondary_group] = row.value;
        }

        const chartData = Array.from(groupedMap.values());

        return {
          widgetId,
          widgetName: customWidget.name,
          widgetData: {
            type: 'grouped_bar',
            data: chartData,
            secondaryGroups,
            isMultiDimension: true,
          },
          tableData,
          executedAt: new Date().toISOString(),
        };
      }

      const queryFilters: Array<{ field: string; operator: string; value: string }> = isProductQuery
        ? []
        : [
            { field: 'pickup_date', operator: 'gte', value: dateRange.start },
            { field: 'pickup_date', operator: 'lte', value: dateRange.end },
          ];

      if (aiConfig?.searchTerms && aiConfig.searchTerms.length > 0) {
        aiConfig.searchTerms.forEach((term: string) => {
          queryFilters.push({
            field: isProductQuery ? 'description' : 'item_description',
            operator: 'ilike',
            value: `%${term}%`,
          });
        });
      }

      if (savedFilters && Array.isArray(savedFilters)) {
        savedFilters.forEach((f: { field: string; operator: string; value: string }) => {
          if (f.value) {
            queryFilters.push({
              field: f.field === 'item_description' ? 'description' : f.field,
              operator: f.operator === 'contains' ? 'ilike' : f.operator,
              value: f.operator === 'contains' ? `%${f.value}%` : f.value,
            });
          }
        });
      }

      logger.log('[widgetdataservice] Single-dimension mcp_aggregate call:', {
        tableName,
        customerId: effectiveCustomerIdNum,
        groupByField,
        metricColumn,
        aggregation,
        filters: queryFilters
      });

      const { data: aggResult, error: aggError } = await supabase.rpc('mcp_aggregate', {
        p_table_name: tableName,
        p_customer_id: effectiveCustomerIdNum || 0,
        p_is_admin: false,
        p_group_by: groupByField,
        p_metric: metricColumn,
        p_aggregation: aggregation || 'avg',
        p_filters: queryFilters,
        p_limit: 100,
      });

      if (aggError) {
        throw new Error(`Query failed: ${aggError.message}`);
      }

      const parsed = typeof aggResult === 'string' ? JSON.parse(aggResult) : aggResult;
      const aggRows = Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);

      let detailRows: Record<string, unknown>[] = [];

      if (isProductQuery) {
        logger.log('[widgetdataservice] Single-dimension fetching product detail rows via get_shipment_items_with_dates');
        const { data: itemData, error: itemError } = await supabase
          .rpc('get_shipment_items_with_dates', {
            p_customer_id: effectiveCustomerIdNum || 0,
            p_start_date: dateRange.start,
            p_end_date: dateRange.end,
            p_search_terms: aiConfig?.searchTerms || [],
            p_limit: 500
          });

        if (itemError) {
          console.error('[widgetdataservice] shipment_item query error:', itemError);
          const { data: fallbackData } = await supabase
            .from('shipment_item')
            .select('load_id, description, quantity, weight, retail, cost')
            .limit(500);
          detailRows = fallbackData || [];
        } else {
          logger.log('[widgetdataservice] Single-dimension got', (itemData || []).length, 'detail rows');
          detailRows = itemData || [];
        }
      } else {
        let detailQuery = supabase
          .from('shipment')
          .select('load_id, reference_number, pickup_date, delivery_date, retail, cost')
          .gte('pickup_date', dateRange.start)
          .lte('pickup_date', dateRange.end)
          .limit(500);

        if (effectiveCustomerIdNum) {
          detailQuery = detailQuery.eq('customer_id', effectiveCustomerIdNum);
        }

        const { data } = await detailQuery;
        detailRows = data || [];
      }

      const rows = detailRows || [];
      const columns = isProductQuery
        ? [
            { key: 'load_id', label: 'Load ID', type: 'string' },
            { key: 'description', label: 'Product', type: 'string' },
            { key: 'quantity', label: 'Quantity', type: 'number' },
            { key: 'weight', label: 'Weight', type: 'number' },
            { key: 'retail', label: 'Retail', type: 'currency' },
          ]
        : [
            { key: 'load_id', label: 'Load ID', type: 'string' },
            { key: 'reference_number', label: 'Reference', type: 'string' },
            { key: 'pickup_date', label: 'Pickup Date', type: 'date' },
            { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
            { key: 'retail', label: 'Cost', type: 'currency' },
          ];

      const tableData: TableData = {
        columns: columns.map(col => ({
          key: col.key,
          label: col.label,
          type: col.type as 'string' | 'number' | 'date' | 'currency' | 'percent',
        })),
        rows: rows,
        metadata: {
          rowCount: rows.length,
          generatedAt: new Date().toISOString(),
        }
      };

      return {
        widgetId,
        widgetName: customWidget.name,
        widgetData: {
          type: customWidget.type || 'bar',
          data: aggRows.map((row: Record<string, unknown>) => {
            const labelKey = Object.keys(row).find(k => typeof row[k] === 'string') || groupByField;
            const valueKey = Object.keys(row).find(k =>
              (k as string).includes(aggregation || 'avg') || k === 'value' || typeof row[k] === 'number'
            );
            return { name: row[labelKey as keyof typeof row], value: row[valueKey as keyof typeof row] || row.value };
          }),
        },
        tableData,
        executedAt: new Date().toISOString(),
      };
    }

    console.error('[widgetdataservice] Widget not found:', widgetId);
    throw new WidgetNotFoundError(widgetId);
  }

  logger.log('[widgetdataservice] Calling fetchWidgetRowData', { widgetId, dateRange, customerIdNum, filters: params.filters });

  try {
    const { rows, columns } = await fetchWidgetRowData(widgetId, dateRange, customerIdNum, params.filters);
    logger.log('[widgetdataservice] fetchWidgetRowData returned', { rowCount: rows.length });

    const tableData: TableData = {
      columns: columns.map(col => ({
        key: col.key,
        label: col.label,
        type: col.type as 'string' | 'number' | 'date' | 'currency' | 'percent',
      })),
      rows: rows,
      metadata: {
        rowCount: rows.length,
        generatedAt: new Date().toISOString(),
      }
    };

    const widgetData = await widgetDef.calculate({
      supabase,
      dateRange,
      customerId: customerIdNum,
      effectiveCustomerIds: customerIdNum ? [customerIdNum] : [],
      isAdmin: false,
      isViewingAsCustomer: true,
    });

    return {
      widgetId,
      widgetName: widgetDef.name,
      widgetData: {
        ...widgetData,
        data: rows,
      },
      tableData,
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new WidgetExecutionError(
      widgetId,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

export async function executeWidgetReport(
  widgetId: string,
  executionParams: ReportExecutionParams,
  customerId: string
): Promise<WidgetExecutionResult> {
  return executeWidget(widgetId, executionParams, customerId);
}

export function getWidgetMetadata(widgetId: string): {
  id: string;
  name: string;
  description?: string;
  visualizationType: string;
} | null {
  const widgetDef = getWidgetById(widgetId);

  if (!widgetDef) return null;

  return {
    id: widgetDef.id,
    name: widgetDef.name,
    description: widgetDef.description,
    visualizationType: widgetDef.type,
  };
}

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

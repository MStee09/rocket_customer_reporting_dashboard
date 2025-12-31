import { SupabaseClient } from '@supabase/supabase-js';
import { CustomWidgetDefinition } from './customWidgetTypes';
import { validateWidgetQuery } from './widgetSecurity';
import { WidgetData } from './widgetTypes';
import { getSecureTable, SecureTableName } from '../../utils/getSecureTable';
import { loadLookupTables, getLookupDisplayValue, LookupData } from '../../services/lookupService';
import { getColumnType } from '../../utils/columnCapabilities';
import { formatWidgetLabel } from '../../utils/dateUtils';

export const executeCustomWidgetQuery = async (
  supabase: SupabaseClient,
  widget: CustomWidgetDefinition,
  customerId?: number,
  dateRange?: { start: string; end: string },
  isAdmin: boolean = false,
  isViewingAsCustomer: boolean = false
): Promise<WidgetData> => {

  if (widget.dataMode === 'static' && widget.snapshotData) {
    return widget.snapshotData as WidgetData;
  }

  const query = widget.dataSource.query;
  if (!query) {
    throw new Error('Widget has no query configuration');
  }

  const validation = validateWidgetQuery(query, false, customerId);
  if (!validation.valid) {
    throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
  }

  const selectColumns = query.columns.map(col => {
    if (col.aggregate) {
      return `${col.aggregate}(${col.field})`;
    }
    return col.alias ? `${col.field}:${col.alias}` : col.field;
  }).join(', ');

  const secureTable = getSecureTable(query.baseTable as SecureTableName, isAdmin, isViewingAsCustomer);

  let dbQuery = supabase.from(secureTable).select(selectColumns);

  for (const filter of query.filters || []) {
    let value = filter.value;

    if (filter.isDynamic) {
      if (filter.field === 'customer_id' && customerId) {
        value = customerId;
      } else if (filter.field === 'pickup_date' && dateRange) {
        if (filter.operator === 'gte') value = dateRange.start;
        if (filter.operator === 'lte') value = dateRange.end;
      }
    }

    switch (filter.operator) {
      case 'eq': dbQuery = dbQuery.eq(filter.field, value); break;
      case 'neq': dbQuery = dbQuery.neq(filter.field, value); break;
      case 'gt': dbQuery = dbQuery.gt(filter.field, value); break;
      case 'gte': dbQuery = dbQuery.gte(filter.field, value); break;
      case 'lt': dbQuery = dbQuery.lt(filter.field, value); break;
      case 'lte': dbQuery = dbQuery.lte(filter.field, value); break;
      case 'in': dbQuery = dbQuery.in(filter.field, value); break;
      case 'like': dbQuery = dbQuery.like(filter.field, value); break;
    }
  }

  if (customerId && widget.visibility.type !== 'admin_only') {
    dbQuery = dbQuery.eq('customer_id', customerId);
  }

  for (const order of query.orderBy || []) {
    if (order.field) {
      dbQuery = dbQuery.order(order.field, { ascending: order.direction === 'asc' });
    }
  }

  if (query.limit) {
    dbQuery = dbQuery.limit(query.limit);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  const lookups = await loadLookupTables();
  return transformToWidgetData(data || [], widget, lookups);
};

const LOOKUP_FIELDS = ['mode_id', 'status_id', 'equipment_type_id'];

const isLookupField = (field: string): boolean => {
  if (LOOKUP_FIELDS.includes(field)) return true;
  return getColumnType(field) === 'lookup';
};

const transformToWidgetData = (
  data: any[],
  widget: CustomWidgetDefinition,
  lookups: LookupData
): WidgetData => {
  const viz = widget.visualization;

  const convertLookupValue = (field: string, value: any): string => {
    if (!isLookupField(field)) return String(value ?? '');
    return getLookupDisplayValue(lookups, field, value);
  };

  switch (widget.type) {
    case 'kpi':
    case 'featured_kpi':
      const value = data[0]?.[viz.valueField || 'value'] || 0;
      return {
        type: 'kpi',
        value,
        label: viz.labelField ? data[0]?.[viz.labelField] : widget.name,
        format: viz.columns?.[0]?.format || 'number',
      };

    case 'pie_chart':
    case 'bar_chart':
    case 'line_chart':
      const xAxisField = viz.xAxis || 'name';
      return {
        type: 'chart',
        data: data.map(row => {
          let name = row[xAxisField];
          if (isLookupField(xAxisField)) {
            name = convertLookupValue(xAxisField, name);
          } else if (typeof name === 'string') {
            name = formatWidgetLabel(name);
          }
          return {
            name,
            value: row[viz.yAxis || 'value'],
            ...row,
          };
        }),
      };

    case 'table':
      const transformedData = data.map(row => {
        const newRow: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          newRow[key] = isLookupField(key) ? convertLookupValue(key, val) : val;
        }
        return newRow;
      });
      return {
        type: 'table',
        data: transformedData,
        columns: viz.columns,
      };

    default:
      return { type: 'chart', data };
  }
};

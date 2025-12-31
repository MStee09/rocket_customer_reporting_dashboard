import { SupabaseClient } from '@supabase/supabase-js';
import { getSecureTable, SecureTableName } from './getSecureTable';
import { loadLookupTables, getLookupDisplayValue } from '../services/lookupService';
import { getColumnType } from './columnCapabilities';
import { ColumnFilter, DateRangeValue, NumberRangeValue } from '../types/filters';
import { getColumnById } from '../config/reportColumns';
import { format, subDays, subMonths, startOfMonth, startOfYear, startOfQuarter } from 'date-fns';
import { aggregateValues, AggregationType } from './aggregation';

const LOOKUP_FIELDS = ['mode_id', 'status_id', 'equipment_type_id'];

const isLookupField = (field: string): boolean => {
  if (LOOKUP_FIELDS.includes(field)) return true;
  return getColumnType(field) === 'lookup';
};

interface QueryConfig {
  baseTable: string;
  columns: Array<{ field: string; aggregate?: string; alias?: string }>;
  filters: Array<{ field: string; operator: string; value: any; isDynamic?: boolean }>;
  groupBy?: string[];
  orderBy?: Array<{ field: string; direction: string }>;
  limit?: number;
  reportFilters?: ColumnFilter[];
}

interface ExecuteOptions {
  customerId?: number;
  dateRange?: { start: string; end: string };
  isAdmin?: boolean;
  isViewingAsCustomer?: boolean;
}

function getDateRangeForPreset(condition: string): { start: string; end: string } {
  const today = new Date();
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  switch (condition) {
    case 'last_7_days':
      return { start: formatDate(subDays(today, 7)), end: formatDate(today) };
    case 'last_30_days':
      return { start: formatDate(subDays(today, 30)), end: formatDate(today) };
    case 'last_60_days':
      return { start: formatDate(subDays(today, 60)), end: formatDate(today) };
    case 'last_90_days':
      return { start: formatDate(subDays(today, 90)), end: formatDate(today) };
    case 'this_month':
      return { start: formatDate(startOfMonth(today)), end: formatDate(today) };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return {
        start: formatDate(startOfMonth(lastMonth)),
        end: formatDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0))
      };
    }
    case 'this_quarter':
      return { start: formatDate(startOfQuarter(today)), end: formatDate(today) };
    case 'this_year':
    case 'ytd':
      return { start: formatDate(startOfYear(today)), end: formatDate(today) };
    case 'mtd':
      return { start: formatDate(startOfMonth(today)), end: formatDate(today) };
    default:
      return { start: formatDate(today), end: formatDate(today) };
  }
}

function applyReportFilters(query: any, reportFilters: ColumnFilter[] | undefined): any {
  if (!reportFilters || reportFilters.length === 0) return query;

  const enabledFilters = reportFilters.filter(f => f.enabled);

  enabledFilters.forEach(filter => {
    const column = getColumnById(filter.columnId);
    if (!column) return;

    const columnName = column.column;
    const condition = filter.condition;
    const value = filter.value;

    if (condition === 'is_empty') {
      query = query.is(columnName, null);
      return;
    }
    if (condition === 'is_not_empty') {
      query = query.not(columnName, 'is', null);
      return;
    }

    if (condition === 'is_true') {
      query = query.eq(columnName, true);
      return;
    }
    if (condition === 'is_false') {
      query = query.eq(columnName, false);
      return;
    }

    const datePresets = ['last_7_days', 'last_30_days', 'last_60_days', 'last_90_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'ytd', 'mtd'];
    if (datePresets.includes(condition)) {
      const range = getDateRangeForPreset(condition);
      query = query.gte(columnName, range.start).lte(columnName, range.end);
      return;
    }

    if (column.type === 'string') {
      switch (condition) {
        case 'is':
          query = query.eq(columnName, value);
          break;
        case 'is_not':
          query = query.neq(columnName, value);
          break;
        case 'contains':
          query = query.ilike(columnName, `%${value}%`);
          break;
        case 'starts_with':
          query = query.ilike(columnName, `${value}%`);
          break;
      }
      return;
    }

    if (column.type === 'number') {
      switch (condition) {
        case 'equals':
          query = query.eq(columnName, value);
          break;
        case 'not_equals':
          query = query.neq(columnName, value);
          break;
        case 'greater_than':
          query = query.gt(columnName, value);
          break;
        case 'less_than':
          query = query.lt(columnName, value);
          break;
        case 'between':
          const numRange = value as NumberRangeValue;
          query = query.gte(columnName, numRange.min).lte(columnName, numRange.max);
          break;
      }
      return;
    }

    if (column.type === 'date') {
      switch (condition) {
        case 'is':
          query = query.eq(columnName, value);
          break;
        case 'before':
          query = query.lt(columnName, value);
          break;
        case 'after':
          query = query.gt(columnName, value);
          break;
        case 'between':
          const dateRange = value as DateRangeValue;
          query = query.gte(columnName, dateRange.start).lte(columnName, dateRange.end);
          break;
      }
      return;
    }

    if (column.type === 'lookup') {
      switch (condition) {
        case 'is':
          query = query.eq(columnName, value);
          break;
        case 'is_not':
          query = query.neq(columnName, value);
          break;
        case 'is_any_of':
          query = query.in(columnName, value as number[]);
          break;
        case 'is_none_of':
          (value as number[]).forEach(v => {
            query = query.neq(columnName, v);
          });
          break;
      }
      return;
    }
  });

  return query;
}

export const executeCustomWidgetQuery = async (
  supabase: SupabaseClient,
  queryConfig: QueryConfig,
  options: ExecuteOptions
): Promise<{ data: any[]; error: string | null }> => {
  console.log('=== EXECUTING CUSTOM WIDGET QUERY ===');
  console.log('Query Config:', queryConfig);
  console.log('Report Filters:', queryConfig.reportFilters);
  console.log('Options:', options);

  try {
    const { baseTable, columns, filters, groupBy, orderBy, limit, reportFilters } = queryConfig;
    const { isAdmin = false, isViewingAsCustomer = false } = options;

    const secureTable = getSecureTable(baseTable as SecureTableName, isAdmin, isViewingAsCustomer);

    if (reportFilters && reportFilters.length > 0) {
      const enabledFilters = reportFilters.filter(f => f.enabled);
      console.log('Enabled report filters:', enabledFilters.length, 'of', reportFilters.length);
    }

    console.log('Columns:', columns.map(c => c.field));

    if (!groupBy || groupBy.length === 0) {
      const selectFields = columns.map(c => c.field).join(', ');

      console.log('Select fields:', selectFields);
      console.log('Customer ID:', options.customerId);
      console.log('Date range:', options.dateRange);

      let query = supabase
        .from(secureTable)
        .select(selectFields);

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      if (options.dateRange) {
        query = query
          .gte('pickup_date', options.dateRange.start)
          .lte('pickup_date', options.dateRange.end);
      }

      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          if (!filter.isDynamic) {
            switch (filter.operator) {
              case 'eq':
                query = query.eq(filter.field, filter.value);
                break;
              case 'neq':
                query = query.neq(filter.field, filter.value);
                break;
              case 'gt':
                query = query.gt(filter.field, filter.value);
                break;
              case 'gte':
                query = query.gte(filter.field, filter.value);
                break;
              case 'lt':
                query = query.lt(filter.field, filter.value);
                break;
              case 'lte':
                query = query.lte(filter.field, filter.value);
                break;
              case 'like':
                query = query.like(filter.field, `%${filter.value}%`);
                break;
              case 'in':
                query = query.in(filter.field, filter.value);
                break;
            }
          }
        });
      }

      query = applyReportFilters(query, queryConfig.reportFilters);

      if (limit) {
        query = query.limit(limit);
      }

      if (orderBy && orderBy.length > 0) {
        const order = orderBy[0];
        if (order.field) {
          query = query.order(order.field, { ascending: order.direction === 'asc' });
        }
      }

      const { data, error } = await query;

      console.log('Supabase response - data count:', data?.length);
      console.log('Supabase response - error:', error);

      if (error) {
        console.error('❌ Query error:', error);
        return { data: [], error: error.message };
      }

      console.log('✅ Query result:', data?.length, 'rows');
      return { data: data || [], error: null };
    }

    const groupByField = groupBy[0];
    const valueColumn = columns.find(c => c.aggregate);
    const valueField = valueColumn?.field === '*' ? null : valueColumn?.field;
    const aggregateType = valueColumn?.aggregate || 'count';

    let selectFields = groupByField;
    if (valueField && valueField !== '*') {
      selectFields += `, ${valueField}`;
    }

    console.log('Aggregation select fields:', selectFields);
    console.log('Group by:', groupByField);
    console.log('Using secure table:', secureTable);

    let query = supabase
      .from(secureTable)
      .select(selectFields);

    if (options.customerId) {
      query = query.eq('customer_id', options.customerId);
    }

    if (options.dateRange) {
      query = query
        .gte('pickup_date', options.dateRange.start)
        .lte('pickup_date', options.dateRange.end);
    }

    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        if (!filter.isDynamic) {
          switch (filter.operator) {
            case 'eq':
              query = query.eq(filter.field, filter.value);
              break;
            case 'neq':
              query = query.neq(filter.field, filter.value);
              break;
          }
        }
      });
    }

    query = applyReportFilters(query, queryConfig.reportFilters);

    query = query.limit(1000);

    const { data: rawData, error } = await query;

    console.log('Aggregation raw data count:', rawData?.length);
    console.log('Aggregation error:', error);

    if (error) {
      console.error('❌ Aggregation query error:', error);
      return { data: [], error: error.message };
    }

    const grouped = new Map<string, number[]>();

    (rawData || []).forEach(row => {
      const key = String(row[groupByField] || 'Unknown');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      if (valueField && valueField !== '*') {
        const val = parseFloat(row[valueField]) || 0;
        grouped.get(key)!.push(val);
      } else {
        grouped.get(key)!.push(1);
      }
    });

    const lookups = await loadLookupTables();

    const aggregatedData = Array.from(grouped.entries()).map(([category, values]) => {
      const value = aggregateValues(values, aggregateType as AggregationType);

      let displayName = category;
      if (isLookupField(groupByField)) {
        const numVal = parseInt(category, 10);
        if (!isNaN(numVal)) {
          displayName = getLookupDisplayValue(lookups, groupByField, numVal);
        }
      }

      return { name: displayName, value };
    });

    aggregatedData.sort((a, b) => b.value - a.value);

    const limitedData = limit ? aggregatedData.slice(0, limit) : aggregatedData;

    console.log('✅ Aggregated result:', limitedData.length, 'groups');
    return { data: limitedData, error: null };

  } catch (err) {
    console.error('❌ Execute error:', err);
    return { data: [], error: String(err) };
  }
};

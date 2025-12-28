import { SimpleReportConfig, SimpleReportColumn } from '../types/reports';
import { ColumnFilter, ColumnSort, DateRangeValue, NumberRangeValue } from '../types/filters';
import { getColumnById } from '../config/reportColumns';
import { supabase } from '../lib/supabase';
import { format, subDays, subMonths, startOfMonth, startOfYear, startOfQuarter } from 'date-fns';

interface QueryPart {
  select: string[];
  from: string;
  joins: string[];
  where: string[];
  groupBy: string[];
  orderBy: string[];
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

function getColumnExpression(columnId: string): string | null {
  const columnDef = getColumnById(columnId);
  if (!columnDef) return null;

  if (columnId.startsWith('origin_')) {
    return `origin_addr.${columnDef.column}`;
  } else if (columnId.startsWith('destination_')) {
    return `dest_addr.${columnDef.column}`;
  } else if (columnId.startsWith('carrier_')) {
    return `c.${columnDef.column}`;
  } else if (columnDef.table === 'shipment_item') {
    return `si.${columnDef.column}`;
  } else {
    return `s.${columnDef.column}`;
  }
}

function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}

function buildFilterConditions(filters: ColumnFilter[] | undefined): string[] {
  if (!filters || filters.length === 0) return [];

  const conditions: string[] = [];
  const enabledFilters = filters.filter(f => f.enabled);

  enabledFilters.forEach(filter => {
    const columnExpr = getColumnExpression(filter.columnId);
    if (!columnExpr) return;

    const column = getColumnById(filter.columnId);
    if (!column) return;

    const condition = filter.condition;
    const value = filter.value;

    if (condition === 'is_empty') {
      conditions.push(`${columnExpr} IS NULL`);
      return;
    }
    if (condition === 'is_not_empty') {
      conditions.push(`${columnExpr} IS NOT NULL`);
      return;
    }

    if (condition === 'is_true') {
      conditions.push(`${columnExpr} = true`);
      return;
    }
    if (condition === 'is_false') {
      conditions.push(`${columnExpr} = false`);
      return;
    }

    const datePresets = ['last_7_days', 'last_30_days', 'last_60_days', 'last_90_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'ytd', 'mtd'];
    if (datePresets.includes(condition)) {
      const range = getDateRangeForPreset(condition);
      conditions.push(`${columnExpr} >= '${range.start}' AND ${columnExpr} <= '${range.end}'`);
      return;
    }

    if (column.type === 'string') {
      const strValue = escapeString(String(value));
      switch (condition) {
        case 'is':
          conditions.push(`${columnExpr} = '${strValue}'`);
          break;
        case 'is_not':
          conditions.push(`${columnExpr} != '${strValue}'`);
          break;
        case 'contains':
          conditions.push(`${columnExpr} ILIKE '%${strValue}%'`);
          break;
        case 'starts_with':
          conditions.push(`${columnExpr} ILIKE '${strValue}%'`);
          break;
      }
      return;
    }

    if (column.type === 'number') {
      switch (condition) {
        case 'equals':
          conditions.push(`${columnExpr} = ${value}`);
          break;
        case 'not_equals':
          conditions.push(`${columnExpr} != ${value}`);
          break;
        case 'greater_than':
          conditions.push(`${columnExpr} > ${value}`);
          break;
        case 'less_than':
          conditions.push(`${columnExpr} < ${value}`);
          break;
        case 'between': {
          const numRange = value as NumberRangeValue;
          conditions.push(`${columnExpr} >= ${numRange.min} AND ${columnExpr} <= ${numRange.max}`);
          break;
        }
      }
      return;
    }

    if (column.type === 'date') {
      switch (condition) {
        case 'is':
          conditions.push(`${columnExpr} = '${value}'`);
          break;
        case 'before':
          conditions.push(`${columnExpr} < '${value}'`);
          break;
        case 'after':
          conditions.push(`${columnExpr} > '${value}'`);
          break;
        case 'between': {
          const dateRange = value as DateRangeValue;
          conditions.push(`${columnExpr} >= '${dateRange.start}' AND ${columnExpr} <= '${dateRange.end}'`);
          break;
        }
      }
      return;
    }

    if (column.type === 'lookup') {
      switch (condition) {
        case 'is':
          conditions.push(`${columnExpr} = ${value}`);
          break;
        case 'is_not':
          conditions.push(`${columnExpr} != ${value}`);
          break;
        case 'is_any_of': {
          const values = value as number[];
          if (values.length > 0) {
            conditions.push(`${columnExpr} IN (${values.join(', ')})`);
          }
          break;
        }
        case 'is_none_of': {
          const values = value as number[];
          if (values.length > 0) {
            conditions.push(`${columnExpr} NOT IN (${values.join(', ')})`);
          }
          break;
        }
      }
      return;
    }
  });

  return conditions;
}

function buildSortClauses(sorts: ColumnSort[] | undefined): string[] {
  if (!sorts || sorts.length === 0) return [];

  const clauses: string[] = [];

  sorts.forEach(sort => {
    if (sort.direction === 'none') return;

    const columnExpr = getColumnExpression(sort.columnId);
    if (!columnExpr) return;

    clauses.push(`${columnExpr} ${sort.direction.toUpperCase()}`);
  });

  return clauses;
}

export function buildQueryFromSimpleReport(
  config: SimpleReportConfig,
  customerId?: string
): string {
  const query: QueryPart = {
    select: [],
    from: 'shipment s',
    joins: [],
    where: [],
    groupBy: [],
    orderBy: []
  };

  const usedTables = new Set<string>(['shipment']);

  const allColumnIds = [
    ...config.columns.map(col => col.id),
    ...(config.filters?.filter(f => f.enabled).map(f => f.columnId) || []),
    ...(config.sorts?.filter(s => s.direction !== 'none').map(s => s.columnId) || [])
  ];

  const needsOriginAddress = allColumnIds.some(id => id.startsWith('origin_'));
  const needsDestinationAddress = allColumnIds.some(id => id.startsWith('destination_'));
  const needsCarrier = allColumnIds.some(id => id.startsWith('carrier_'));
  const needsShipmentItem = allColumnIds.some(id => {
    const columnDef = getColumnById(id);
    return columnDef?.table === 'shipment_item';
  });

  if (needsOriginAddress) {
    query.joins.push('LEFT JOIN shipment_address origin_addr ON s.load_id = origin_addr.load_id AND origin_addr.address_type = 1');
    usedTables.add('shipment_address_origin');
  }

  if (needsDestinationAddress) {
    query.joins.push('LEFT JOIN shipment_address dest_addr ON s.load_id = dest_addr.load_id AND dest_addr.address_type = 2');
    usedTables.add('shipment_address_dest');
  }

  if (needsCarrier) {
    query.joins.push('LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id');
    query.joins.push('LEFT JOIN carrier c ON sc.carrier_id = c.carrier_id');
    usedTables.add('carrier');
  }

  if (needsShipmentItem) {
    query.joins.push('LEFT JOIN shipment_item si ON s.load_id = si.load_id');
    usedTables.add('shipment_item');
  }

  if (customerId) {
    query.where.push(`s.customer_id = ${customerId}`);
  }

  const filterConditions = buildFilterConditions(config.filters);
  query.where.push(...filterConditions);

  for (const column of config.columns) {
    const columnDef = getColumnById(column.id);
    if (!columnDef) continue;

    let selectExpr = '';
    let alias = column.id;

    if (column.id.startsWith('origin_')) {
      const field = columnDef.column;
      if (config.isSummary && column.aggregation) {
        selectExpr = `${column.aggregation.toUpperCase()}(origin_addr.${field})`;
      } else {
        selectExpr = `origin_addr.${field}`;
      }
    } else if (column.id.startsWith('destination_')) {
      const field = columnDef.column;
      if (config.isSummary && column.aggregation) {
        selectExpr = `${column.aggregation.toUpperCase()}(dest_addr.${field})`;
      } else {
        selectExpr = `dest_addr.${field}`;
      }
    } else if (column.id.startsWith('carrier_')) {
      const field = columnDef.column;
      if (config.isSummary && column.aggregation) {
        selectExpr = `${column.aggregation.toUpperCase()}(c.${field})`;
      } else {
        selectExpr = `c.${field}`;
      }
    } else if (columnDef.table === 'shipment_item') {
      const field = columnDef.column;
      if (config.isSummary && column.aggregation) {
        selectExpr = `${column.aggregation.toUpperCase()}(si.${field})`;
      } else {
        selectExpr = `si.${field}`;
      }
    } else {
      const tableAlias = 's';
      const field = columnDef.column;

      if (config.isSummary && column.aggregation) {
        if (column.id === 'shipment_count') {
          selectExpr = 'COUNT(DISTINCT s.load_id)';
        } else {
          selectExpr = `${column.aggregation.toUpperCase()}(${tableAlias}.${field})`;
        }
      } else {
        selectExpr = `${tableAlias}.${field}`;
      }
    }

    query.select.push(`${selectExpr} as ${alias}`);
  }

  if (config.isSummary && config.groupBy && config.groupBy.length > 0) {
    for (const groupCol of config.groupBy) {
      const columnDef = getColumnById(groupCol);
      if (!columnDef) continue;

      let groupExpr = '';

      if (groupCol.startsWith('origin_')) {
        groupExpr = `origin_addr.${columnDef.column}`;
      } else if (groupCol.startsWith('destination_')) {
        groupExpr = `dest_addr.${columnDef.column}`;
      } else if (groupCol.startsWith('carrier_')) {
        groupExpr = `c.${columnDef.column}`;
      } else if (columnDef.table === 'shipment_item') {
        groupExpr = `si.${columnDef.column}`;
      } else {
        groupExpr = `s.${columnDef.column}`;
      }

      query.groupBy.push(groupExpr);
    }
  }

  const customSorts = buildSortClauses(config.sorts);
  if (customSorts.length > 0) {
    query.orderBy.push(...customSorts);
  } else if (config.groupBy && config.groupBy.length > 0) {
    for (const groupCol of config.groupBy) {
      const columnDef = getColumnById(groupCol);
      if (!columnDef) continue;

      let orderExpr = '';

      if (groupCol.startsWith('origin_')) {
        orderExpr = `origin_addr.${columnDef.column}`;
      } else if (groupCol.startsWith('destination_')) {
        orderExpr = `dest_addr.${columnDef.column}`;
      } else if (groupCol.startsWith('carrier_')) {
        orderExpr = `c.${columnDef.column}`;
      } else if (columnDef.table === 'shipment_item') {
        orderExpr = `si.${columnDef.column}`;
      } else {
        orderExpr = `s.${columnDef.column}`;
      }

      query.orderBy.push(orderExpr);
    }
  } else {
    query.orderBy.push('s.pickup_date DESC');
  }

  const sql = [
    `SELECT ${query.select.join(', ')}`,
    `FROM ${query.from}`,
    ...query.joins,
    query.where.length > 0 ? `WHERE ${query.where.join(' AND ')}` : '',
    query.groupBy.length > 0 ? `GROUP BY ${query.groupBy.join(', ')}` : '',
    query.orderBy.length > 0 ? `ORDER BY ${query.orderBy.join(', ')}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  return sql;
}

export async function executeSimpleReport(
  config: SimpleReportConfig,
  customerId?: string
): Promise<any[]> {
  const query = buildQueryFromSimpleReport(config, customerId);

  const { data, error } = await supabase.rpc('execute_custom_query', {
    query_text: query
  });

  if (error) {
    console.error('Query execution error:', error);
    throw error;
  }

  return data || [];
}

export function validateSimpleReport(config: SimpleReportConfig): string[] {
  const errors: string[] = [];

  if (!config.name?.trim()) {
    errors.push('Report name is required');
  }

  if (!config.columns || config.columns.length === 0) {
    errors.push('At least one column must be selected');
  }

  if (config.isSummary && (!config.groupBy || config.groupBy.length === 0)) {
    errors.push('Summary mode requires at least one grouping column');
  }

  if (config.isSummary) {
    const hasAggregation = config.columns.some(col => col.aggregation);
    if (!hasAggregation) {
      errors.push('Summary mode requires at least one aggregated column');
    }
  }

  return errors;
}

export function getReportPreviewData(config: SimpleReportConfig): any[] {
  const sampleRow: any = {};

  for (const column of config.columns) {
    const columnDef = getColumnById(column.id);
    if (!columnDef) continue;

    let sampleValue: any;

    switch (columnDef.type) {
      case 'string':
        sampleValue = `Sample ${columnDef.label}`;
        break;
      case 'number':
        sampleValue = config.isSummary ? 12345 : 100;
        break;
      case 'date':
        sampleValue = '2024-01-15';
        break;
      case 'boolean':
        sampleValue = true;
        break;
      default:
        sampleValue = 'N/A';
    }

    sampleRow[column.id] = sampleValue;
  }

  return [sampleRow, { ...sampleRow }, { ...sampleRow }];
}

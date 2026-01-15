import { SupabaseClient } from '@supabase/supabase-js';
import {
  AIReportDefinition,
  ReportSection,
  MetricConfig,
  MetricAggregation,
  ExecutedReportData,
  DateRangeType,
  CategoryGridSection,
  ChartSection,
  TableSection,
  MapSection,
  Categorization,
  NumericCategorization,
  CalculatedField,
} from '../types/aiReport';
import { aggregateValues as aggregateNumericValues, AggregationType } from '../utils/aggregation';
import { logger } from '../utils/logger';

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeForPreset(
  preset: DateRangeType,
  customStart?: string,
  customEnd?: string
): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'last30':
      start.setDate(start.getDate() - 30);
      break;
    case 'last90':
      start.setDate(start.getDate() - 90);
      break;
    case 'last6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'lastYear':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'yearToDate':
      start.setMonth(0, 1);
      break;
    case 'allTime':
      start.setFullYear(2000, 0, 1);
      break;
    case 'custom':
      if (customStart) {
        const customStartDate = new Date(customStart);
        customStartDate.setHours(0, 0, 0, 0);
        return {
          start: customStartDate,
          end: customEnd ? new Date(customEnd) : end,
        };
      }
      start.setFullYear(2000, 0, 1);
      break;
    default:
      start.setFullYear(2000, 0, 1);
  }

  return { start, end };
}

interface MetricResult {
  label: string;
  value: number;
  format: string;
}

interface GroupedResult {
  name: string;
  value: number;
  subtitle?: string;
}

export async function executeReportData(
  supabase: SupabaseClient,
  report: AIReportDefinition,
  customerId: string,
  isAdmin: boolean
): Promise<ExecutedReportData> {
  logger.log('executeReportData called with report:', report);
  logger.log('dateRange:', report.dateRange);

  const dateRangeType = report.dateRange?.type || 'last90';
  const dateRange = getDateRangeForPreset(
    dateRangeType,
    report.dateRange?.customStart,
    report.dateRange?.customEnd
  );

  logger.log('Calculated dateRange:', dateRange);

  const results: ExecutedReportData = {
    sections: [],
    executedAt: new Date().toISOString(),
    dateRange: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    },
  };

  for (let i = 0; i < report.sections.length; i++) {
    const section = report.sections[i];
    try {
      const data = await executeSectionQuery(
        supabase,
        section,
        customerId,
        dateRange,
        isAdmin,
        report.categorization,
        report.numericCategorization,
        report.calculatedFields
      );
      results.sections.push({ sectionIndex: i, data });
    } catch (error) {
      results.sections.push({
        sectionIndex: i,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function executeSectionQuery(
  supabase: SupabaseClient,
  section: ReportSection,
  customerId: string,
  dateRange: DateRange,
  isAdmin: boolean,
  categorization?: Categorization,
  numericCategorization?: NumericCategorization,
  calculatedFields?: CalculatedField[]
): Promise<unknown> {
  switch (section.type) {
    case 'hero':
      return executeMetricQuery(
        supabase,
        section.config.metric,
        customerId,
        dateRange,
        isAdmin,
        calculatedFields
      );

    case 'stat-row': {
      const statResults = await Promise.all(
        section.config.stats.map((stat) =>
          executeMetricQuery(supabase, stat.metric, customerId, dateRange, isAdmin, calculatedFields)
        )
      );
      return statResults;
    }

    case 'category-grid':
      return executeGroupedQuery(
        supabase,
        section as CategoryGridSection,
        customerId,
        dateRange,
        isAdmin,
        categorization,
        numericCategorization,
        calculatedFields
      );

    case 'chart':
      return executeChartQuery(
        supabase,
        section as ChartSection,
        customerId,
        dateRange,
        isAdmin,
        categorization,
        numericCategorization,
        calculatedFields
      );

    case 'table':
      return executeTableQuery(
        supabase,
        section as TableSection,
        customerId,
        dateRange,
        isAdmin,
        categorization,
        numericCategorization,
        calculatedFields
      );

    case 'header':
      return null;

    case 'map':
      return executeMapQuery(
        supabase,
        section as MapSection,
        customerId,
        dateRange,
        isAdmin,
        calculatedFields
      );

    default:
      return null;
  }
}

const REPORT_VIEW = 'shipment_report_view';

export interface ReportQueryDefinition {
  calculatedFields?: CalculatedField[];
  categorization?: Categorization;
  numericCategorization?: NumericCategorization;
  groupBy?: string;
  metrics?: Array<{
    field: string;
    aggregation: string;
    label: string;
  }>;
}

function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

function buildTextCategorizationCase(categorization: Categorization): string {
  let caseStmt = 'CASE\n';
  categorization.rules.forEach(rule => {
    const keywords = Array.isArray(rule.contains) ? rule.contains : [rule.contains];
    const conditions = keywords.map(kw => {
      const escapedContains = escapeString(kw.toLowerCase());
      return `LOWER(${categorization.field}) LIKE '%${escapedContains}%'`;
    }).join(' OR ');
    const escapedCategory = escapeString(rule.category);
    caseStmt += `      WHEN ${conditions} THEN '${escapedCategory}'\n`;
  });
  const escapedDefault = escapeString(categorization.default);
  caseStmt += `      ELSE '${escapedDefault}'\n    END AS ${categorization.name}`;
  return caseStmt;
}

function buildNumericCategorizationCase(numCat: NumericCategorization): string {
  let caseStmt = 'CASE\n';
  numCat.ranges.forEach(range => {
    const escapedCategory = escapeString(range.category);
    if (range.max !== undefined && range.min === undefined) {
      caseStmt += `      WHEN ${numCat.field} < ${range.max} THEN '${escapedCategory}'\n`;
    } else if (range.min !== undefined && range.max === undefined) {
      caseStmt += `      WHEN ${numCat.field} >= ${range.min} THEN '${escapedCategory}'\n`;
    } else if (range.min !== undefined && range.max !== undefined) {
      caseStmt += `      WHEN ${numCat.field} >= ${range.min} AND ${numCat.field} < ${range.max} THEN '${escapedCategory}'\n`;
    }
  });
  caseStmt += `      ELSE NULL\n    END AS ${numCat.name}`;
  return caseStmt;
}

export function buildReportQuery(
  reportDef: ReportQueryDefinition,
  customerId: string,
  dateFilter?: string
): string {
  const cteFields: string[] = ['*'];

  if (reportDef.calculatedFields) {
    reportDef.calculatedFields.forEach(calc => {
      cteFields.push(`(${calc.formula}) AS ${calc.name}`);
    });
  }

  if (reportDef.categorization) {
    cteFields.push(buildTextCategorizationCase(reportDef.categorization));
  }

  if (reportDef.numericCategorization) {
    cteFields.push(buildNumericCategorizationCase(reportDef.numericCategorization));
  }

  let whereClause = '';
  if (customerId && customerId !== 'ALL') {
    const escapedCustomerId = escapeString(customerId);
    whereClause = `customer_id = '${escapedCustomerId}'`;
  }
  if (dateFilter) {
    whereClause = whereClause ? `${whereClause} AND ${dateFilter}` : dateFilter;
  }
  if (!whereClause) whereClause = '1=1';

  const query = `
    WITH report_data AS (
      SELECT
        ${cteFields.join(',\n        ')}
      FROM ${REPORT_VIEW}
      WHERE ${whereClause}
    )
    SELECT * FROM report_data
  `;

  return query;
}

export function buildAggregatedQuery(
  reportDef: ReportQueryDefinition,
  customerId: string,
  dateFilter?: string
): string {
  const groupByField = reportDef.groupBy ||
    reportDef.categorization?.name ||
    reportDef.numericCategorization?.name;

  if (!groupByField || !reportDef.metrics || reportDef.metrics.length === 0) {
    return buildReportQuery(reportDef, customerId, dateFilter);
  }

  const cteFields: string[] = ['*'];

  if (reportDef.calculatedFields) {
    reportDef.calculatedFields.forEach(calc => {
      cteFields.push(`(${calc.formula}) AS ${calc.name}`);
    });
  }

  if (reportDef.categorization) {
    cteFields.push(buildTextCategorizationCase(reportDef.categorization));
  }

  if (reportDef.numericCategorization) {
    cteFields.push(buildNumericCategorizationCase(reportDef.numericCategorization));
  }

  let whereClause = '';
  if (customerId && customerId !== 'ALL') {
    const escapedCustomerId = escapeString(customerId);
    whereClause = `customer_id = '${escapedCustomerId}'`;
  }
  if (dateFilter) {
    whereClause = whereClause ? `${whereClause} AND ${dateFilter}` : dateFilter;
  }
  if (!whereClause) whereClause = '1=1';

  const aggregations = reportDef.metrics.map(m => {
    const agg = m.aggregation.toUpperCase();
    const fieldName = m.field === '*' ? 'record_count' : m.field;
    if (agg === 'COUNT' && m.field === '*') {
      return `COUNT(*) AS ${fieldName}`;
    }
    if (agg === 'COUNTDISTINCT' || agg === 'COUNT_DISTINCT') {
      return `COUNT(DISTINCT ${m.field}) AS ${fieldName}_distinct`;
    }
    return `${agg}(${m.field}) AS ${fieldName}`;
  }).join(',\n      ');

  const query = `
    WITH report_data AS (
      SELECT
        ${cteFields.join(',\n        ')}
      FROM ${REPORT_VIEW}
      WHERE ${whereClause}
    )
    SELECT
      ${groupByField},
      ${aggregations},
      COUNT(*) as total_records
    FROM report_data
    WHERE ${groupByField} IS NOT NULL
    GROUP BY ${groupByField}
    ORDER BY total_records DESC
  `;

  return query;
}

export function buildDateFilterClause(dateRange: DateRange): string {
  const startDate = dateRange.start.toISOString().split('T')[0];
  const endDate = dateRange.end.toISOString().split('T')[0];
  return `pickup_date >= '${startDate}' AND pickup_date <= '${endDate}'`;
}

export function buildFullReportQuery(
  report: AIReportDefinition,
  customerId: string,
  groupBy?: string,
  metrics?: Array<{ field: string; aggregation: string; label: string }>
): string {
  const dateRangeType = report.dateRange?.type || 'last90';
  const dateRange = getDateRangeForPreset(
    dateRangeType,
    report.dateRange?.customStart,
    report.dateRange?.customEnd
  );

  const dateFilter = buildDateFilterClause(dateRange);

  const queryDef: ReportQueryDefinition = {
    calculatedFields: report.calculatedFields,
    categorization: report.categorization,
    numericCategorization: report.numericCategorization,
    groupBy,
    metrics,
  };

  if (groupBy && metrics && metrics.length > 0) {
    return buildAggregatedQuery(queryDef, customerId, dateFilter);
  }

  return buildReportQuery(queryDef, customerId, dateFilter);
}

const COMPUTED_GROUP_FIELDS: Record<string, (row: Record<string, unknown>) => string> = {
  'lane': (row) => {
    const origin = row['origin_state'] || 'Unknown';
    const dest = row['destination_state'] || 'Unknown';
    return `${origin} -> ${dest}`;
  },
  'lane_city': (row) => {
    const origin = row['origin_city'] || 'Unknown';
    const dest = row['destination_city'] || 'Unknown';
    return `${origin} -> ${dest}`;
  },
  'origin_to_destination': (row) => {
    const origin = row['origin_state'] || 'Unknown';
    const dest = row['destination_state'] || 'Unknown';
    return `${origin} -> ${dest}`;
  },
};

function applyCategorization(
  row: Record<string, unknown>,
  categorization: Categorization
): string {
  const fieldValue = String(row[categorization.field] || '').toLowerCase();

  for (const rule of categorization.rules) {
    const keywords = Array.isArray(rule.contains) ? rule.contains : [rule.contains];
    for (const keyword of keywords) {
      if (fieldValue.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }

  return categorization.default;
}

function applyNumericCategorization(
  row: Record<string, unknown>,
  numericCategorization: NumericCategorization
): string | null {
  const fieldValue = row[numericCategorization.field];

  if (fieldValue === null || fieldValue === undefined) {
    return null;
  }

  const numValue = Number(fieldValue);
  if (isNaN(numValue)) {
    return null;
  }

  for (const range of numericCategorization.ranges) {
    const minOk = range.min === undefined || numValue >= range.min;
    const maxOk = range.max === undefined || numValue < range.max;

    if (minOk && maxOk) {
      return range.category;
    }
  }

  return null;
}

function applyCalculatedFields(
  row: Record<string, unknown>,
  calculatedFields?: CalculatedField[]
): Record<string, unknown> {
  if (!calculatedFields || calculatedFields.length === 0) {
    return row;
  }

  const result = { ...row };

  calculatedFields.forEach(calc => {
    try {
      const formula = calc.formula
        .replace(/NULLIF\(([^,]+),\s*0\)/gi, (_, field) => {
          const value = Number(result[field.trim()]) || 0;
          return value === 0 ? 'null' : String(value);
        })
        .replace(/([a-z_][a-z0-9_]*)/gi, (match) => {
          if (match === 'null') return match;
          const value = result[match];
          if (value === null || value === undefined) return 'null';
          return String(Number(value) || 0);
        });

      if (formula.includes('null')) {
        result[calc.name] = null;
      } else {
        const value = Function(`"use strict"; return (${formula})`)();
        result[calc.name] = isFinite(value) ? value : null;
      }
    } catch {
      result[calc.name] = null;
    }
  });

  return result;
}

function getGroupKey(
  row: Record<string, unknown>,
  groupBy: string,
  categorization?: Categorization,
  numericCategorization?: NumericCategorization
): string {
  if (categorization && groupBy === categorization.name) {
    return applyCategorization(row, categorization);
  }
  if (numericCategorization && groupBy === numericCategorization.name) {
    const category = applyNumericCategorization(row, numericCategorization);
    return category || 'Unknown';
  }
  if (COMPUTED_GROUP_FIELDS[groupBy]) {
    return COMPUTED_GROUP_FIELDS[groupBy](row);
  }
  return String(row[groupBy] || 'Other');
}

async function executeMetricQuery(
  supabase: SupabaseClient,
  metric: MetricConfig,
  customerId: string,
  dateRange: DateRange,
  _isAdmin: boolean,
  calculatedFields?: CalculatedField[]
): Promise<MetricResult> {
  const baseResult: MetricResult = {
    label: metric.label,
    value: 0,
    format: metric.format || 'number',
  };

  let query = supabase.from(REPORT_VIEW).select('*');

  query = query.eq('customer_id', customerId);

  query = query
    .gte('pickup_date', dateRange.start.toISOString().split('T')[0])
    .lte('pickup_date', dateRange.end.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return baseResult;
  }

  const processedData = data.map(row => applyCalculatedFields(row, calculatedFields));

  if (metric.computation) {
    const agg1 = aggregateValues(processedData, metric.computation.field1, metric.computation.agg1);
    const agg2 = aggregateValues(processedData, metric.computation.field2, metric.computation.agg2);

    let value = 0;
    switch (metric.computation.type) {
      case 'divide':
        value = agg2 !== 0 ? agg1 / agg2 : 0;
        break;
      case 'subtract':
        value = agg1 - agg2;
        break;
      case 'multiply':
        value = agg1 * agg2;
        break;
      case 'add':
        value = agg1 + agg2;
        break;
    }

    return { ...baseResult, value };
  }

  const value = aggregateValues(processedData, metric.field, metric.aggregation);
  return { ...baseResult, value };
}

async function executeGroupedQuery(
  supabase: SupabaseClient,
  section: CategoryGridSection,
  customerId: string,
  dateRange: DateRange,
  _isAdmin: boolean,
  categorization?: Categorization,
  numericCategorization?: NumericCategorization,
  calculatedFields?: CalculatedField[]
): Promise<GroupedResult[]> {
  const config = section.config;

  let query = supabase.from(REPORT_VIEW).select('*');

  query = query.eq('customer_id', customerId);

  query = query
    .gte('pickup_date', dateRange.start.toISOString().split('T')[0])
    .lte('pickup_date', dateRange.end.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  const processedData = data.map(row => applyCalculatedFields(row, calculatedFields));

  const groups: Record<
    string,
    { rows: Record<string, unknown>[]; values: number[]; subtitleValues: number[]; count: number }
  > = {};

  processedData.forEach((row) => {
    const groupKey = getGroupKey(row, config.groupBy, categorization, numericCategorization);
    if (!groups[groupKey]) {
      groups[groupKey] = { rows: [], values: [], subtitleValues: [], count: 0 };
    }
    groups[groupKey].rows.push(row);
    groups[groupKey].values.push(Number(row[config.metric.field]) || 0);
    groups[groupKey].count += 1;

    if (config.subtitle) {
      groups[groupKey].subtitleValues.push(
        Number(row[config.subtitle.field]) || 0
      );
    }
  });

  const results = Object.entries(groups)
    .map(([name, group]) => {
      const result: GroupedResult = {
        name,
        value: aggregateGroupData(group.rows, config.metric.field, config.metric.aggregation, calculatedFields),
      };

      if (config.subtitle && group.subtitleValues.length > 0) {
        const subtitleValue = aggregateArray(
          group.subtitleValues,
          config.subtitle.aggregation
        );
        result.subtitle = `${Math.round(subtitleValue)} ${config.subtitle.label || 'units'}`;
      }

      return result;
    })
    .sort((a, b) => b.value - a.value);

  return config.maxCategories ? results.slice(0, config.maxCategories) : results;
}

async function executeChartQuery(
  supabase: SupabaseClient,
  section: ChartSection,
  customerId: string,
  dateRange: DateRange,
  _isAdmin: boolean,
  categorization?: Categorization,
  numericCategorization?: NumericCategorization,
  calculatedFields?: CalculatedField[]
): Promise<GroupedResult[]> {
  const config = section.config;

  let query = supabase.from(REPORT_VIEW).select('*');

  query = query.eq('customer_id', customerId);

  query = query
    .gte('pickup_date', dateRange.start.toISOString().split('T')[0])
    .lte('pickup_date', dateRange.end.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  const processedData = data.map(row => applyCalculatedFields(row, calculatedFields));

  const groups: Record<string, Record<string, unknown>[]> = {};

  processedData.forEach((row) => {
    const groupKey = getGroupKey(row, config.groupBy, categorization, numericCategorization);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(row);
  });

  return Object.entries(groups)
    .map(([name, rows]) => ({
      name,
      value: aggregateGroupData(rows, config.metric.field, config.metric.aggregation, calculatedFields),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

async function executeTableQuery(
  supabase: SupabaseClient,
  section: TableSection,
  customerId: string,
  dateRange: DateRange,
  _isAdmin: boolean,
  categorization?: Categorization,
  numericCategorization?: NumericCategorization,
  calculatedFields?: CalculatedField[]
): Promise<Record<string, unknown>[]> {
  const config = section.config;

  let query = supabase.from(REPORT_VIEW).select('*');

  query = query.eq('customer_id', customerId);

  query = query
    .gte('pickup_date', dateRange.start.toISOString().split('T')[0])
    .lte('pickup_date', dateRange.end.toISOString().split('T')[0]);

  if (config.sortBy?.field && !config.groupBy) {
    query = query.order(config.sortBy.field, {
      ascending: config.sortBy.direction === 'asc',
    });
  }

  if (config.maxRows && !config.groupBy) {
    query = query.limit(config.maxRows);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  const processedData = data.map(row => applyCalculatedFields(row, calculatedFields));

  if (config.groupBy) {
    const groups: Record<string, Record<string, unknown>[]> = {};

    processedData.forEach((row) => {
      const groupKey = getGroupKey(row, config.groupBy!, categorization, numericCategorization);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    const getColumnKey = (col: typeof config.columns[0], index: number): string => {
      if (col.aggregation && col.aggregation !== 'sum') {
        return `${col.field}_${col.aggregation}`;
      }
      const duplicatesBefore = config.columns
        .slice(0, index)
        .filter((c) => c.field === col.field).length;
      return duplicatesBefore > 0 ? `${col.field}_${index}` : col.field;
    };

    const aggregatedResults = Object.entries(groups).map(([groupName, rows]) => {
      const result: Record<string, unknown> = {
        [config.groupBy!]: groupName,
      };

      config.columns.forEach((col, colIndex) => {
        const colKey = getColumnKey(col, colIndex);

        if (col.field === config.groupBy) {
          result[colKey] = groupName;
        } else if (col.computation) {
          const agg1 = aggregateGroupData(rows, col.computation.field1, col.computation.agg1, calculatedFields);
          const agg2 = aggregateGroupData(rows, col.computation.field2, col.computation.agg2, calculatedFields);
          let computedValue = 0;
          switch (col.computation.type) {
            case 'divide':
              computedValue = agg2 !== 0 ? agg1 / agg2 : 0;
              break;
            case 'subtract':
              computedValue = agg1 - agg2;
              break;
            case 'multiply':
              computedValue = agg1 * agg2;
              break;
            case 'add':
              computedValue = agg1 + agg2;
              break;
          }
          result[colKey] = computedValue;
        } else if (col.aggregation) {
          result[colKey] = aggregateGroupData(rows, col.field, col.aggregation, calculatedFields);
        } else {
          const metric = config.metrics?.find(
            (m) => m.field === col.field && m.label === col.label
          );
          if (metric) {
            result[colKey] = aggregateGroupData(rows, metric.field, metric.aggregation, calculatedFields);
          } else {
            const fieldMetric = config.metrics?.find((m) => m.field === col.field);
            if (fieldMetric) {
              result[colKey] = aggregateGroupData(rows, fieldMetric.field, fieldMetric.aggregation, calculatedFields);
            } else {
              result[colKey] = aggregateGroupData(rows, col.field, 'sum', calculatedFields);
            }
          }
        }
      });

      if (config.metrics) {
        config.metrics.forEach((metric) => {
          if (!(metric.field in result)) {
            result[metric.field] = aggregateGroupData(rows, metric.field, metric.aggregation, calculatedFields);
          }
        });
      }

      result._count = rows.length;

      return result;
    });

    if (config.sortBy) {
      const sortField = config.sortBy.field;
      aggregatedResults.sort((a, b) => {
        const aVal = Number(a[sortField]) || Number(a._count) || 0;
        const bVal = Number(b[sortField]) || Number(b._count) || 0;
        return config.sortBy!.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return config.maxRows
      ? aggregatedResults.slice(0, config.maxRows)
      : aggregatedResults;
  }

  const fieldKeys = config.columns.map((col) => col.field);
  return processedData.map((row) => {
    const result: Record<string, unknown> = {};
    fieldKeys.forEach((key) => {
      result[key] = row[key];
    });
    return result;
  });
}

function aggregateValues(
  data: Record<string, unknown>[],
  field: string,
  agg: MetricAggregation
): number {
  if (agg === 'countDistinct' || agg === 'count_distinct') {
    const uniqueValues = new Set(
      data
        .map((row) => row[field])
        .filter((v) => v != null && v !== '')
    );
    return uniqueValues.size;
  }
  const values = data.map((row) => Number(row[field]) || 0);
  return aggregateArray(values, agg);
}

function aggregateGroupData(
  rows: Record<string, unknown>[],
  field: string,
  agg: MetricAggregation,
  calculatedFields?: CalculatedField[]
): number {
  if (agg === 'count') {
    return rows.length;
  }
  if (agg === 'countDistinct' || agg === 'count_distinct') {
    const uniqueValues = new Set(
      rows
        .map((row) => row[field])
        .filter((v) => v != null && v !== '')
    );
    return uniqueValues.size;
  }

  if (agg === 'avg' && calculatedFields) {
    const calcField = calculatedFields.find(cf => cf.name === field);
    if (calcField && calcField.formula.includes('/')) {
      const formulaParts = calcField.formula.split('/').map(s => s.trim());
      if (formulaParts.length === 2) {
        let numeratorField = formulaParts[0];
        let denominatorField = formulaParts[1];

        const nullifMatch = denominatorField.match(/NULLIF\(([^,]+),\s*0\)/i);
        if (nullifMatch) {
          denominatorField = nullifMatch[1].trim();
        }

        const sumNumerator = rows.reduce((sum, row) => sum + (Number(row[numeratorField]) || 0), 0);
        const sumDenominator = rows.reduce((sum, row) => sum + (Number(row[denominatorField]) || 0), 0);

        return sumDenominator !== 0 ? sumNumerator / sumDenominator : 0;
      }
    }
  }

  const values = rows.map((row) => Number(row[field]) || 0);
  return aggregateArray(values, agg);
}

function aggregateArray(values: number[], agg: MetricAggregation): number {
  return aggregateNumericValues(values, agg as AggregationType);
}

interface MapDataPoint {
  stateCode?: string;
  origin?: string;
  destination?: string;
  value: number;
  shipmentCount?: number;
}

async function executeMapQuery(
  supabase: SupabaseClient,
  section: MapSection,
  customerId: string,
  dateRange: DateRange,
  _isAdmin: boolean,
  calculatedFields?: CalculatedField[]
): Promise<MapDataPoint[]> {
  const config = section.config;

  let query = supabase.from(REPORT_VIEW).select('*');

  query = query.eq('customer_id', customerId);

  query = query
    .gte('pickup_date', dateRange.start.toISOString().split('T')[0])
    .lte('pickup_date', dateRange.end.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  const processedData = data.map(row => applyCalculatedFields(row, calculatedFields));

  if (config.mapType === 'choropleth') {
    const stateField = config.groupBy || 'destination_state';
    const groups: Record<string, { values: number[]; count: number }> = {};

    processedData.forEach((row) => {
      const stateCode = String(row[stateField] || '');
      if (!stateCode || stateCode === 'null' || stateCode === 'undefined') return;

      if (!groups[stateCode]) {
        groups[stateCode] = { values: [], count: 0 };
      }
      groups[stateCode].values.push(Number(row[config.metric.field]) || 0);
      groups[stateCode].count += 1;
    });

    return Object.entries(groups).map(([stateCode, group]) => ({
      stateCode,
      value: aggregateArray(group.values, config.metric.aggregation),
      shipmentCount: group.count,
    }));
  }

  if (config.mapType === 'flow' || config.mapType === 'arc') {
    const groups: Record<string, { values: number[]; count: number }> = {};

    processedData.forEach((row) => {
      const origin = String(row['origin_state'] || '');
      const destination = String(row['destination_state'] || '');
      if (!origin || !destination) return;

      const key = `${origin}|${destination}`;
      if (!groups[key]) {
        groups[key] = { values: [], count: 0 };
      }
      groups[key].values.push(Number(row[config.metric.field]) || 0);
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([key, group]) => {
      const [origin, destination] = key.split('|');
      return {
        origin,
        destination,
        value: aggregateArray(group.values, config.metric.aggregation),
        shipmentCount: group.count,
      };
    });
  }

  if (config.mapType === 'cluster') {
    const stateField = config.groupBy || 'destination_state';
    const groups: Record<string, { values: number[]; count: number }> = {};

    processedData.forEach((row) => {
      const stateCode = String(row[stateField] || '');
      if (!stateCode) return;

      if (!groups[stateCode]) {
        groups[stateCode] = { values: [], count: 0 };
      }
      groups[stateCode].values.push(Number(row[config.metric.field]) || 0);
      groups[stateCode].count += 1;
    });

    return Object.entries(groups).map(([stateCode, group]) => ({
      stateCode,
      value: aggregateArray(group.values, config.metric.aggregation),
      shipmentCount: group.count,
    }));
  }

  return [];
}

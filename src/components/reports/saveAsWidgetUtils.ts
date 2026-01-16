import { logger } from '../../utils/logger';
import { getColumnById } from '../../config/reportColumns';
import { formatWidgetLabel } from '../../utils/dateUtils';
import { WidgetData, WhatItShows } from '../../config/widgets/widgetTypes';
import { SimpleReportConfig } from '../../types/reports';
import { ColumnFilter } from '../../types/filters';

export type WidgetType = 'table' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'kpi';

export interface FieldInfo {
  field: string;
  label: string;
  type: string;
}

export interface WidgetConfig {
  type: WidgetType;
  name: string;
  description: string;
  tableColumns?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  groupByField?: string;
  valueField?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  xAxisField?: string;
  kpiField?: string;
  kpiAggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  kpiFormat?: 'number' | 'currency' | 'percent';
  dataMode: 'dynamic' | 'static';
}

export interface AiSuggestionContext {
  reportName: string;
  availableFields: FieldInfo[];
  numericFields: FieldInfo[];
  categoryFields: FieldInfo[];
  dateFields: FieldInfo[];
}

export interface QueryConfig {
  baseTable: string;
  columns: { field: string; aggregate?: string }[];
  filters: { field: string; operator: string; value: string; isDynamic?: boolean }[];
  reportFilters: ColumnFilter[];
  groupBy?: string[];
  orderBy?: { field: string; direction: string }[];
  limit?: number;
}

export interface RawDataRow {
  [key: string]: unknown;
}

export function formatWidgetType(type: WidgetType): string {
  switch (type) {
    case 'bar_chart': return 'Bar Chart';
    case 'pie_chart': return 'Pie Chart';
    case 'line_chart': return 'Line Chart';
    case 'kpi': return 'KPI';
    case 'table': return 'Table';
    default: return 'Widget';
  }
}

export function generateLocalAiSuggestion(prompt: string, context: AiSuggestionContext): WidgetConfig {
  const lower = prompt.toLowerCase();

  let type: WidgetType = 'table';
  if (lower.includes('pie') || lower.includes('breakdown') || lower.includes('distribution')) {
    type = 'pie_chart';
  } else if (lower.includes('bar') || lower.includes('compare') || lower.includes('comparison')) {
    type = 'bar_chart';
  } else if (lower.includes('trend') || lower.includes('over time') || lower.includes('line')) {
    type = 'line_chart';
  } else if (lower.includes('total') || lower.includes('sum') || lower.includes('count') || lower.includes('average') || lower.includes('kpi')) {
    type = 'kpi';
  }

  let groupByField = '';
  const byPatterns = [
    { pattern: /by\s+mode/i, keywords: ['mode', 'transport'] },
    { pattern: /by\s+carrier/i, keywords: ['carrier', 'scac', 'carrier_name'] },
    { pattern: /by\s+state/i, keywords: ['state', 'origin_state', 'destination_state'] },
    { pattern: /by\s+origin\s+state/i, keywords: ['origin_state'] },
    { pattern: /by\s+destination\s+state/i, keywords: ['destination_state'] },
    { pattern: /by\s+origin\s+city/i, keywords: ['origin_city'] },
    { pattern: /by\s+destination\s+city/i, keywords: ['destination_city'] },
    { pattern: /by\s+origin/i, keywords: ['origin', 'origin_city', 'origin_state'] },
    { pattern: /by\s+destination/i, keywords: ['destination', 'destination_city', 'destination_state'] },
    { pattern: /by\s+status/i, keywords: ['status', 'status_code', 'status_description'] },
    { pattern: /by\s+customer/i, keywords: ['customer', 'customer_name'] },
    { pattern: /by\s+city/i, keywords: ['city', 'origin_city', 'destination_city'] },
  ];

  for (const { pattern, keywords } of byPatterns) {
    if (pattern.test(lower)) {
      for (const keyword of keywords) {
        const match = context.availableFields.find((f: FieldInfo) =>
          f.field.toLowerCase().includes(keyword) ||
          f.label.toLowerCase().includes(keyword)
        );
        if (match) {
          groupByField = match.field;
          break;
        }
      }
      if (groupByField) break;
    }
  }

  if (!groupByField && (type === 'pie_chart' || type === 'bar_chart')) {
    const categoryCol = context.categoryFields.find((f: FieldInfo) =>
      f.type === 'string' || f.type === 'category'
    );
    groupByField = categoryCol?.field || '';
  }

  let valueField = 'count';
  let aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' = 'count';

  if (lower.includes('retail') || lower.includes('revenue')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('retail') ||
      f.field.toLowerCase().includes('revenue')
    );
    if (match) {
      valueField = match.field;
      aggregation = 'sum';
    }
  } else if (lower.includes('cost') || lower.includes('spend') || lower.includes('amount')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('cost') ||
      f.field.toLowerCase().includes('spend') ||
      f.field.toLowerCase().includes('amount')
    );
    if (match) {
      valueField = match.field;
      aggregation = 'sum';
    }
  } else if (lower.includes('miles') || lower.includes('distance')) {
    const match = context.availableFields.find((f: FieldInfo) =>
      f.field.toLowerCase().includes('miles') ||
      f.field.toLowerCase().includes('distance')
    );
    if (match) {
      valueField = match.field;
      aggregation = lower.includes('average') || lower.includes('avg') ? 'avg' : 'sum';
    }
  } else if (lower.includes('count') || lower.includes('how many') || lower.includes('number of')) {
    valueField = 'count';
    aggregation = 'count';
  }

  const suggestion: WidgetConfig = {
    type,
    name: `${context.reportName} - ${formatWidgetType(type)}`,
    description: `Widget created from "${context.reportName}"`,
    dataMode: 'dynamic',
  };

  if (type === 'table') {
    suggestion.tableColumns = context.availableFields.slice(0, 5).map((f: FieldInfo) => f.field);
    suggestion.limit = 10;
  } else if (type === 'bar_chart' || type === 'pie_chart') {
    suggestion.groupByField = groupByField;
    suggestion.valueField = valueField;
    suggestion.aggregation = aggregation;
  } else if (type === 'line_chart') {
    const dateField = context.dateFields.find((f: FieldInfo) => f.type === 'date');
    suggestion.xAxisField = dateField?.field || '';
    suggestion.valueField = valueField;
    suggestion.aggregation = aggregation;
  } else if (type === 'kpi') {
    suggestion.kpiField = valueField;
    suggestion.kpiAggregation = aggregation;
    suggestion.kpiFormat = valueField.toLowerCase().includes('retail') || valueField.toLowerCase().includes('cost') ? 'currency' : 'number';
  }

  logger.log('AI Suggestion generated:', suggestion);

  return suggestion;
}

export function buildQueryConfig(config: WidgetConfig, report: SimpleReportConfig & { id: string }): QueryConfig {
  const query: QueryConfig = {
    baseTable: 'shipment',
    columns: [],
    filters: [
      { field: 'customer_id', operator: 'eq', value: 'customerId', isDynamic: true },
    ],
    reportFilters: report.filters || [],
  };

  if (config.type === 'table') {
    query.columns = config.tableColumns?.map(f => ({ field: f })) || [];
    if (config.limit) {
      query.limit = config.limit;
    }
  } else if (config.type === 'bar_chart' || config.type === 'pie_chart') {
    query.columns = [
      { field: config.groupByField },
      { field: config.valueField === 'count' ? '*' : config.valueField, aggregate: config.aggregation || 'count' },
    ];
    query.groupBy = [config.groupByField];
  } else if (config.type === 'line_chart') {
    query.columns = [
      { field: config.xAxisField },
      { field: config.valueField === 'count' ? '*' : config.valueField, aggregate: config.aggregation || 'count' },
    ];
    query.groupBy = [config.xAxisField];
    query.orderBy = [{ field: config.xAxisField, direction: 'asc' }];
  } else if (config.type === 'kpi') {
    query.columns = [
      { field: config.kpiField === 'count' ? '*' : config.kpiField, aggregate: config.kpiAggregation || 'count' },
    ];
  }

  return query;
}

export function buildVisualizationConfig(config: WidgetConfig) {
  return {
    type: config.type,
    ...(config.type === 'table' && {
      columns: config.tableColumns?.map(f => ({ field: f, label: f })),
    }),
    ...(config.groupByField && { categoryField: config.groupByField }),
    ...(config.valueField && { valueField: config.valueField }),
    ...(config.kpiFormat && { format: config.kpiFormat }),
  };
}

export function buildWhatItShows(config: WidgetConfig, report: SimpleReportConfig & { id: string }): WhatItShows {
  const whatItShows: WhatItShows = {
    summary: '',
    columns: [],
    filters: ['Your shipments only', 'Within selected date range'],
    updateBehavior: 'live',
  };

  switch (config.type) {
    case 'table':
      whatItShows.summary = `Shows a table of shipment data from your "${report.name}" report.`;
      whatItShows.columns = config.tableColumns?.map(f => {
        const col = getColumnById(f);
        return {
          name: col?.label || f,
          description: col?.description || `${col?.label || f} value`,
        };
      }) || [];
      if (config.limit) {
        whatItShows.limit = `${config.limit} rows`;
      }
      break;

    case 'bar_chart':
    case 'pie_chart': {
      const groupField = getColumnById(config.groupByField || '');
      const valueField = config.valueField === 'count' ? null : getColumnById(config.valueField || '');
      whatItShows.summary = `Shows ${config.aggregation?.toUpperCase() || 'COUNT'} of ${valueField?.label || 'records'} grouped by ${groupField?.label || config.groupByField}.`;
      whatItShows.columns = [
        { name: groupField?.label || config.groupByField, description: 'Category grouping' },
        { name: `${config.aggregation?.toUpperCase()}(${valueField?.label || 'records'})`, description: 'Aggregated value' },
      ];
      break;
    }

    case 'line_chart': {
      const xField = getColumnById(config.xAxisField || '');
      const lineValueField = config.valueField === 'count' ? null : getColumnById(config.valueField || '');
      whatItShows.summary = `Shows ${config.aggregation?.toUpperCase() || 'COUNT'} of ${lineValueField?.label || 'records'} over time.`;
      whatItShows.columns = [
        { name: xField?.label || config.xAxisField, description: 'Time period' },
        { name: `${config.aggregation?.toUpperCase()}(${lineValueField?.label || 'records'})`, description: 'Aggregated value' },
      ];
      break;
    }

    case 'kpi': {
      const kpiField = config.kpiField === 'count' ? null : getColumnById(config.kpiField || '');
      whatItShows.summary = `Shows the ${config.kpiAggregation?.toUpperCase() || 'total'} of ${kpiField?.label || 'records'}.`;
      whatItShows.columns = [
        { name: `${config.kpiAggregation?.toUpperCase()}(${kpiField?.label || 'records'})`, description: 'Single aggregated value' },
      ];
      break;
    }
  }

  if (report.filters && report.filters.length > 0) {
    const activeFilters = report.filters.filter((f: ColumnFilter) => f.enabled);
    if (activeFilters.length > 0) {
      whatItShows.filters.push(`${activeFilters.length} data filter${activeFilters.length !== 1 ? 's' : ''} applied`);
    }
  }

  return whatItShows;
}

export function inferCategory(config: WidgetConfig): string {
  if (config.valueField?.toLowerCase().includes('cost') || config.kpiField?.toLowerCase().includes('cost')) {
    return 'financial';
  }
  if (config.groupByField?.toLowerCase().includes('carrier')) {
    return 'breakdown';
  }
  return 'volume';
}

export function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    table: 'Table',
    bar_chart: 'BarChart3',
    pie_chart: 'PieChart',
    line_chart: 'TrendingUp',
    kpi: 'Hash',
  };
  return icons[type] || 'LayoutGrid';
}

export function getWidgetColor(type: WidgetType): string {
  const colors: Record<WidgetType, string> = {
    table: 'bg-slate-500',
    bar_chart: 'bg-rocket-600',
    pie_chart: 'bg-amber-500',
    line_chart: 'bg-green-500',
    kpi: 'bg-emerald-500',
  };
  return colors[type] || 'bg-slate-500';
}

export function getDefaultSize(type: WidgetType): string {
  const sizes: Record<WidgetType, string> = {
    table: 'wide',
    bar_chart: 'wide',
    pie_chart: 'medium',
    line_chart: 'wide',
    kpi: 'small',
  };
  return sizes[type] || 'medium';
}

export function transformRawDataToWidgetData(rawData: RawDataRow[], config: WidgetConfig): WidgetData {
  switch (config.type) {
    case 'table': {
      const columns = config.tableColumns || [];
      const tableData = rawData.slice(0, config.limit || 10).map(row => {
        const newRow: Record<string, unknown> = {};
        for (const col of columns) {
          newRow[col] = row[col];
        }
        return newRow;
      });
      return {
        type: 'table',
        data: tableData,
        columns: columns.map(f => ({ field: f, label: f })),
      };
    }

    case 'bar_chart':
    case 'pie_chart': {
      const groupField = config.groupByField || '';
      const valueField = config.valueField || '';
      const aggregation = config.aggregation || 'count';

      const grouped = new Map<string, number>();
      for (const row of rawData) {
        const key = String(row[groupField] ?? 'Unknown');
        const currentVal = grouped.get(key) || 0;

        if (aggregation === 'count') {
          grouped.set(key, currentVal + 1);
        } else if (aggregation === 'sum') {
          grouped.set(key, currentVal + (Number(row[valueField]) || 0));
        } else if (aggregation === 'avg') {
          const count = (grouped.get(`${key}_count`) || 0) + 1;
          const total = currentVal * (count - 1) + (Number(row[valueField]) || 0);
          grouped.set(key, total / count);
          grouped.set(`${key}_count`, count);
        }
      }

      const chartData = Array.from(grouped.entries())
        .filter(([k]) => !k.endsWith('_count'))
        .map(([name, value]) => ({ name: formatWidgetLabel(name), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return { type: 'chart', data: chartData };
    }

    case 'line_chart': {
      const xField = config.xAxisField || '';
      const valueField = config.valueField || '';
      const aggregation = config.aggregation || 'count';

      const grouped = new Map<string, { sum: number; count: number }>();
      for (const row of rawData) {
        const key = String(row[xField] ?? '');
        if (!key) continue;
        const current = grouped.get(key) || { sum: 0, count: 0 };
        current.count += 1;
        current.sum += Number(row[valueField]) || 0;
        grouped.set(key, current);
      }

      const chartData = Array.from(grouped.entries())
        .map(([name, { sum, count }]) => ({
          name: formatWidgetLabel(name),
          value: aggregation === 'count' ? count :
                 aggregation === 'avg' ? Math.round((sum / count) * 100) / 100 :
                 Math.round(sum * 100) / 100,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { type: 'chart', data: chartData };
    }

    case 'kpi': {
      const kpiField = config.kpiField || '';
      const aggregation = config.kpiAggregation || 'count';

      let value = 0;
      if (aggregation === 'count') {
        value = rawData.length;
      } else if (aggregation === 'sum') {
        value = rawData.reduce((acc, row) => acc + (Number(row[kpiField]) || 0), 0);
      } else if (aggregation === 'avg') {
        const sum = rawData.reduce((acc, row) => acc + (Number(row[kpiField]) || 0), 0);
        value = rawData.length > 0 ? sum / rawData.length : 0;
      }

      return {
        type: 'kpi',
        value: Math.round(value * 100) / 100,
        label: config.name || 'Value',
        format: config.kpiFormat || 'number',
      };
    }

    default:
      return { type: 'chart', data: [] };
  }
}

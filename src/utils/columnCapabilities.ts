import { getFieldByColumn, getFieldById, FieldDefinition } from '../config/schema/fieldSchema';

export interface ColumnInfo {
  id: string;
  column: string;
  label: string;
  field?: FieldDefinition;
}

export interface ColumnCapabilities {
  hasGroupableColumn: boolean;
  hasAggregatableColumn: boolean;
  hasDateColumn: boolean;
  hasNumericColumn: boolean;
  hasCurrencyColumn: boolean;
  hasLookupColumn: boolean;
  groupableColumns: ColumnInfo[];
  aggregatableColumns: ColumnInfo[];
  dateColumns: ColumnInfo[];
  numericColumns: ColumnInfo[];
  lookupColumns: ColumnInfo[];
  allColumns: ColumnInfo[];
}

export const detectColumnCapabilities = (columns: any[]): ColumnCapabilities => {
  const result: ColumnCapabilities = {
    hasGroupableColumn: false,
    hasAggregatableColumn: false,
    hasDateColumn: false,
    hasNumericColumn: false,
    hasCurrencyColumn: false,
    hasLookupColumn: false,
    groupableColumns: [],
    aggregatableColumns: [],
    dateColumns: [],
    numericColumns: [],
    lookupColumns: [],
    allColumns: [],
  };

  columns.forEach(col => {
    const columnName = col.column || col.id || '';
    const label = col.label || col.column || col.id || '';

    const field = getFieldByColumn(columnName) || getFieldById(columnName) || getFieldById(col.id);

    const columnInfo: ColumnInfo = {
      id: col.id || columnName,
      column: columnName,
      label: label,
      field: field || undefined,
    };

    result.allColumns.push(columnInfo);

    if (field) {
      if (field.availableForGrouping) {
        result.hasGroupableColumn = true;
        result.groupableColumns.push(columnInfo);
      }
      if (field.availableForAggregation) {
        result.hasAggregatableColumn = true;
        result.aggregatableColumns.push(columnInfo);
      }
      if (field.type === 'date') {
        result.hasDateColumn = true;
        result.dateColumns.push(columnInfo);
      }
      if (field.type === 'number' || field.type === 'currency') {
        result.hasNumericColumn = true;
        result.numericColumns.push(columnInfo);
        if (field.type === 'currency' || field.type === 'number') {
          if (!field.availableForAggregation && field.type !== 'number') {
            result.hasAggregatableColumn = true;
            result.aggregatableColumns.push(columnInfo);
          }
        }
      }
      if (field.type === 'currency') {
        result.hasCurrencyColumn = true;
      }
      if (field.type === 'lookup') {
        result.hasLookupColumn = true;
        result.lookupColumns.push(columnInfo);
        if (!field.availableForGrouping) {
          result.hasGroupableColumn = true;
          result.groupableColumns.push(columnInfo);
        }
      }
    } else {
      const colLower = columnName.toLowerCase();

      const groupablePatterns = [
        'mode', 'status', 'carrier', 'equipment', 'type',
        'state', 'city', 'region', 'zone', 'category',
        'customer', 'shipper', 'consignee', 'vendor',
        'code', 'class', 'service', 'lane'
      ];

      if (groupablePatterns.some(p => colLower.includes(p))) {
        result.hasGroupableColumn = true;
        result.groupableColumns.push(columnInfo);
      }

      const aggregatablePatterns = [
        'retail', 'cost', 'amount', 'margin', 'profit', 'revenue',
        'price', 'rate', 'charge', 'fee', 'total', 'sum',
        'miles', 'weight', 'quantity', 'count', 'pieces', 'pallets',
        'feet', 'volume', 'cube', 'density'
      ];

      if (aggregatablePatterns.some(p => colLower.includes(p))) {
        result.hasAggregatableColumn = true;
        result.hasNumericColumn = true;
        result.aggregatableColumns.push(columnInfo);
        result.numericColumns.push(columnInfo);
      }

      const currencyPatterns = ['retail', 'cost', 'amount', 'margin', 'profit', 'revenue', 'price', 'rate', 'charge', 'fee'];
      if (currencyPatterns.some(p => colLower.includes(p))) {
        result.hasCurrencyColumn = true;
      }

      const datePatterns = ['date', '_at', 'time', 'created', 'updated', 'pickup', 'delivery'];
      if (datePatterns.some(p => colLower.includes(p))) {
        result.hasDateColumn = true;
        result.dateColumns.push(columnInfo);
      }

      if (colLower.endsWith('_id') && colLower !== 'load_id') {
        result.hasLookupColumn = true;
        result.lookupColumns.push(columnInfo);
        result.hasGroupableColumn = true;
        result.groupableColumns.push(columnInfo);
      }
    }
  });

  result.groupableColumns = dedupeColumns(result.groupableColumns);
  result.aggregatableColumns = dedupeColumns(result.aggregatableColumns);
  result.dateColumns = dedupeColumns(result.dateColumns);
  result.numericColumns = dedupeColumns(result.numericColumns);
  result.lookupColumns = dedupeColumns(result.lookupColumns);

  return result;
};

const dedupeColumns = (columns: ColumnInfo[]): ColumnInfo[] => {
  const seen = new Set<string>();
  return columns.filter(c => {
    const key = c.column || c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface WidgetTypeOption {
  id: string;
  label: string;
  description: string;
  available: boolean;
  reason: string | null;
  requiredCapabilities: string[];
}

export const getAvailableWidgetTypes = (columns: any[]): WidgetTypeOption[] => {
  const caps = detectColumnCapabilities(columns);

  return [
    {
      id: 'table',
      label: 'Table',
      description: 'Show rows of data',
      available: true,
      reason: null,
      requiredCapabilities: [],
    },
    {
      id: 'bar_chart',
      label: 'Bar Chart',
      description: 'Compare values across categories',
      available: caps.hasGroupableColumn && caps.hasAggregatableColumn,
      reason: getChartReason(caps, 'bar_chart'),
      requiredCapabilities: ['groupable', 'aggregatable'],
    },
    {
      id: 'pie_chart',
      label: 'Pie Chart',
      description: 'Show distribution/breakdown',
      available: caps.hasGroupableColumn && caps.hasAggregatableColumn,
      reason: getChartReason(caps, 'pie_chart'),
      requiredCapabilities: ['groupable', 'aggregatable'],
    },
    {
      id: 'line_chart',
      label: 'Line Chart',
      description: 'Show trends over time',
      available: caps.hasDateColumn && caps.hasAggregatableColumn,
      reason: getChartReason(caps, 'line_chart'),
      requiredCapabilities: ['date', 'aggregatable'],
    },
    {
      id: 'kpi',
      label: 'KPI',
      description: 'Single aggregated number',
      available: caps.hasAggregatableColumn,
      reason: getChartReason(caps, 'kpi'),
      requiredCapabilities: ['aggregatable'],
    },
  ];
};

const getChartReason = (caps: ColumnCapabilities, chartType: string): string | null => {
  switch (chartType) {
    case 'bar_chart':
    case 'pie_chart':
      if (!caps.hasGroupableColumn && !caps.hasAggregatableColumn) {
        return 'Needs a categorical column (Mode, Status, etc.) AND a numeric column (Retail, Cost, etc.)';
      }
      if (!caps.hasGroupableColumn) {
        return `Needs a categorical column to group by. Available numeric columns: ${caps.aggregatableColumns.map(c => c.label).join(', ')}`;
      }
      if (!caps.hasAggregatableColumn) {
        return `Needs a numeric column to aggregate. Available grouping columns: ${caps.groupableColumns.map(c => c.label).join(', ')}`;
      }
      return null;

    case 'line_chart':
      if (!caps.hasDateColumn && !caps.hasAggregatableColumn) {
        return 'Needs a date column AND a numeric column';
      }
      if (!caps.hasDateColumn) {
        return 'Needs a date column (Pickup Date, Delivery Date, etc.)';
      }
      if (!caps.hasAggregatableColumn) {
        return 'Needs a numeric column to plot';
      }
      return null;

    case 'kpi':
      if (!caps.hasAggregatableColumn) {
        return 'Needs a numeric column (Retail, Cost, Miles, etc.)';
      }
      return null;

    default:
      return null;
  }
};

export const getGroupByOptions = (columns: any[]): ColumnInfo[] => {
  return detectColumnCapabilities(columns).groupableColumns;
};

export const getAggregationOptions = (columns: any[]): ColumnInfo[] => {
  return detectColumnCapabilities(columns).aggregatableColumns;
};

export const getDateOptions = (columns: any[]): ColumnInfo[] => {
  return detectColumnCapabilities(columns).dateColumns;
};

export const isColumnGroupable = (column: string): boolean => {
  const field = getFieldByColumn(column) || getFieldById(column);
  if (field) return !!field.availableForGrouping;

  const colLower = column.toLowerCase();
  const groupablePatterns = ['mode', 'status', 'carrier', 'equipment', 'type', 'state', 'city', 'category'];
  return groupablePatterns.some(p => colLower.includes(p)) || (colLower.endsWith('_id') && colLower !== 'load_id');
};

export const isColumnAggregatable = (column: string): boolean => {
  const field = getFieldByColumn(column) || getFieldById(column);
  if (field) return !!field.availableForAggregation || field.type === 'number' || field.type === 'currency';

  const colLower = column.toLowerCase();
  const aggregatablePatterns = ['retail', 'cost', 'amount', 'margin', 'miles', 'weight', 'count', 'total'];
  return aggregatablePatterns.some(p => colLower.includes(p));
};

export const getRecommendedAggregation = (column: string): 'sum' | 'avg' | 'count' | 'min' | 'max' => {
  const field = getFieldByColumn(column) || getFieldById(column);
  if (field?.defaultAggregation) return field.defaultAggregation;

  const colLower = column.toLowerCase();
  if (colLower.includes('count') || colLower.includes('quantity') || colLower.includes('pieces')) return 'sum';
  if (colLower.includes('rate') || colLower.includes('percentage') || colLower.includes('avg')) return 'avg';
  return 'sum';
};

export const getColumnType = (column: string): 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'lookup' => {
  const field = getFieldByColumn(column) || getFieldById(column);
  if (field) {
    if (field.type === 'percentage') return 'number';
    return field.type;
  }

  const colLower = column.toLowerCase();
  if (colLower.includes('date') || colLower.includes('_at')) return 'date';
  if (colLower.includes('retail') || colLower.includes('cost') || colLower.includes('margin') ||
      colLower.includes('amount') || colLower.includes('charge') || colLower.includes('fee')) return 'currency';
  if (colLower.includes('miles') || colLower.includes('weight') || colLower.includes('count') ||
      colLower.includes('quantity') || colLower.includes('pallets') || colLower.includes('feet')) return 'number';
  if (colLower.endsWith('_id') && colLower !== 'load_id') return 'lookup';
  if (colLower.startsWith('is_') || colLower.startsWith('has_')) return 'boolean';

  return 'string';
};

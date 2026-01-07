import type { WidgetData } from '../types/widget';

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'percentage';
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  metadata: {
    rowCount: number;
    generatedAt: string;
  };
}

/**
 * Transforms widget data into a format suitable for table rendering.
 * This is a pure formatting function - no data fetching.
 */
export function transformToTableFormat(widgetData: WidgetData): TableData {
  const rows = widgetData.rows ?? [];
  const now = new Date().toISOString();

  if (rows.length === 0) {
    return {
      columns: [],
      rows: [],
      metadata: { rowCount: 0, generatedAt: now },
    };
  }

  const firstRow = rows[0];
  const columns = Object.keys(firstRow).map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: inferColumnType(key, firstRow[key]),
  }));

  return {
    columns,
    rows,
    metadata: { rowCount: rows.length, generatedAt: now },
  };
}

/**
 * Converts snake_case or camelCase keys to Title Case labels
 */
function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Infers column type from key name and sample value
 */
function inferColumnType(key: string, value: unknown): TableColumn['type'] {
  const keyLower = key.toLowerCase();

  // Currency indicators
  if (
    keyLower.includes('cost') ||
    keyLower.includes('price') ||
    keyLower.includes('spend') ||
    keyLower.includes('revenue') ||
    keyLower.includes('amount') ||
    keyLower.includes('total') ||
    keyLower.includes('charge') ||
    keyLower.includes('fee')
  ) {
    return 'currency';
  }

  // Percentage indicators
  if (
    keyLower.includes('percent') ||
    keyLower.includes('rate') ||
    keyLower.includes('ratio') ||
    keyLower.includes('pct')
  ) {
    return 'percentage';
  }

  // Date indicators
  if (
    keyLower.includes('date') ||
    keyLower.includes('_at') ||
    keyLower.includes('time') ||
    keyLower.includes('created') ||
    keyLower.includes('updated')
  ) {
    return 'date';
  }

  // Type-based inference
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  
  // Check if string looks like a date
  if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
    return 'date';
  }

  return 'string';
}

/**
 * Formats a cell value based on column type for display
 */
export function formatCellValue(value: unknown, type: TableColumn['type']): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value));
      
    case 'percentage':
      const numValue = Number(value);
      // Handle both 0.15 (15%) and 15 (15%) formats
      const pctValue = numValue > 1 ? numValue : numValue * 100;
      return `${pctValue.toFixed(1)}%`;
      
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
      
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
      }
      return String(value);
      
    default:
      return String(value);
  }
}

/**
 * Export data to CSV format
 */
export function toCSV(columns: TableColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...dataRows].join('\n');
}

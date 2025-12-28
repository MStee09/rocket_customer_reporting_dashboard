import { getColumnById } from '../config/reportColumns';
import { SimpleReportColumn } from '../types/reports';

export function filterAdminOnlyColumns(columns: SimpleReportColumn[]): SimpleReportColumn[] {
  return columns.filter(column => {
    const columnDef = getColumnById(column.id);
    if (!columnDef) {
      console.warn(`Column definition not found for id: ${column.id}`);
      return true;
    }
    return !columnDef.adminOnly;
  });
}

export function filterAdminOnlyColumnIds(columnIds: string[]): string[] {
  return columnIds.filter(columnId => {
    const columnDef = getColumnById(columnId);
    if (!columnDef) {
      console.warn(`Column definition not found for id: ${columnId}`);
      return true;
    }
    return !columnDef.adminOnly;
  });
}

export function validateReportConfig(
  columns: SimpleReportColumn[],
  groupByColumns: string[],
  isCustomerReport: boolean
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isCustomerReport) {
    return { isValid: true, errors: [] };
  }

  columns.forEach(column => {
    const columnDef = getColumnById(column.id);
    if (columnDef?.adminOnly) {
      errors.push(`Admin-only column "${columnDef.label}" (${column.id}) should not be in customer reports`);
    }
  });

  groupByColumns.forEach(columnId => {
    const columnDef = getColumnById(columnId);
    if (columnDef?.adminOnly) {
      errors.push(`Admin-only column "${columnDef.label}" (${columnId}) should not be in customer report grouping`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

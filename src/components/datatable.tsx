// src/components/DataTable.tsx

import { formatCellValue, type TableColumn } from '@/utils/tableTransform';

interface DataTableProps {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
  maxHeight?: string;
}

/**
 * Generic data table component for displaying widget data.
 * Handles formatting based on column types (currency, date, etc).
 */
export function DataTable({
  columns,
  rows,
  emptyMessage = 'No data available',
  maxHeight = '600px',
}: DataTableProps) {
  // Empty state
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                    column.type === 'currency' || column.type === 'number'
                      ? 'text-right font-mono'
                      : 'text-left'
                  } text-gray-900`}
                >
                  {formatCellValue(row[column.key], column.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

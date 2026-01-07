import { formatCellValue, type TableColumn } from '../utils/tabletransform';
import { FileSpreadsheet } from 'lucide-react';

interface DataTableProps {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
  maxHeight?: string;
  stickyHeader?: boolean;
}

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No data available',
  maxHeight = '600px',
  stickyHeader = true,
}: DataTableProps) {
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-charcoal-500">
        <FileSpreadsheet className="w-12 h-12 mb-3 text-charcoal-300" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-charcoal-200 rounded-lg" style={{ maxHeight }}>
      <table className="min-w-full divide-y divide-charcoal-200">
        <thead className={`bg-charcoal-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold text-charcoal-600 uppercase tracking-wider whitespace-nowrap ${
                  column.type === 'currency' || column.type === 'number' || column.type === 'percentage'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-charcoal-100">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-charcoal-50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 whitespace-nowrap text-sm ${
                    column.type === 'currency' || column.type === 'number' || column.type === 'percentage'
                      ? 'text-right tabular-nums'
                      : 'text-left'
                  } text-charcoal-900`}
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

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { formatValue } from './colors';

export interface TableColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date' | 'string';
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface ReportTableProps {
  columns: TableColumn[];
  data: Array<Record<string, unknown>>;
  title?: string;
  maxRows?: number;
  onViewAll?: () => void;
  sortable?: boolean;
  striped?: boolean;
  compact?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function formatCellValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) return '-';

  if (format === 'date') {
    try {
      return new Date(String(value)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(value);
    }
  }

  if (format === 'currency' || format === 'number' || format === 'percent') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return String(value);
    return formatValue(num, format as 'currency' | 'number' | 'percent');
  }

  return String(value);
}

export function ReportTable({
  columns,
  data,
  title,
  maxRows,
  onViewAll,
  sortable = true,
  striped = true,
  compact = false,
}: ReportTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (!sortable) return;

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0;

    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const aNum = typeof aVal === 'number' ? aVal : parseFloat(String(aVal));
    const bNum = typeof bVal === 'number' ? bVal : parseFloat(String(bVal));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDirection === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  const displayData = maxRows ? sortedData.slice(0, maxRows) : sortedData;
  const hasMore = maxRows && data.length > maxRows;

  const containerClasses = compact
    ? 'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden'
    : 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden';
  const headerPadding = compact ? 'px-3 py-2' : 'px-5 py-4';
  const cellPadding = compact ? 'px-3 py-2' : 'px-5 py-3';
  const titleClasses = compact ? 'text-sm font-semibold text-gray-900' : 'text-lg font-semibold text-gray-900';
  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={containerClasses}>
      {title && (
        <div className={`${headerPadding} border-b border-gray-200`}>
          <h3 className={titleClasses}>{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${cellPadding} text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortable && sortKey === col.key && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                        ) : (
                          <ChevronDown className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${striped && rowIndex % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${cellPadding} ${textSize} ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${
                      col.format === 'currency' || col.format === 'number'
                        ? 'font-medium text-gray-900 tabular-nums'
                        : 'text-gray-600'
                    }`}
                  >
                    {formatCellValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className={`${cellPadding} border-t border-gray-200 bg-gray-50`}>
          <button
            onClick={onViewAll}
            className={`${textSize} text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1`}
          >
            View all {data.length} rows
            <ChevronRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        </div>
      )}
    </div>
  );
}

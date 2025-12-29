import { Table, Eye, Loader2 } from 'lucide-react';
import { TableMetadata } from '../types/database';

interface TableCardProps {
  table: TableMetadata;
  isSelected: boolean;
  onClick: () => void;
}

export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  const isView = table.type === 'view';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all
        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
        ${isSelected
          ? 'border-rocket-500 bg-rocket-50 shadow-lg'
          : 'border-slate-200 bg-white hover:border-slate-300'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`
            mt-0.5 p-2 rounded-lg shrink-0
            ${isView ? 'bg-emerald-100' : 'bg-charcoal-100'}
          `}>
            {isView ? (
              <Eye className={`w-5 h-5 ${isView ? 'text-emerald-600' : 'text-charcoal-600'}`} />
            ) : (
              <Table className={`w-5 h-5 ${isView ? 'text-emerald-600' : 'text-charcoal-600'}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 mb-1 truncate">
              {table.name}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${isView
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-charcoal-100 text-charcoal-700'
                }
              `}>
                {isView ? 'View' : 'Table'}
              </span>
              {table.isLoading ? (
                <span className="flex items-center gap-1 text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Counting...</span>
                </span>
              ) : table.rowCount !== null ? (
                <span className="text-slate-600">
                  {table.rowCount.toLocaleString()} {table.rowCount === 1 ? 'row' : 'rows'}
                </span>
              ) : (
                <span className="text-slate-400 italic">Unknown</span>
              )}
            </div>
            {table.error && (
              <p className="text-xs text-red-600 mt-1 truncate">
                {table.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

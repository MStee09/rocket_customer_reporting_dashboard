import { Search, X, Bookmark, Mail } from 'lucide-react';
import { ExportMenu } from '../ui/ExportMenu';
import { ColumnConfig } from '../../services/exportService';

interface ShipmentsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasActiveFilters: boolean;
  onSaveView: () => void;
  onEmailReport: () => void;
  exportData: Record<string, unknown>[];
  exportColumns: ColumnConfig[];
  filteredCount: number;
}

export function ShipmentsToolbar({
  searchQuery,
  onSearchChange,
  hasActiveFilters,
  onSaveView,
  onEmailReport,
  exportData,
  exportColumns,
  filteredCount,
}: ShipmentsToolbarProps) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Load ID, PRO#, Reference, City, Carrier, Company..."
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-rocket-500 focus:outline-none transition-colors"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <ExportMenu
          data={exportData}
          columns={exportColumns}
          filename="shipments"
          title="Shipment Export"
          disabled={filteredCount === 0}
        />
        <button
          onClick={onEmailReport}
          disabled={filteredCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        {hasActiveFilters && (
          <button
            onClick={onSaveView}
            className="flex items-center gap-2 px-3 py-2 text-sm text-rocket-600 hover:bg-rocket-50 rounded-lg border border-rocket-200 transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            Save View
          </button>
        )}
      </div>
    </>
  );
}

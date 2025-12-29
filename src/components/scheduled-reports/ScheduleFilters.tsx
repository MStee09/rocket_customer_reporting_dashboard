import { Filter, Search } from 'lucide-react';
import { Card } from '../ui/Card';

interface Customer {
  customer_id: number;
  company_name: string;
}

interface ScheduleFiltersProps {
  customers: Customer[];
  customerFilter: string;
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
  onCustomerFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  showCustomerFilter?: boolean;
}

export function ScheduleFilters({
  customers,
  customerFilter,
  statusFilter,
  typeFilter,
  searchQuery,
  onCustomerFilterChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onSearchQueryChange,
  onClearFilters,
  activeFiltersCount,
  showCustomerFilter = true,
}: ScheduleFiltersProps) {
  return (
    <Card variant="default" padding="md" className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-rocket-100 text-rocket-700 rounded-full text-xs font-medium">
            {activeFiltersCount} active
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {showCustomerFilter && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Customer:</label>
            <select
              value={customerFilter}
              onChange={(e) => onCustomerFilterChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
            >
              <option value="all">All Customers</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="ai_report">AI Reports</option>
            <option value="custom_report">Custom Reports</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
            />
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-rocket-600 hover:text-rocket-700"
          >
            Clear all
          </button>
        )}
      </div>
    </Card>
  );
}

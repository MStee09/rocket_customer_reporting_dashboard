import { useState } from 'react';
import { Plus, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { ColumnFilter, FilterCondition, ColumnSort } from '../../types/filters';
import { getConditionsForFieldType, getDefaultCondition, getConditionOption, FieldFilterType } from '../../config/filterConditions';
import { ReportColumn } from '../../config/reportColumns';
import FilterValueInput from './FilterValueInput';

interface ColumnFilterSectionProps {
  column: ReportColumn;
  filters: ColumnFilter[];
  sort: ColumnSort | undefined;
  onFiltersChange: (filters: ColumnFilter[]) => void;
  onSortChange: (sort: ColumnSort | undefined) => void;
}

export default function ColumnFilterSection({
  column,
  filters,
  sort,
  onFiltersChange,
  onSortChange
}: ColumnFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(filters.length > 0);

  const getFieldFilterType = (): FieldFilterType => {
    if (column.type === 'lookup') return 'lookup';
    if (column.type === 'boolean') return 'boolean';
    if (column.type === 'date') return 'date';
    if (column.type === 'number') {
      return column.format === 'currency' ? 'currency' : 'number';
    }
    return 'string';
  };

  const fieldType = getFieldFilterType();
  const conditions = getConditionsForFieldType(fieldType, column.format);

  const addFilter = () => {
    const defaultCondition = getDefaultCondition(fieldType);
    const newFilter: ColumnFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      columnId: column.id,
      condition: defaultCondition,
      value: null,
      enabled: true
    };
    onFiltersChange([...filters, newFilter]);
    setIsExpanded(true);
  };

  const updateFilter = (filterId: string, updates: Partial<ColumnFilter>) => {
    onFiltersChange(filters.map(f => f.id === filterId ? { ...f, ...updates } : f));
  };

  const removeFilter = (filterId: string) => {
    const newFilters = filters.filter(f => f.id !== filterId);
    onFiltersChange(newFilters);
    if (newFilters.length === 0) setIsExpanded(false);
  };

  const toggleFilterEnabled = (filterId: string) => {
    onFiltersChange(filters.map(f => f.id === filterId ? { ...f, enabled: !f.enabled } : f));
  };

  const cycleSortDirection = () => {
    if (!sort || sort.direction === 'none') {
      onSortChange({ columnId: column.id, direction: 'asc' });
    } else if (sort.direction === 'asc') {
      onSortChange({ columnId: column.id, direction: 'desc' });
    } else {
      onSortChange(undefined);
    }
  };

  const getSortIcon = () => {
    if (!sort || sort.direction === 'none') return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    if (sort.direction === 'asc') return <ArrowUp className="w-4 h-4 text-rocket-600" />;
    return <ArrowDown className="w-4 h-4 text-rocket-600" />;
  };

  const getSortLabel = () => {
    if (!sort || sort.direction === 'none') return 'None';
    if (sort.direction === 'asc') return 'A -> Z';
    return 'Z -> A';
  };

  const hasActiveFilters = filters.some(f => f.enabled);

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      {!isExpanded && filters.length === 0 && (
        <div className="flex items-center gap-2">
          <button onClick={addFilter} className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-rocket-600 hover:bg-rocket-50 rounded transition-colors">
            <Filter className="w-3 h-3" />
            Add Filter
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <button onClick={cycleSortDirection} className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-rocket-600 hover:bg-rocket-50 rounded transition-colors">
            {getSortIcon()}
            <span>Sort: {getSortLabel()}</span>
          </button>
        </div>
      )}

      {(isExpanded || filters.length > 0) && (
        <div className="space-y-2">
          {filters.map((filter) => {
            const conditionOption = getConditionOption(filter.condition, fieldType, column.format);

            return (
              <div key={filter.id} className={`flex items-start gap-2 p-2 rounded-lg ${filter.enabled ? 'bg-rocket-50 border border-rocket-200' : 'bg-gray-50 border border-gray-200'}`}>
                <button onClick={() => toggleFilterEnabled(filter.id)} className={`flex-shrink-0 mt-1 ${filter.enabled ? 'text-rocket-600' : 'text-gray-400'}`} title={filter.enabled ? 'Disable filter' : 'Enable filter'}>
                  {filter.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>

                <select
                  value={filter.condition}
                  onChange={(e) => {
                    const newCondition = e.target.value as FilterCondition;
                    const newConditionOption = getConditionOption(newCondition, fieldType, column.format);
                    const shouldResetValue = conditionOption?.requiresRange !== newConditionOption?.requiresRange || conditionOption?.supportsMultiple !== newConditionOption?.supportsMultiple || !newConditionOption?.requiresValue;
                    updateFilter(filter.id, { condition: newCondition, value: shouldResetValue ? null : filter.value });
                  }}
                  disabled={!filter.enabled}
                  className={`px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-rocket-500 ${filter.enabled ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 text-gray-500'}`}
                >
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>

                {conditionOption && filter.enabled && (
                  <FilterValueInput
                    column={column}
                    condition={filter.condition}
                    conditionOption={conditionOption}
                    value={filter.value}
                    onChange={(value) => updateFilter(filter.id, { value })}
                  />
                )}

                <button onClick={() => removeFilter(filter.id)} className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove filter">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-2">
            <button onClick={addFilter} className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-rocket-600 hover:bg-rocket-50 rounded transition-colors">
              <Plus className="w-3 h-3" />
              {filters.length > 0 ? 'Add Another (AND)' : 'Add Filter'}
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button onClick={cycleSortDirection} className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${sort && sort.direction !== 'none' ? 'text-rocket-600 bg-rocket-50' : 'text-gray-600 hover:text-rocket-600 hover:bg-rocket-50'}`}>
              {getSortIcon()}
              <span>Sort: {getSortLabel()}</span>
            </button>
          </div>

          {hasActiveFilters && (
            <div className="text-xs text-rocket-600 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {filters.filter(f => f.enabled).length} active filter{filters.filter(f => f.enabled).length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

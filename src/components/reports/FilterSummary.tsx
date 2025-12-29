import { Filter } from 'lucide-react';
import { ColumnFilter, DateRangeValue, NumberRangeValue } from '../../types/filters';
import { getColumnById } from '../../config/reportColumns';
import { useLookupTables } from '../../hooks/useLookupTables';
import { Card } from '../ui/Card';

interface FilterSummaryProps {
  filters: ColumnFilter[];
  compact?: boolean;
  className?: string;
}

export default function FilterSummary({ filters, compact = false, className = '' }: FilterSummaryProps) {
  const { lookups } = useLookupTables();

  const activeFilters = filters?.filter(f => f.enabled) || [];

  if (activeFilters.length === 0) return null;

  const formatFilterValue = (filter: ColumnFilter): string => {
    const column = getColumnById(filter.columnId);
    if (!column) return '';

    const condition = filter.condition;
    const value = filter.value;

    const noValueLabels: Record<string, string> = {
      'is_empty': 'is empty',
      'is_not_empty': 'is not empty',
      'is_true': 'is Yes',
      'is_false': 'is No'
    };
    if (noValueLabels[condition]) {
      return `${column.label} ${noValueLabels[condition]}`;
    }

    const datePresets: Record<string, string> = {
      'last_7_days': 'last 7 days',
      'last_30_days': 'last 30 days',
      'last_60_days': 'last 60 days',
      'last_90_days': 'last 90 days',
      'this_month': 'this month',
      'last_month': 'last month',
      'this_quarter': 'this quarter',
      'this_year': 'this year',
      'ytd': 'year to date',
      'mtd': 'month to date'
    };
    if (datePresets[condition]) {
      return `${column.label} in ${datePresets[condition]}`;
    }

    const conditionLabels: Record<string, string> = {
      'is': 'is',
      'is_not': 'is not',
      'contains': 'contains',
      'starts_with': 'starts with',
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'less_than': '<',
      'between': 'between',
      'before': 'before',
      'after': 'after',
      'is_any_of': 'is any of',
      'is_none_of': 'is none of'
    };

    let valueDisplay = '';

    if (condition === 'between' && value && typeof value === 'object') {
      if ('min' in value && 'max' in value) {
        const rangeVal = value as NumberRangeValue;
        valueDisplay = `${rangeVal.min} - ${rangeVal.max}`;
      } else if ('start' in value && 'end' in value) {
        const dateVal = value as DateRangeValue;
        valueDisplay = `${dateVal.start} to ${dateVal.end}`;
      }
    } else if (condition === 'is_any_of' || condition === 'is_none_of') {
      const values = value as number[];
      if (column.type === 'lookup' && lookups && Array.isArray(values)) {
        const labels = values.map(v => {
          if (column.lookup?.table === 'shipment_mode') return lookups.modes.get(v)?.code || String(v);
          if (column.lookup?.table === 'shipment_status') return lookups.statuses.get(v)?.code || String(v);
          if (column.lookup?.table === 'equipment_type') return lookups.equipmentTypes.get(v)?.code || String(v);
          return String(v);
        });
        valueDisplay = labels.join(', ');
      } else if (Array.isArray(values)) {
        valueDisplay = values.join(', ');
      }
    } else if (column.type === 'lookup' && lookups && typeof value === 'number') {
      if (column.lookup?.table === 'shipment_mode') {
        valueDisplay = lookups.modes.get(value)?.code || String(value);
      } else if (column.lookup?.table === 'shipment_status') {
        valueDisplay = lookups.statuses.get(value)?.code || String(value);
      } else if (column.lookup?.table === 'equipment_type') {
        valueDisplay = lookups.equipmentTypes.get(value)?.code || String(value);
      } else {
        valueDisplay = String(value);
      }
    } else {
      valueDisplay = String(value ?? '');
    }

    return `${column.label} ${conditionLabels[condition] || condition} ${valueDisplay}`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs text-rocket-600 ${className}`}>
        <Filter className="w-3 h-3" />
        <span>
          {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  return (
    <Card variant="subtle" padding="sm" className={`border-rocket-200 bg-rocket-50 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-4 h-4 text-rocket-600" />
        <span className="text-sm font-medium text-rocket-900">
          Active Filters ({activeFilters.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map(filter => (
          <span
            key={filter.id}
            className="inline-flex items-center px-2 py-1 bg-white border border-rocket-200 rounded text-xs text-rocket-800"
          >
            {formatFilterValue(filter)}
          </span>
        ))}
      </div>
    </Card>
  );
}

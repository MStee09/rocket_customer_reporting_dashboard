import { X } from 'lucide-react';
import { FilterCondition, FilterValue, DateRangeValue, NumberRangeValue } from '../../types/filters';
import { ConditionOption } from '../../config/filterConditions';
import { useLookupTables } from '../../hooks/useLookupTables';
import { ReportColumn } from '../../config/reportColumns';

interface FilterValueInputProps {
  column: ReportColumn;
  condition: FilterCondition;
  conditionOption: ConditionOption;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export default function FilterValueInput({
  column,
  conditionOption,
  value,
  onChange
}: FilterValueInputProps) {
  const { lookups } = useLookupTables();

  if (!conditionOption.requiresValue) {
    return null;
  }

  if (column.type === 'string') {
    return (
      <input
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value..."
        className="flex-1 min-w-[120px] px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  if (column.type === 'number') {
    if (conditionOption.requiresRange) {
      const rangeValue = (value as NumberRangeValue) || { min: 0, max: 0 };
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={rangeValue.min || ''}
            onChange={(e) => onChange({ ...rangeValue, min: parseFloat(e.target.value) || 0 })}
            placeholder={column.format === 'currency' ? '$0.00' : '0'}
            className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">and</span>
          <input
            type="number"
            value={rangeValue.max || ''}
            onChange={(e) => onChange({ ...rangeValue, max: parseFloat(e.target.value) || 0 })}
            placeholder={column.format === 'currency' ? '$0.00' : '0'}
            className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center">
        {column.format === 'currency' && <span className="text-sm text-gray-500 mr-1">$</span>}
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={column.format === 'currency' ? '0.00' : '0'}
          step={column.format === 'currency' ? '0.01' : '1'}
          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  if (column.type === 'date') {
    if (conditionOption.requiresRange) {
      const rangeValue = (value as DateRangeValue) || { start: '', end: '' };
      return (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={rangeValue.start || ''}
            onChange={(e) => onChange({ ...rangeValue, start: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="date"
            value={rangeValue.end || ''}
            onChange={(e) => onChange({ ...rangeValue, end: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    return (
      <input
        type="date"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  if (column.type === 'lookup' && column.lookup && lookups) {
    const getLookupOptions = () => {
      switch (column.lookup?.table) {
        case 'shipment_mode':
          return Array.from(lookups.modes.entries()).map(([id, data]) => ({ value: id, label: data.code || data.name }));
        case 'shipment_status':
          return Array.from(lookups.statuses.entries()).map(([id, data]) => ({ value: id, label: data.code || data.name }));
        case 'equipment_type':
          return Array.from(lookups.equipmentTypes.entries()).map(([id, data]) => ({ value: id, label: data.code || data.name }));
        case 'carrier':
          return Array.from(lookups.carriers.entries()).map(([id, data]) => ({ value: id, label: data.name }));
        default:
          return [];
      }
    };

    const options = getLookupOptions();

    if (conditionOption.supportsMultiple) {
      const selectedValues = (value as number[]) || [];

      const handleAdd = (optionValue: number) => {
        if (!selectedValues.includes(optionValue)) {
          onChange([...selectedValues, optionValue]);
        }
      };

      const handleRemove = (optionValue: number) => {
        onChange(selectedValues.filter(v => v !== optionValue));
      };

      const availableOptions = options.filter(opt => !selectedValues.includes(opt.value));

      return (
        <div className="flex-1 space-y-2">
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedValues.map(val => {
                const option = options.find(o => o.value === val);
                return (
                  <span key={val} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {option?.label || val}
                    <button onClick={() => handleRemove(val)} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {availableOptions.length > 0 && (
            <select
              value=""
              onChange={(e) => handleAdd(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Add a value...</option>
              {availableOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    return (
      <select
        value={(value as number) ?? ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 min-w-[120px] px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }

  return null;
}

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

export type DateRangePreset =
  | 'last30'
  | 'last90'
  | 'last6months'
  | 'lastYear'
  | 'yearToDate'
  | 'allTime'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangeSelectorProps {
  value: DateRangePreset;
  customRange?: DateRange;
  onChange: (preset: DateRangePreset, dates?: DateRange) => void;
}

const presets: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'yearToDate', label: 'YTD' },
  { value: 'allTime', label: 'All Time' },
];

export function DateRangeSelector({
  value,
  customRange,
  onChange,
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');
  const [startDate, setStartDate] = useState(
    customRange?.start?.toISOString().split('T')[0] || ''
  );
  const [endDate, setEndDate] = useState(
    customRange?.end?.toISOString().split('T')[0] || ''
  );

  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(preset);
    }
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      onChange('custom', {
        start: new Date(startDate),
        end: new Date(endDate),
      });
    }
  };

  const handleCustomClear = () => {
    setShowCustom(false);
    setStartDate('');
    setEndDate('');
    onChange('allTime');
  };

  return (
    <div data-date-filters className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              value === preset.value && !showCustom
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => handlePresetClick('custom')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            showCustom
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
          <button
            onClick={handleCustomApply}
            disabled={!startDate || !endDate}
            className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleCustomClear}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'last30':
      start.setDate(start.getDate() - 30);
      break;
    case 'last90':
      start.setDate(start.getDate() - 90);
      break;
    case 'last6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'lastYear':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'yearToDate':
      start.setMonth(0, 1);
      break;
    case 'allTime':
      start.setFullYear(2000, 0, 1);
      break;
    default:
      start.setFullYear(2000, 0, 1);
  }

  return { start, end };
}

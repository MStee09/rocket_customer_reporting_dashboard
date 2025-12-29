import { useState } from 'react';
import { Calendar, X, GitCompare } from 'lucide-react';
import { subYears } from 'date-fns';

export type DateRangePreset =
  | 'last7'
  | 'last30'
  | 'last90'
  | 'last6months'
  | 'lastYear'
  | 'yearToDate'
  | 'allTime'
  | 'thisMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export type ComparisonType = 'previous' | 'lastYear' | 'custom';

export interface ComparisonConfig {
  enabled: boolean;
  type: ComparisonType;
  customRange?: DateRange;
}

export interface DateRangeSelectorProps {
  value: DateRangePreset;
  customRange?: DateRange;
  onChange: (preset: DateRangePreset, dates?: DateRange) => void;
  showComparison?: boolean;
  comparison?: ComparisonConfig | null;
  onComparisonChange?: (comparison: ComparisonConfig | null) => void;
  compact?: boolean;
}

const presets: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'last7', label: 'Last 7 Days' },
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
  showComparison = false,
  comparison,
  onComparisonChange,
  compact = false,
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');
  const [startDate, setStartDate] = useState(
    customRange?.start?.toISOString().split('T')[0] || ''
  );
  const [endDate, setEndDate] = useState(
    customRange?.end?.toISOString().split('T')[0] || ''
  );
  const [showComparisonCustom, setShowComparisonCustom] = useState(false);
  const [comparisonStartDate, setComparisonStartDate] = useState('');
  const [comparisonEndDate, setComparisonEndDate] = useState('');

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

  const handleComparisonToggle = (enabled: boolean) => {
    if (enabled) {
      onComparisonChange?.({ enabled: true, type: 'previous' });
    } else {
      onComparisonChange?.(null);
      setShowComparisonCustom(false);
    }
  };

  const handleComparisonTypeChange = (type: ComparisonType) => {
    if (type === 'custom') {
      setShowComparisonCustom(true);
      onComparisonChange?.({
        enabled: true,
        type: 'custom',
        customRange: comparison?.customRange,
      });
    } else {
      setShowComparisonCustom(false);
      onComparisonChange?.({ enabled: true, type });
    }
  };

  const handleComparisonCustomApply = () => {
    if (comparisonStartDate && comparisonEndDate) {
      onComparisonChange?.({
        enabled: true,
        type: 'custom',
        customRange: {
          start: new Date(comparisonStartDate),
          end: new Date(comparisonEndDate),
        },
      });
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <select
          value={value}
          onChange={(e) => handlePresetClick(e.target.value as DateRangePreset)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 outline-none"
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom Range</option>
        </select>

        {showCustom && (
          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
            />
            <button
              onClick={handleCustomApply}
              disabled={!startDate || !endDate}
              className="px-3 py-1.5 text-sm font-medium bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}

        {showComparison && (
          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={comparison?.enabled || false}
                onChange={(e) => handleComparisonToggle(e.target.checked)}
                className="rounded border-gray-300 text-rocket-600 focus:ring-rocket-500"
              />
              <GitCompare className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">Compare to</span>
            </label>

            {comparison?.enabled && (
              <div className="mt-2 space-y-2">
                <select
                  value={comparison.type}
                  onChange={(e) => handleComparisonTypeChange(e.target.value as ComparisonType)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-rocket-500 outline-none"
                >
                  <option value="previous">Previous Period</option>
                  <option value="lastYear">Same Period Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                {showComparisonCustom && (
                  <div className="flex flex-col gap-2 mt-2">
                    <input
                      type="date"
                      value={comparisonStartDate}
                      onChange={(e) => setComparisonStartDate(e.target.value)}
                      placeholder="Start date"
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
                    />
                    <input
                      type="date"
                      value={comparisonEndDate}
                      onChange={(e) => setComparisonEndDate(e.target.value)}
                      placeholder="End date"
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
                    />
                    <button
                      onClick={handleComparisonCustomApply}
                      disabled={!comparisonStartDate || !comparisonEndDate}
                      className="px-3 py-1.5 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Comparison
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-date-filters className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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

      {showComparison && (
        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={comparison?.enabled || false}
              onChange={(e) => handleComparisonToggle(e.target.checked)}
              className="rounded border-gray-300 text-rocket-600 focus:ring-rocket-500"
            />
            <GitCompare className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 font-medium">Compare to</span>
          </label>

          {comparison?.enabled && (
            <div className="flex items-center gap-2">
              <select
                value={comparison.type}
                onChange={(e) => handleComparisonTypeChange(e.target.value as ComparisonType)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 outline-none"
              >
                <option value="previous">Previous Period</option>
                <option value="lastYear">Same Period Last Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {showComparisonCustom && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                  <input
                    type="date"
                    value={comparisonStartDate}
                    onChange={(e) => setComparisonStartDate(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={comparisonEndDate}
                    onChange={(e) => setComparisonEndDate(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 outline-none"
                  />
                  <button
                    onClick={handleComparisonCustomApply}
                    disabled={!comparisonStartDate || !comparisonEndDate}
                    className="px-2 py-1 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
          )}
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
    case 'last7':
      start.setDate(start.getDate() - 7);
      break;
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

export function getComparisonDates(
  currentStart: Date,
  currentEnd: Date,
  comparisonType: ComparisonType,
  customRange?: DateRange
): DateRange {
  if (comparisonType === 'custom' && customRange) {
    return customRange;
  }

  if (comparisonType === 'lastYear') {
    return {
      start: subYears(currentStart, 1),
      end: subYears(currentEnd, 1),
    };
  }

  const duration = currentEnd.getTime() - currentStart.getTime();
  const dayInMs = 86400000;

  return {
    start: new Date(currentStart.getTime() - duration - dayInMs),
    end: new Date(currentStart.getTime() - dayInMs),
  };
}

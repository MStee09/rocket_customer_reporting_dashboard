import { RefreshCw, Layout, GitCompare } from 'lucide-react';

type ComparisonType = 'previous' | 'lastYear' | 'custom';

interface ComparisonConfig {
  enabled: boolean;
  type: ComparisonType;
  customRange?: { start: Date; end: Date };
}

interface DashboardHeaderProps {
  userName: string;
  isViewingAsCustomer: boolean;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  comparison: ComparisonConfig | null;
  onComparisonChange: (comparison: ComparisonConfig | null) => void;
  showComparisonDropdown: boolean;
  onShowComparisonDropdownChange: (show: boolean) => void;
  comparisonDates: { start: string; end: string } | null;
  onRefresh: () => void;
  onCustomize: () => void;
}

export function DashboardHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange,
  comparison,
  onComparisonChange,
  showComparisonDropdown,
  onShowComparisonDropdownChange,
  comparisonDates,
  onRefresh,
  onCustomize,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-slate-600">
          {isViewingAsCustomer ? 'Viewing customer dashboard' : 'Your logistics dashboard'}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="last6months">Last 6 Months</option>
          <option value="lastyear">Last Year</option>
          <option value="thisMonth">This Month</option>
          <option value="thisQuarter">This Quarter</option>
          <option value="thisYear">This Year</option>
          <option value="next30">Next 30 Days</option>
          <option value="next90">Next 90 Days</option>
          <option value="upcoming">Upcoming (Next Year)</option>
        </select>

        <div className="relative">
          <button
            onClick={() => onShowComparisonDropdownChange(!showComparisonDropdown)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
              comparison?.enabled
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {comparison?.enabled ? (
              comparison.type === 'previous' ? 'vs Previous Period' :
              comparison.type === 'lastYear' ? 'vs Last Year' : 'vs Custom'
            ) : 'Compare'}
          </button>

          {showComparisonDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-3">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comparison?.enabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onComparisonChange({ enabled: true, type: 'previous' });
                      } else {
                        onComparisonChange(null);
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enable comparison</span>
                </label>

                {comparison?.enabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Compare to
                    </label>
                    <select
                      value={comparison.type}
                      onChange={(e) => onComparisonChange({
                        ...comparison,
                        type: e.target.value as ComparisonType
                      })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="previous">Previous Period</option>
                      <option value="lastYear">Same Period Last Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {comparison.type === 'custom' && (
                      <div className="space-y-2 pt-2">
                        <input
                          type="date"
                          value={comparison.customRange?.start?.toISOString().split('T')[0] || ''}
                          onChange={(e) => onComparisonChange({
                            ...comparison,
                            customRange: {
                              start: new Date(e.target.value),
                              end: comparison.customRange?.end || new Date()
                            }
                          })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={comparison.customRange?.end?.toISOString().split('T')[0] || ''}
                          onChange={(e) => onComparisonChange({
                            ...comparison,
                            customRange: {
                              start: comparison.customRange?.start || new Date(),
                              end: new Date(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {comparisonDates && (
                      <div className="pt-2 text-xs text-slate-500">
                        Comparing: {comparisonDates.start} to {comparisonDates.end}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => onShowComparisonDropdownChange(false)}
                  className="w-full mt-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={onCustomize}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors text-sm"
        >
          <Layout className="w-4 h-4" />
          Customize
        </button>
      </div>
    </div>
  );
}

import { ReactNode, useRef, useEffect, useState } from 'react';
import { RefreshCw, GitCompare, X } from 'lucide-react';

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
  customizeButton?: ReactNode;
  onCustomize?: () => void;
}

export function DashboardHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange,
  comparison,
  onComparisonChange,
  onShowComparisonDropdownChange,
  comparisonDates,
  onRefresh,
  customizeButton,
}: DashboardHeaderProps) {
  const [showCompareOptions, setShowCompareOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCompareActive = comparison?.enabled || false;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCompareOptions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleCompare = () => {
    if (isCompareActive) {
      onComparisonChange(null);
      onShowComparisonDropdownChange(false);
    } else {
      onComparisonChange({ enabled: true, type: 'previous' });
    }
  };

  const handleCompareTypeChange = (type: ComparisonType) => {
    onComparisonChange({ enabled: true, type });
    setShowCompareOptions(false);
  };

  const getCompareLabel = () => {
    if (!comparison?.enabled) return null;
    switch (comparison.type) {
      case 'previous': return 'vs Previous';
      case 'lastYear': return 'vs Last Year';
      default: return 'Comparing';
    }
  };

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
          className="h-10 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent text-sm bg-white"
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

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleCompare}
            onContextMenu={(e) => {
              e.preventDefault();
              if (isCompareActive) {
                setShowCompareOptions(!showCompareOptions);
              }
            }}
            className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
              isCompareActive
                ? 'bg-rocket-600 text-white hover:bg-rocket-700'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
            title={isCompareActive ? 'Click to disable - Right-click for options' : 'Enable comparison'}
          >
            <GitCompare className="w-4 h-4" />
            {isCompareActive ? (
              <>
                <span>{getCompareLabel()}</span>
                <X className="w-3.5 h-3.5 ml-1 opacity-70" />
              </>
            ) : (
              <span>Compare</span>
            )}
          </button>

          {showCompareOptions && isCompareActive && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-scale-in">
              <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Compare to
              </div>
              <button
                onClick={() => handleCompareTypeChange('previous')}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between ${
                  comparison?.type === 'previous' ? 'text-rocket-600 font-medium' : 'text-slate-700'
                }`}
              >
                Previous Period
                {comparison?.type === 'previous' && (
                  <span className="w-2 h-2 bg-rocket-600 rounded-full" />
                )}
              </button>
              <button
                onClick={() => handleCompareTypeChange('lastYear')}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between ${
                  comparison?.type === 'lastYear' ? 'text-rocket-600 font-medium' : 'text-slate-700'
                }`}
              >
                Same Period Last Year
                {comparison?.type === 'lastYear' && (
                  <span className="w-2 h-2 bg-rocket-600 rounded-full" />
                )}
              </button>
              {comparisonDates && (
                <div className="px-3 py-2 mt-1 border-t border-slate-100 text-xs text-slate-500">
                  {comparisonDates.start} - {comparisonDates.end}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          className="h-10 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {customizeButton}
      </div>
    </div>
  );
}

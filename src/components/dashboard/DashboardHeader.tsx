import { ReactNode } from 'react';

interface DashboardHeaderProps {
  userName: string;
  isViewingAsCustomer: boolean;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customizeButton?: ReactNode;
}

export function DashboardHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange,
  customizeButton,
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
          className="h-10 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent text-sm bg-white"
        >
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="thisQuarter">This Quarter</option>
          <option value="thisYear">This Year</option>
          <option value="last6months">Last 6 Months</option>
        </select>

        {customizeButton}
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import { DateRangeSelector } from './DateRangeSelector';

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
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        {customizeButton}
      </div>
    </div>
  );
}

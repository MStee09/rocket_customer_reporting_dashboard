import { useState, useRef, useEffect } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

interface PulseHeaderProps {
  userName: string;
  isViewingAsCustomer: boolean;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

export function PulseHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange
}: PulseHeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRange);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Here's your logistics pulse</span>
          {isViewingAsCustomer && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Viewing as customer
            </span>
          )}
        </p>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {currentOption?.label || 'Select Range'}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
        </button>

        {showDatePicker && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onDateRangeChange(option.value);
                  setShowDatePicker(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  option.value === dateRange
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

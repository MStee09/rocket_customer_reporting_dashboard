import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const primaryOptions = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
];

const moreOptions = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastyear', label: 'Last Year' },
  { value: 'thisMonth', label: 'This Month' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPrimarySelected = primaryOptions.some(opt => opt.value === value);
  const selectedOption = [...primaryOptions, ...moreOptions].find(opt => opt.value === value);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {primaryOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowMore(!showMore)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2
            ${!isPrimarySelected
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }
          `}
        >
          {!isPrimarySelected && selectedOption ? selectedOption.label : 'More'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>

        {showMore && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[180px] z-50">
            {moreOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setShowMore(false);
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm transition-colors
                  ${value === option.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}
                `}
              >
                {option.label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Custom Range...
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

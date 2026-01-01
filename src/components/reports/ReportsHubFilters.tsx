import { Sparkles, Calendar, Bookmark, X } from 'lucide-react';

type ReportFilter = 'all' | 'ai' | 'scheduled' | 'saved';

interface ReportsHubFiltersProps {
  activeFilter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  counts: {
    all: number;
    ai: number;
    scheduled: number;
    saved: number;
  };
}

export function ReportsHubFilters({ activeFilter, onFilterChange, counts }: ReportsHubFiltersProps) {
  const filters: { key: ReportFilter; label: string; icon?: typeof Sparkles }[] = [
    { key: 'all', label: 'All Reports' },
    { key: 'ai', label: 'AI-Generated', icon: Sparkles },
    { key: 'scheduled', label: 'Scheduled', icon: Calendar },
    { key: 'saved', label: 'Saved', icon: Bookmark },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.key;
        const Icon = filter.icon;
        const count = counts[filter.key];

        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${isActive
                ? 'bg-rocket-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{filter.label}</span>
            <span
              className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
              `}
            >
              {count}
            </span>
          </button>
        );
      })}

      {activeFilter !== 'all' && (
        <button
          onClick={() => onFilterChange('all')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Clear filter"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

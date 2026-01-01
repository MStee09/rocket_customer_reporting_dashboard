import { useState } from 'react';
import { Calendar, Database, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface WidgetContextFooterProps {
  recordCount?: number;
  dateRange?: { start: string; end: string };
  comparisonPeriod?: string;
  changePercent?: number;
  tooltip?: string;
  dataDefinition?: string;
}

export function WidgetContextFooter({
  recordCount,
  dateRange,
  comparisonPeriod,
  changePercent,
  tooltip,
  dataDefinition,
}: WidgetContextFooterProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatDateRange = (start: string, end: string) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  const hasContext = recordCount !== undefined || dateRange || tooltip || dataDefinition;

  if (!hasContext) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          {recordCount !== undefined && (
            <div className="flex items-center gap-1.5" title="Number of records in this calculation">
              <Database className="w-3 h-3" />
              <span>
                Based on <span className="font-medium text-slate-600">{recordCount.toLocaleString()}</span> shipments
              </span>
            </div>
          )}

          {dateRange && (
            <div className="flex items-center gap-1.5" title="Date range for this data">
              <Calendar className="w-3 h-3" />
              <span>{formatDateRange(dateRange.start, dateRange.end)}</span>
            </div>
          )}

          {changePercent !== undefined && comparisonPeriod && (
            <span className="text-slate-400">
              vs {comparisonPeriod}
            </span>
          )}
        </div>

        {(tooltip || dataDefinition) && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="What does this mean?"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showTooltip && (tooltip || dataDefinition) && (
              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 animate-fade-in">
                {dataDefinition && (
                  <div className="mb-2">
                    <span className="font-semibold text-slate-300">Data Definition:</span>
                    <p className="mt-1 text-slate-200">{dataDefinition}</p>
                  </div>
                )}
                {tooltip && (
                  <div>
                    <span className="font-semibold text-slate-300">How it's calculated:</span>
                    <p className="mt-1 text-slate-200">{tooltip}</p>
                  </div>
                )}
                <div className="absolute bottom-0 right-4 translate-y-full">
                  <div className="border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

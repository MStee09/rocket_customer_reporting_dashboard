import { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Calendar, Filter, Clock, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

interface QueryDetailsProps {
  dateRange?: { start: string; end: string };
  recordCount?: number;
  filters?: string[];
  generatedAt?: Date | string;
  customerId?: number;
  customerName?: string;
}

export function QueryDetailsPanel({
  dateRange,
  recordCount,
  filters,
  generatedAt,
  customerId,
  customerName,
}: QueryDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (date: Date | string) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return format(d, 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      return String(date);
    }
  };

  const copyDetails = () => {
    const details = [
      dateRange && `Date Range: ${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`,
      recordCount !== undefined && `Records: ${recordCount.toLocaleString()} shipments`,
      customerName && `Customer: ${customerName}`,
      filters?.length && `Filters: ${filters.join(', ')}`,
      generatedAt && `Generated: ${formatTimestamp(generatedAt)}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Query Details</span>
          {recordCount !== undefined && (
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
              {recordCount.toLocaleString()} records
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 bg-white">
          <div className="pt-3 space-y-3">
            {dateRange && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date Range</span>
                  <p className="text-sm text-slate-700">
                    {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
                  </p>
                </div>
              </div>
            )}

            {recordCount !== undefined && (
              <div className="flex items-start gap-3">
                <Database className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Records Matched</span>
                  <p className="text-sm text-slate-700">
                    {recordCount.toLocaleString()} shipments
                  </p>
                </div>
              </div>
            )}

            {customerName && (
              <div className="flex items-start gap-3">
                <Filter className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer Filter</span>
                  <p className="text-sm text-slate-700">{customerName}</p>
                </div>
              </div>
            )}

            {filters && filters.length > 0 && (
              <div className="flex items-start gap-3">
                <Filter className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filters Applied</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {filters.map((filter, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                      >
                        {filter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {generatedAt && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Generated</span>
                  <p className="text-sm text-slate-700">{formatTimestamp(generatedAt)}</p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={copyDetails}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

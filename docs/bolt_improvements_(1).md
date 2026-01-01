# Dashboard Improvements: Widget Context, AI Transparency & Reports Hub

## Overview

This implementation adds three key improvements based on UX evaluation:

1. **Widget Context Footer** - Shows record count, date range, and tooltips on all widgets
2. **AI Query Transparency** - Shows query parameters after AI-generated reports
3. **Reports Hub Consolidation** - Single list with filter chips instead of 3 tabs

---

## Phase 1: Widget Context Footer Component

### Create new file: `src/components/dashboard/WidgetContextFooter.tsx`

```tsx
import { useState } from 'react';
import { Info, Calendar, Database, HelpCircle } from 'lucide-react';
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
```

---

## Phase 2: Update Widget Data Return Types

### Update file: `src/config/widgets/widgetTypes.ts`

Add these fields to the widget result type:

```tsx
// Add to existing WidgetResult interface or create if not exists
export interface WidgetResultMetadata {
  recordCount?: number;
  dateRange?: { start: string; end: string };
  comparisonPeriod?: string;
  changePercent?: number;
}

export interface KPIWidgetResult {
  type: 'kpi';
  value: number | string;
  label: string;
  format?: 'number' | 'currency' | 'percent';
  trend?: {
    value: number;
    positive: boolean;
  };
  // NEW: Add metadata
  metadata?: WidgetResultMetadata;
}
```

---

## Phase 3: Update Customer Widgets to Return Context

### Update file: `src/config/widgets/customerWidgets.ts`

Update the `total_cost` widget (and similar widgets) to return metadata:

```tsx
total_cost: {
  id: 'total_cost',
  name: 'Total Spend',
  description: 'Total freight spend in the selected period',
  type: 'featured_kpi',
  category: 'financial',
  access: 'customer',
  defaultSize: 'small',
  icon: 'DollarSign',
  iconColor: 'bg-blue-500',
  gradient: 'from-blue-600 to-blue-700',
  // NEW: Add data definition for tooltip
  dataDefinition: 'Sum of all shipment retail (billed) amounts',
  tooltip: 'Total Spend = Sum of retail field for all shipments in date range',
  whatItShows: {
    summary: 'Shows your total freight spending across all shipments in the selected date range.',
    columns: [
      { name: 'Total Spend', description: 'Sum of all shipment costs (currency)' },
    ],
    filters: [
      'Your shipments only',
      'Within selected date range',
    ],
    updateBehavior: 'live',
  },
  calculate: async ({ supabase, customerId, dateRange }) => {
    const query = supabase
      .from('shipment')
      .select('retail')
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    if (customerId) {
      query.eq('customer_id', customerId);
    }

    const { data } = await query;
    const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
    const recordCount = data?.length || 0;

    return {
      type: 'kpi',
      value: total,
      label: 'Total Spend',
      format: 'currency',
      // NEW: Return metadata
      metadata: {
        recordCount,
        dateRange: { start: dateRange.start, end: dateRange.end },
      },
    };
  },
},

avg_cost_shipment: {
  id: 'avg_cost_shipment',
  name: 'Avg Cost Per Shipment',
  description: 'Average cost per shipment',
  type: 'featured_kpi',
  category: 'financial',
  access: 'customer',
  defaultSize: 'small',
  icon: 'TrendingUp',
  iconColor: 'bg-emerald-500',
  gradient: 'from-emerald-600 to-emerald-700',
  // NEW: Add data definition
  dataDefinition: 'Average retail (billed) amount per shipment',
  tooltip: 'Avg Cost = Total Spend ÷ Number of Shipments',
  whatItShows: {
    summary: 'Shows the average cost you pay per shipment, calculated by dividing total spend by shipment count.',
    columns: [
      { name: 'Average Cost', description: 'Total cost ÷ number of shipments' },
    ],
    filters: [
      'Your shipments only',
      'Within selected date range',
    ],
    updateBehavior: 'live',
  },
  calculate: async ({ supabase, customerId, dateRange }) => {
    const query = supabase
      .from('shipment')
      .select('retail')
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    if (customerId) {
      query.eq('customer_id', customerId);
    }

    const { data } = await query;
    const total = data?.reduce((sum, s) => sum + (s.retail || 0), 0) || 0;
    const recordCount = data?.length || 0;
    const avg = recordCount > 0 ? total / recordCount : 0;

    return {
      type: 'kpi',
      value: avg,
      label: 'Avg/Shipment',
      format: 'currency',
      // NEW: Return metadata
      metadata: {
        recordCount,
        dateRange: { start: dateRange.start, end: dateRange.end },
      },
    };
  },
},

total_shipments: {
  id: 'total_shipments',
  name: 'Total Shipments',
  description: 'Total number of shipments in the selected period',
  type: 'kpi',
  category: 'volume',
  access: 'customer',
  defaultSize: 'small',
  icon: 'Package',
  iconColor: 'bg-blue-500',
  dataDefinition: 'Count of all shipments with pickup date in range',
  tooltip: 'Counts shipments where pickup_date falls within the selected date range',
  whatItShows: {
    summary: 'Shows the total count of all your shipments within the selected date range.',
    columns: [
      { name: 'Total Count', description: 'Number of shipments' },
    ],
    filters: [
      'Your shipments only',
      'Within selected date range',
    ],
    updateBehavior: 'live',
  },
  calculate: async ({ supabase, customerId, dateRange }) => {
    const query = supabase
      .from('shipment')
      .select('shipment_id', { count: 'exact', head: true })
      .gte('pickup_date', dateRange.start)
      .lte('pickup_date', dateRange.end);

    if (customerId) {
      query.eq('customer_id', customerId);
    }

    const { count } = await query;

    return {
      type: 'kpi',
      value: count || 0,
      label: 'Shipments',
      format: 'number',
      metadata: {
        recordCount: count || 0,
        dateRange: { start: dateRange.start, end: dateRange.end },
      },
    };
  },
},
```

---

## Phase 4: Update DashboardWidgetCard to Show Context Footer

### Update file: `src/components/DashboardWidgetCard.tsx`

Add the import and render the footer:

```tsx
// Add import at top
import { WidgetContextFooter } from './dashboard/WidgetContextFooter';

// Inside the component, after the content rendering and before the closing div:

// Find the return statement and add the footer inside the card:
return (
  <div className={`bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col relative ${getWidgetMinHeight()}`}>
    {/* ... existing header ... */}
    
    <div className={`${widget.type === 'map' ? '' : 'p-4'} flex-1 flex flex-col`}>
      <div className="flex-1">
        <WidgetErrorBoundary widgetName={widget.name}>
          {renderContent()}
        </WidgetErrorBoundary>
      </div>
      
      {/* NEW: Add context footer for KPI widgets */}
      {data && (data.type === 'kpi' || widget.type === 'kpi' || widget.type === 'featured_kpi') && (
        <WidgetContextFooter
          recordCount={data.metadata?.recordCount}
          dateRange={data.metadata?.dateRange || { start: dateRange.start, end: dateRange.end }}
          tooltip={widget.tooltip}
          dataDefinition={widget.dataDefinition}
        />
      )}
    </div>
  </div>
);
```

---

## Phase 5: AI Query Transparency Component

### Create new file: `src/components/ai-studio/QueryDetailsPanel.tsx`

```tsx
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
```

---

## Phase 6: Integrate Query Details into AI Report Studio

### Update file: `src/pages/AIReportStudioPage.tsx`

Add the QueryDetailsPanel after a report is generated:

```tsx
// Add import at top
import { QueryDetailsPanel } from '../components/ai-studio/QueryDetailsPanel';

// Inside the report preview section, after the report renders:
// Find where the report is displayed and add:

{currentReport && executedData && (
  <QueryDetailsPanel
    dateRange={{
      start: /* get from current date selection */,
      end: /* get from current date selection */,
    }}
    recordCount={executedData.totalRecords || executedData.sections?.reduce((sum, s) => sum + (s.data?.length || 0), 0)}
    generatedAt={new Date()}
    customerName={effectiveCustomerName}
    filters={currentReport.filters?.map(f => `${f.field}: ${f.value}`)}
  />
)}
```

---

## Phase 7: Reports Hub Consolidation

### Create new file: `src/components/reports/ReportsHubFilters.tsx`

```tsx
import { useState } from 'react';
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
```

### Create new file: `src/components/reports/UnifiedReportsList.tsx`

```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Calendar, Clock, MoreHorizontal, Trash2, 
  Play, Edit, ExternalLink, FileText 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ReportsHubFilters } from './ReportsHubFilters';

interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'ai' | 'custom' | 'scheduled';
  isScheduled: boolean;
  scheduleFrequency?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UnifiedReportsListProps {
  reports: Report[];
  onDelete: (id: string) => void;
  onRunNow?: (id: string) => void;
}

export function UnifiedReportsList({ reports, onDelete, onRunNow }: UnifiedReportsListProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'scheduled' | 'saved'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: reports.length,
    ai: reports.filter(r => r.type === 'ai').length,
    scheduled: reports.filter(r => r.isScheduled).length,
    saved: reports.filter(r => !r.isScheduled).length,
  }), [reports]);

  const filteredReports = useMemo(() => {
    switch (activeFilter) {
      case 'ai':
        return reports.filter(r => r.type === 'ai');
      case 'scheduled':
        return reports.filter(r => r.isScheduled);
      case 'saved':
        return reports.filter(r => !r.isScheduled);
      default:
        return reports;
    }
  }, [reports, activeFilter]);

  const getReportIcon = (report: Report) => {
    if (report.type === 'ai') return Sparkles;
    if (report.isScheduled) return Calendar;
    return FileText;
  };

  const getReportBadges = (report: Report) => {
    const badges = [];
    if (report.type === 'ai') {
      badges.push({ label: 'AI', className: 'bg-purple-100 text-purple-700' });
    }
    if (report.isScheduled) {
      badges.push({ label: report.scheduleFrequency || 'Scheduled', className: 'bg-blue-100 text-blue-700' });
    }
    return badges;
  };

  return (
    <div className="space-y-6">
      <ReportsHubFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No reports found</h3>
          <p className="text-slate-500">
            {activeFilter === 'all'
              ? 'Create your first report using AI or the report builder'
              : `No ${activeFilter} reports yet`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredReports.map((report) => {
            const Icon = getReportIcon(report);
            const badges = getReportBadges(report);

            return (
              <div
                key={report.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => navigate(report.type === 'ai' ? `/ai-studio?report=${report.id}` : `/custom-reports/${report.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${report.type === 'ai' ? 'bg-purple-100' : report.isScheduled ? 'bg-blue-100' : 'bg-slate-100'}
                  `}>
                    <Icon className={`w-5 h-5 ${report.type === 'ai' ? 'text-purple-600' : report.isScheduled ? 'text-blue-600' : 'text-slate-600'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate group-hover:text-rocket-600 transition-colors">
                        {report.name}
                      </h3>
                      {badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    {report.description && (
                      <p className="text-sm text-slate-500 truncate mb-2">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDistanceToNow(new Date(report.updatedAt || report.createdAt), { addSuffix: true })}
                      </span>
                      {report.isScheduled && report.nextRun && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Calendar className="w-3 h-3" />
                          Next: {format(new Date(report.nextRun), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === report.id ? null : report.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {openMenuId === report.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(report.type === 'ai' ? `/ai-studio?report=${report.id}` : `/custom-reports/${report.id}`);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </button>
                        {report.isScheduled && onRunNow && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRunNow(report.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Run Now
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(report.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 8: Update Exports

### Update file: `src/components/dashboard/index.ts`

```tsx
// Add to existing exports
export { WidgetContextFooter } from './WidgetContextFooter';
```

### Update file: `src/components/ai-studio/index.ts`

```tsx
// Add to existing exports
export { QueryDetailsPanel } from './QueryDetailsPanel';
```

### Create file: `src/components/reports/index.ts` (if not exists)

```tsx
export { ReportsHubFilters } from './ReportsHubFilters';
export { UnifiedReportsList } from './UnifiedReportsList';
```

---

## Summary of Changes

1. **WidgetContextFooter** - Shows record count, date range, and help tooltips on all widgets
2. **Widget Metadata** - Updated widget calculate functions to return `metadata` object with `recordCount` and `dateRange`
3. **Data Definitions** - Added `dataDefinition` and `tooltip` fields to widget configs (e.g., "Total Spend = Sum of retail (billed) amounts")
4. **QueryDetailsPanel** - Collapsible panel showing query parameters after AI report generation
5. **ReportsHubFilters** - Filter chips (All | AI-Generated | Scheduled | Saved) replacing 3-tab structure
6. **UnifiedReportsList** - Single list view with inline badges indicating report type/schedule

## Implementation Order

1. Create `WidgetContextFooter.tsx`
2. Update `widgetTypes.ts` with metadata interface
3. Update `customerWidgets.ts` with metadata returns and definitions
4. Update `DashboardWidgetCard.tsx` to render footer
5. Create `QueryDetailsPanel.tsx`
6. Integrate into `AIReportStudioPage.tsx`
7. Create `ReportsHubFilters.tsx` and `UnifiedReportsList.tsx`
8. Update exports

This gives you everything needed for:
- Widget context (record count, date range, tooltips)
- AI transparency (collapsible query details)
- Reports Hub consolidation (unified list with filters)

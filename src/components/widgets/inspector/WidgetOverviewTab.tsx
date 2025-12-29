import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Lock,
  RefreshCw,
  Eye,
  Filter,
  ArrowUpDown,
  Hash,
  Info,
  Globe,
  Camera,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { isSystemWidget } from '../../../config/widgets';
import { saveCustomWidget } from '../../../config/widgets/customWidgetStorage';
import { supabase } from '../../../lib/supabase';
import { executeSimpleReport } from '../../../utils/simpleQueryBuilder';
import { WidgetData } from '../../../config/widgets/widgetTypes';
import { formatWidgetLabel } from '../../../utils/dateUtils';

interface WidgetOverviewTabProps {
  widget: any;
  isAdmin: boolean;
  customerId?: number;
  onWidgetUpdated?: (widget: any) => void;
}

export const WidgetOverviewTab = ({ widget, isAdmin, customerId, onWidgetUpdated }: WidgetOverviewTabProps) => {
  const navigate = useNavigate();
  const isSystem = isSystemWidget(widget.id);
  const isCustom = !isSystem;
  const source = isSystem ? 'system' : (widget.source || 'custom');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [reportExists, setReportExists] = useState<boolean | null>(null);
  const [checkingReport, setCheckingReport] = useState(false);

  const whatItShows = widget.whatItShows || generateWhatItShows(widget);
  const dataMode = widget.dataMode || 'dynamic';

  const sourceReport = widget.sourceReport;
  const hasSourceReport = !!sourceReport?.id;

  useEffect(() => {
    const checkReportExists = async () => {
      if (!hasSourceReport || !customerId) {
        setReportExists(null);
        return;
      }

      setCheckingReport(true);
      try {
        const reportPath = sourceReport.path || `customer/${customerId}/${sourceReport.id}.json`;
        const { data, error } = await supabase.storage
          .from('customer-reports')
          .download(reportPath);

        setReportExists(!error && !!data);
      } catch {
        setReportExists(false);
      } finally {
        setCheckingReport(false);
      }
    };

    checkReportExists();
  }, [hasSourceReport, sourceReport, customerId]);

  const handleViewReport = () => {
    if (sourceReport?.id) {
      navigate(`/custom-reports/${sourceReport.id}`);
    }
  };

  const handleRefreshSnapshot = async () => {
    if (!customerId) return;

    setRefreshing(true);
    setRefreshError(null);

    try {
      const reportConfig = {
        id: widget.dataSource?.reportReference?.reportId || 'custom',
        name: widget.dataSource?.reportReference?.reportName || 'Custom',
        columns: widget.dataSource?.reportColumns || [],
        filters: widget.dataSource?.query?.reportFilters || [],
      };

      const rawData = await executeSimpleReport(reportConfig, String(customerId));
      const snapshotData = transformRawDataForWidget(rawData, widget);
      const snapshotDate = new Date().toISOString();

      const updatedWidget = {
        ...widget,
        snapshotData,
        snapshotDate,
        updatedAt: snapshotDate,
        version: (widget.version || 1) + 1,
      };

      const result = await saveCustomWidget(supabase, updatedWidget, customerId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save updated snapshot');
      }

      if (onWidgetUpdated) {
        onWidgetUpdated(updatedWidget);
      }
    } catch (err) {
      console.error('Failed to refresh snapshot:', err);
      setRefreshError(String(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="p-5 bg-rocket-50 border border-rocket-200 rounded-xl">
        <h3 className="text-sm font-semibold text-rocket-900 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          What This Widget Shows
        </h3>

        <p className="text-sm text-rocket-800 mb-4">{whatItShows.summary}</p>

        {whatItShows.columns && whatItShows.columns.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-rocket-700 uppercase tracking-wide mb-2">
              Data Displayed
            </h4>
            <ul className="space-y-1.5">
              {whatItShows.columns.map((col, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-rocket-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-rocket-900">{col.name}</span>
                    <span className="text-rocket-700"> — {col.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {whatItShows.filters && whatItShows.filters.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-rocket-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filters Applied
            </h4>
            <ul className="space-y-1">
              {whatItShows.filters.map((filter, i) => (
                <li key={i} className="text-sm text-rocket-800 flex items-center gap-2">
                  <span className="w-1 h-1 bg-rocket-400 rounded-full" />
                  {filter}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(whatItShows.sortedBy || whatItShows.limit) && (
          <div className="flex flex-wrap gap-4 mb-4">
            {whatItShows.sortedBy && (
              <div className="text-sm flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-rocket-700" />
                <span className="text-rocket-700">Sorted by:</span>
                <span className="text-rocket-900 font-medium">{whatItShows.sortedBy}</span>
              </div>
            )}
            {whatItShows.limit && (
              <div className="text-sm flex items-center gap-1">
                <Hash className="w-3 h-3 text-rocket-700" />
                <span className="text-rocket-700">Limit:</span>
                <span className="text-rocket-900 font-medium">{whatItShows.limit}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-rocket-200 space-y-2">
          <div className="flex items-center gap-2">
            {dataMode === 'static' ? (
              <>
                <Camera className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-rocket-800">
                  Snapshot from {widget.snapshotDate ? formatDate(widget.snapshotDate) : 'creation time'}
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-green-600" />
                <span className="text-sm text-rocket-800">
                  Updates automatically with new data
                </span>
              </>
            )}
          </div>

          {dataMode === 'static' && isCustom && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshSnapshot}
                disabled={refreshing}
                className="px-3 py-1.5 text-sm bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Refresh Snapshot
                  </>
                )}
              </button>
              {refreshError && (
                <span className="text-xs text-red-600">{refreshError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {hasSourceReport && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Source Report</p>
                <p className="text-sm text-slate-600">{sourceReport.name}</p>
              </div>
            </div>
            <div>
              {checkingReport ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </div>
              ) : reportExists === false ? (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  Report no longer available
                </div>
              ) : (
                <button
                  onClick={handleViewReport}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isSystem && isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">System Widget</p>
              <p className="text-sm text-amber-700 mt-1">
                This widget is defined in code and cannot be edited through the UI.
                To modify it, update the source file and redeploy.
              </p>
              <p className="text-xs text-amber-600 mt-2 font-mono bg-amber-100 px-2 py-1 rounded inline-block">
                /src/config/widgets/{widget.access === 'admin' ? 'adminWidgets' : 'customerWidgets'}.ts
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          Technical Details
        </h3>
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
          <InfoRow label="Widget ID" value={widget.id} mono />
          <InfoRow label="Type" value={formatType(widget.type)} />
          <InfoRow label="Category" value={formatCategory(widget.category)} />
          <InfoRow label="Default Size" value={formatSize(widget.defaultSize || widget.display?.defaultSize)} />
          <InfoRow label="Source" value={formatSource(source)} />
          <InfoRow label="Access Level" value={widget.access === 'admin' ? 'Admin Only' : 'All Customers'} />
        </div>
      </div>

      {isCustom && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Creation Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
              <InfoRow label="Created By" value={widget.createdBy?.userEmail || 'Unknown'} />
              <InfoRow label="Created At" value={formatDate(widget.createdAt)} />
              <InfoRow label="Version" value={`v${widget.version || 1}`} />
              <InfoRow label="Last Updated" value={formatDate(widget.updatedAt)} />
              {widget.source === 'report' && widget.dataSource?.reportReference && (
                <InfoRow
                  label="Source Report"
                  value={widget.dataSource.reportReference.reportName}
                />
              )}
              {widget.source === 'promoted' && widget.visibility?.promotedFrom && (
                <>
                  <InfoRow label="Promoted By" value={widget.visibility.promotedFrom.promotedByEmail} />
                  <InfoRow label="Original Creator" value={widget.visibility.promotedFrom.originalCreatorEmail} />
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Visibility & Access</h3>
            <VisibilityInfo visibility={widget.visibility} />
          </div>
        </>
      )}

      {widget.source === 'ai' && widget.dataSource?.aiGenerated && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Generation</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600">Original Prompt</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 italic border border-slate-200">
                "{widget.dataSource.aiGenerated.originalPrompt}"
              </div>
            </div>
            <div className="flex items-center gap-2">
              {widget.dataSource.aiGenerated.validatedBy ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Validated by {widget.dataSource.aiGenerated.validatedBy}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Pending Validation
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const generateWhatItShows = (widget: any) => {
  const whatItShows: any = {
    summary: widget.description || 'Custom widget',
    columns: [],
    filters: [],
    updateBehavior: 'live',
  };

  const query = widget.dataSource?.query;

  if (query) {
    if (query.columns) {
      whatItShows.columns = query.columns.map((col: any) => ({
        name: col.alias || col.field,
        description: col.aggregate
          ? `${col.aggregate.toUpperCase()} of ${col.field}`
          : `${col.field} value`,
      }));
    }

    if (query.filters) {
      whatItShows.filters = query.filters.map((f: any) => {
        if (f.isDynamic) {
          if (f.field === 'customer_id') return 'Your data only';
          if (f.field.includes('date')) return 'Within selected date range';
          return `Filtered by ${f.field}`;
        }
        return `${f.field} ${f.operator} ${f.value}`;
      });
    }

    if (query.orderBy && query.orderBy.length > 0) {
      const order = query.orderBy[0];
      whatItShows.sortedBy = `${order.field} (${order.direction === 'desc' ? 'highest first' : 'lowest first'})`;
    }

    if (query.limit) {
      whatItShows.limit = `${query.limit} rows`;
    }
  }

  if (widget.source === 'report') {
    whatItShows.summary = `Custom widget created from report: ${widget.dataSource?.reportReference?.reportName || 'Unknown'}. ${widget.description || ''}`;
  }

  if (widget.source === 'ai') {
    whatItShows.summary = `AI-generated widget. ${widget.description || ''}`;
  }

  if (whatItShows.filters.length === 0) {
    whatItShows.filters = ['Your data only'];
  }

  return whatItShows;
};

const InfoRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
    <dd className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200' : ''}`}>
      {value || 'N/A'}
    </dd>
  </div>
);

const VisibilityInfo = ({ visibility }: { visibility: any }) => {
  if (!visibility || visibility.type === 'system') {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <Globe className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-green-800">System Widget</p>
          <p className="text-sm text-green-700">Available to all users</p>
        </div>
      </div>
    );
  }

  if (visibility.type === 'private') {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-slate-800">Private</p>
          <p className="text-sm text-slate-600">Only visible to the creator</p>
        </div>
      </div>
    );
  }

  return null;
};

const formatType = (type: string) => {
  if (!type) return 'Unknown';
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatCategory = (cat: string) => {
  const labels: Record<string, string> = {
    volume: 'Volume & Activity',
    financial: 'Financial',
    geographic: 'Geographic',
    performance: 'Performance',
    breakdown: 'Breakdown & Mix',
    customers: 'Customer Overview',
  };
  return labels[cat] || cat || 'Unknown';
};

const formatSize = (size: string) => {
  const labels: Record<string, string> = {
    small: 'Small (1 column)',
    medium: 'Medium (1 column)',
    wide: 'Wide (2 columns)',
    full: 'Full Width (3 columns)',
  };
  return labels[size] || size || 'Auto';
};

const formatSource = (source: string) => {
  const labels: Record<string, string> = {
    system: '🔒 System (code-defined)',
    ai: '🤖 AI Generated',
    report: '📊 From Report',
    manual: '🔧 Manual',
    promoted: '📤 Promoted from Customer',
  };
  return labels[source] || source;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Unknown';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

function transformRawDataForWidget(rawData: any[], widget: any): WidgetData {
  const query = widget.dataSource?.query;
  const viz = widget.visualization;
  const widgetType = widget.type;

  switch (widgetType) {
    case 'table': {
      const columns = viz?.columns || query?.columns?.map((c: any) => ({ field: c.field, label: c.field })) || [];
      const limit = query?.limit || 10;
      const tableData = rawData.slice(0, limit);
      return { type: 'table', data: tableData, columns };
    }

    case 'bar_chart':
    case 'pie_chart': {
      const groupField = viz?.categoryField || viz?.xAxis || query?.groupBy?.[0] || '';
      const valueField = viz?.valueField || query?.columns?.find((c: any) => c.aggregate)?.field || '';
      const aggregation = query?.columns?.find((c: any) => c.aggregate)?.aggregate || 'count';

      const grouped = new Map<string, number>();
      for (const row of rawData) {
        const key = String(row[groupField] ?? 'Unknown');
        const currentVal = grouped.get(key) || 0;
        if (aggregation === 'count') {
          grouped.set(key, currentVal + 1);
        } else if (aggregation === 'sum') {
          grouped.set(key, currentVal + (Number(row[valueField]) || 0));
        }
      }

      const chartData = Array.from(grouped.entries())
        .map(([name, value]) => ({ name: formatWidgetLabel(name), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return { type: 'chart', data: chartData };
    }

    case 'line_chart': {
      const xField = viz?.xAxis || query?.groupBy?.[0] || '';
      const valueField = viz?.valueField || query?.columns?.find((c: any) => c.aggregate)?.field || '';
      const aggregation = query?.columns?.find((c: any) => c.aggregate)?.aggregate || 'count';

      const grouped = new Map<string, { sum: number; count: number }>();
      for (const row of rawData) {
        const key = String(row[xField] ?? '');
        if (!key) continue;
        const current = grouped.get(key) || { sum: 0, count: 0 };
        current.count += 1;
        current.sum += Number(row[valueField]) || 0;
        grouped.set(key, current);
      }

      const chartData = Array.from(grouped.entries())
        .map(([name, { sum, count }]) => ({
          name: formatWidgetLabel(name),
          value: aggregation === 'count' ? count : Math.round(sum * 100) / 100,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { type: 'chart', data: chartData };
    }

    case 'kpi':
    case 'featured_kpi': {
      const valueField = viz?.valueField || query?.columns?.[0]?.field || '';
      const aggregation = query?.columns?.[0]?.aggregate || 'count';

      let value = 0;
      if (aggregation === 'count') {
        value = rawData.length;
      } else if (aggregation === 'sum') {
        value = rawData.reduce((acc, row) => acc + (Number(row[valueField]) || 0), 0);
      } else if (aggregation === 'avg') {
        const sum = rawData.reduce((acc, row) => acc + (Number(row[valueField]) || 0), 0);
        value = rawData.length > 0 ? sum / rawData.length : 0;
      }

      return {
        type: 'kpi',
        value: Math.round(value * 100) / 100,
        label: widget.name || 'Value',
        format: viz?.format || 'number',
      };
    }

    default:
      return { type: 'chart', data: [] };
  }
}

export default WidgetOverviewTab;

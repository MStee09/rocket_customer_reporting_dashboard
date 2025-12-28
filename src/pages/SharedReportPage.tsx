import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Eye } from 'lucide-react';
import { ReportRenderer } from '../components/reports/studio';
import { supabase } from '../lib/supabase';
import { AIReportDefinition, ExecutedReportData } from '../types/aiReport';
import { executeReportData } from '../services/reportDataExecutor';

interface SharedReport {
  id: string;
  share_token: string;
  customer_id: number;
  report_id: string;
  report_name: string;
  report_definition: AIReportDefinition | any;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  date_range_start: string;
  date_range_end: string;
}

function extractDefinition(reportDef: any): AIReportDefinition | null {
  if (!reportDef) return null;

  if (reportDef.type === 'custom_report' || reportDef.simpleReport) {
    return reportDef;
  }

  let extracted: AIReportDefinition | null = null;

  if (reportDef.definition?.sections) {
    extracted = reportDef.definition as AIReportDefinition;
  } else if (reportDef.sections) {
    extracted = reportDef as AIReportDefinition;
  }

  if (!extracted) return null;

  if (!extracted.dateRange) {
    console.warn('Report definition missing dateRange, using default');
    extracted = {
      ...extracted,
      dateRange: { type: 'last90' as const },
    };
  }

  return extracted;
}

function formatCellValue(value: any, columnId: string, columnLabel: string): string {
  if (value === null || value === undefined) return '-';

  const label = columnLabel?.toLowerCase() || '';
  const id = columnId?.toLowerCase() || '';

  if (label.includes('id') || label === 'load id' || id.includes('_id')) {
    return String(value);
  }

  if (label === 'mode' || id === 'mode_id') {
    const modeMap: Record<number, string> = { 1: 'Parcel', 2: 'LTL', 3: 'FTL', 4: 'Truckload' };
    if (typeof value === 'number' && modeMap[value]) {
      return modeMap[value];
    }
    return String(value);
  }

  if (label.includes('retail') || label.includes('cost') || label.includes('spend') ||
      label.includes('price') || label.includes('charge') || label.includes('amount') ||
      id.includes('retail') || id.includes('cost')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  return String(value);
}

export function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSharedReport = useCallback(async () => {
    if (!token) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('shared_reports')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Report not found');
        setIsLoading(false);
        return;
      }

      if (!data.is_active) {
        setError('This report link has been deactivated');
        setIsLoading(false);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This report link has expired');
        setIsLoading(false);
        return;
      }

      console.log('Raw report_definition:', data.report_definition);
      const definition = extractDefinition(data.report_definition);
      console.log('Extracted definition:', definition);

      if (!definition) {
        setError('Invalid report structure');
        setIsLoading(false);
        return;
      }

      setReport(data as SharedReport);

      await supabase
        .from('shared_reports')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);
    } catch (err) {
      console.error('Failed to load shared report:', err);
      setError('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const executeReport = useCallback(async () => {
    if (!report) return;

    const definition = extractDefinition(report.report_definition);
    if (!definition) {
      setError('Invalid report definition');
      return;
    }

    console.log('=== Executing SharedReport ===');
    console.log('Definition:', definition);
    console.log('Sections:', definition.sections);
    console.log('DateRange:', definition.dateRange);

    if (!definition.sections || definition.sections.length === 0) {
      console.warn('Report has no sections');
      setExecutedData({
        sections: [],
        executedAt: new Date().toISOString(),
        dateRange: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      });
      return;
    }

    const definitionWithDefaults = {
      ...definition,
      dateRange: definition.dateRange || { type: 'last90' as const },
    };

    setIsExecuting(true);

    try {
      const data = await executeReportData(
        supabase,
        definitionWithDefaults,
        String(report.customer_id),
        false
      );
      setExecutedData(data);
    } catch (err) {
      console.error('Failed to execute report:', err);
      setError('Failed to load report data');
    } finally {
      setIsExecuting(false);
    }
  }, [report]);

  useEffect(() => {
    loadSharedReport();
  }, [loadSharedReport]);

  useEffect(() => {
    if (report) {
      executeReport();
    }
  }, [report, executeReport]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Report not found'}
          </h2>
          <p className="text-gray-500 mb-6">
            This report link is invalid, expired, or has been deactivated.
          </p>
          <div className="text-sm text-gray-400 border-t pt-4">
            Powered by Go Rocket Shipping
          </div>
        </div>
      </div>
    );
  }

  const isCustomReport = report.report_definition?.type === 'custom_report' || report.report_definition?.simpleReport;

  if (isCustomReport) {
    const columns = report.report_definition.simpleReport?.columns || [];
    const data = report.report_definition.queryResults || [];

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  {report.report_name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(report.date_range_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} - {new Date(report.date_range_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-1">{data.length} records</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                <Eye className="w-4 h-4" />
                <span>{report.view_count + 1} views</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {data.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No data available for this date range
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {columns.map((col: any) => (
                          <th
                            key={col.id}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.map((row: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {columns.map((col: any) => (
                            <td
                              key={col.id || col.label}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {formatCellValue(row[col.label], col.id, col.label)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-center text-sm text-gray-500">
              Powered by Go Rocket Shipping
            </p>
          </div>
        </footer>
      </div>
    );
  }

  const definition = extractDefinition(report.report_definition);

  if (!definition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Report Structure
          </h2>
          <p className="text-gray-500 mb-6">
            This report has an invalid structure and cannot be displayed.
          </p>
          <div className="text-sm text-gray-400 border-t pt-4">
            Powered by Go Rocket Shipping
          </div>
        </div>
      </div>
    );
  }

  const definitionWithDefaults: AIReportDefinition = {
    ...definition,
    dateRange: definition.dateRange || { type: 'last90' as const },
  };

  const dateRangeText = definitionWithDefaults.dateRange.type
    ? `${definitionWithDefaults.dateRange.type.replace('_', ' ').toUpperCase()}`
    : 'LAST 90 DAYS';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {report.report_name}
              </h1>
              {definitionWithDefaults.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {definitionWithDefaults.description}
                </p>
              )}
              {dateRangeText && (
                <p className="text-xs text-gray-400 mt-1">
                  Date Range: {dateRangeText}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
              <Eye className="w-4 h-4" />
              <span>{report.view_count + 1} views</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative">
          {isExecuting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-gray-700">Loading data...</span>
              </div>
            </div>
          )}
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <ReportRenderer
                report={definitionWithDefaults}
                data={executedData}
                isLoading={false}
                embedded={true}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-gray-500">
            Powered by Go Rocket Shipping
          </p>
        </div>
      </footer>
    </div>
  );
}

export default SharedReportPage;

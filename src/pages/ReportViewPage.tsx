import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Trash2,
  AlertCircle,
  Download,
  Database,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getReportById, deleteReport } from '../services/report';
import { executeWidgetReport, getWidgetMetadata } from '../services/widgetdataservice';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ColumnConfig } from '../services/exportService';
import type { Report, ReportExecutionParams } from '../types/report';
import { format, subDays, subMonths } from 'date-fns';

type DatePreset = 'last30' | 'last90' | 'last6months' | 'lastyear' | 'custom';

interface TableData {
  columns: Array<{ key: string; label: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
  summary?: {
    value: number | string;
    label: string;
    unit?: string;
  };
}

export function ReportViewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { effectiveCustomerId, user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [widgetName, setWidgetName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('last90');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    updateDateRange('last90');
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportId, effectiveCustomerId]);

  useEffect(() => {
    if (report && startDate && endDate) {
      loadReportData();
    }
  }, [report, startDate, endDate]);

  const updateDateRange = (preset: DatePreset) => {
    const now = new Date();
    let start: Date;
    const end: Date = now;

    switch (preset) {
      case 'last30':
        start = subDays(now, 30);
        break;
      case 'last90':
        start = subDays(now, 90);
        break;
      case 'last6months':
        start = subMonths(now, 6);
        break;
      case 'lastyear':
        start = subMonths(now, 12);
        break;
      default:
        return;
    }

    setDatePreset(preset);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  async function loadReport() {
    if (!reportId || !effectiveCustomerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reportData = await getReportById(reportId);

      if (!reportData) {
        setError('Report not found');
        setIsLoading(false);
        return;
      }

      setReport(reportData);

      if (reportData.source_type === 'widget' && reportData.source_widget_id) {
        const metadata = getWidgetMetadata(reportData.source_widget_id);
        setWidgetName(metadata?.name || 'Unknown Widget');
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadReportData() {
    if (!report || !effectiveCustomerId) return;

    setIsLoadingData(true);

    try {
      if (report.source_type === 'widget' && report.source_widget_id) {
        const executionParams: ReportExecutionParams = {
          ...report.execution_params,
          dateRange: {
            start: startDate,
            end: endDate,
          },
        };

        const result = await executeWidgetReport(
          report.source_widget_id,
          executionParams,
          effectiveCustomerId.toString()
        );

        setTableData(result.tableData);
      } else {
        setTableData(null);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setIsLoadingData(false);
    }
  }

  const handleDelete = async () => {
    if (!report) return;

    if (confirm(`Are you sure you want to delete "${report.name}"?`)) {
      try {
        await deleteReport(report.id);
        navigate('/reports');
      } catch (err) {
        console.error('Error deleting report:', err);
        alert('Failed to delete report. Please try again.');
      }
    }
  };

  const handleRefresh = () => {
    loadReportData();
  };

  const exportColumns: ColumnConfig[] = useMemo(() => {
    if (!tableData?.columns) return [];
    return tableData.columns.map((col) => ({
      key: col.key,
      header: col.label,
      format: col.type === 'currency' ? 'currency' : col.type === 'number' ? 'number' : 'text',
      width: 15,
    }));
  }, [tableData]);

  const exportData = useMemo(() => {
    if (!tableData?.rows) return [];
    return tableData.rows;
  }, [tableData]);

  const formatCellValue = (value: unknown, type?: string): string => {
    if (value === null || value === undefined) return '-';

    if (type === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    }

    if (type === 'number' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }

    if (type === 'percent' && typeof value === 'number') {
      return `${value.toFixed(1)}%`;
    }

    return String(value);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Report Not Found</h3>
          <p className="text-slate-600 mb-6">
            {error || "The report you're looking for doesn't exist or has been deleted."}
          </p>
          <button
            onClick={() => navigate('/reports')}
            className="px-6 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{report.name}</h1>
            {report.description && (
              <p className="text-slate-600 mt-1">{report.description}</p>
            )}
            {report.source_type === 'widget' && widgetName && (
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <LayoutGrid className="w-4 h-4" />
                <span>Source: {widgetName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoadingData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportMenu
            data={exportData as Record<string, unknown>[]}
            columns={exportColumns}
            filename={report.name}
            title={report.name}
            disabled={!tableData || tableData.rows.length === 0}
          />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-rocket-600" />
          <h2 className="text-lg font-bold text-slate-800">Date Range</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {(['last30', 'last90', 'last6months', 'lastyear', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => preset === 'custom' ? setDatePreset('custom') : updateDateRange(preset)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                datePreset === preset
                  ? 'bg-rocket-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {preset === 'last30' && 'Last 30 Days'}
              {preset === 'last90' && 'Last 90 Days'}
              {preset === 'last6months' && 'Last 6 Months'}
              {preset === 'lastyear' && 'Last Year'}
              {preset === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              />
            </div>
          </div>
        )}
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      ) : !tableData || tableData.rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No data found for the selected date range.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {tableData.summary && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white">
              <div className="text-sm font-medium opacity-80">{tableData.summary.label}</div>
              <div className="text-4xl font-bold mt-1">
                {formatCellValue(tableData.summary.value, tableData.summary.unit)}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {tableData.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                    {tableData.columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-4 text-sm ${
                          col.type === 'currency' || col.type === 'number'
                            ? 'text-right font-medium text-slate-800'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatCellValue(row[col.key], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
            Showing {tableData.rows.length} rows
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportViewPage;

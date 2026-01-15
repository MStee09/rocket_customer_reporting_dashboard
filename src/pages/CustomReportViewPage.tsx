import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertCircle,
  LayoutGrid,
  Pencil,
  Download,
  Mail,
  Sparkles,
  Check,
} from 'lucide-react';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { useAuth } from '../contexts/AuthContext';
import { executeReport, OverallMetrics, MonthlyMetric } from '../utils/reportExecutor';
import { format, subDays, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { exportReportToPDF } from '../utils/pdfExport';
import SimpleReportViewer from '../components/SimpleReportViewer';
import SimpleReportBuilder from '../components/SimpleReportBuilder';
import { SimpleReportConfig, SimpleReportBuilderState } from '../types/reports';
import SaveAsWidgetModal from '../components/reports/SaveAsWidgetModal';
import { ScheduleBuilderModal } from '../components/scheduled-reports/ScheduleBuilderModal';
import { ScheduledReport } from '../types/scheduledReports';
import { InlineScheduler } from '../components/reports/InlineScheduler';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ColumnConfig } from '../services/exportService';
import { SchedulePromptBanner } from '../components/reports/SchedulePromptBanner';
import { EmailReportModal } from '../components/reports/EmailReportModal';
import { buildEnhancementContext } from '../utils/reportEnhancementContext';
import { CustomerReport } from '../types/reports';

type DatePreset = 'last30' | 'last90' | 'last6months' | 'lastyear' | 'custom';

interface LocationState {
  newReport?: CustomerReport;
}

interface ChartDataPoint {
  month: string;
  Overall: number;
  [categoryName: string]: string | number | null;
}

export function CustomReportViewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { reports, isLoading: reportsLoading, deleteReport, updateReport, refreshReports } = useCustomerReports();
  const { effectiveCustomerIds, isAdmin, isViewingAsCustomer } = useAuth();

  const [monthlyData, setMonthlyData] = useState<MonthlyMetric[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('last6months');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showSaveAsWidgetModal, setShowSaveAsWidgetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showInlineScheduler, setShowInlineScheduler] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(() => !sessionStorage.getItem('hideSchedulePrompt'));
  const inlineSchedulerRef = useRef<HTMLDivElement>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [enhancementData, setEnhancementData] = useState<Record<string, unknown>[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const newReportFromState = (location.state as LocationState | null)?.newReport;
  const reportFromList = reports.find((r) => r.id === reportId);
  const report = reportFromList || (newReportFromState?.id === reportId ? newReportFromState : null);

  const isSimpleReport = report ? (report as any).simpleReport !== undefined : false;

  const simpleReportConfig: SimpleReportConfig | null = useMemo(() => {
    if (!report || !isSimpleReport) return null;

    return {
      id: report.id,
      name: report.name,
      description: report.description,
      columns: (report as any).simpleReport.columns,
      isSummary: (report as any).simpleReport.isSummary,
      groupBy: (report as any).simpleReport.groupBy,
      visualization: (report as any).simpleReport.visualization,
      filters: (report as any).simpleReport.filters || [],
      sorts: (report as any).simpleReport.sorts || [],
    };
  }, [report, isSimpleReport]);

  useEffect(() => {
    if (!reportsLoading && !report && !newReportFromState && retryCount < 5) {
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        refreshReports();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [reportsLoading, report, newReportFromState, retryCount, refreshReports]);

  useEffect(() => {
    updateDateRange('last6months');
  }, []);

  useEffect(() => {
    if (report && startDate && endDate && !(report as any).simpleReport) {
      loadReportData();
    }
  }, [report, startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inlineSchedulerRef.current && !inlineSchedulerRef.current.contains(event.target as Node)) {
        setShowInlineScheduler(false);
      }
    }

    if (showInlineScheduler) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showInlineScheduler]);

  const updateDateRange = (preset: DatePreset) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

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

  const loadReportData = async () => {
    if (!report) return;

    setIsLoadingData(true);

    try {
      const result = await executeReport(
        report,
        startDate,
        endDate,
        effectiveCustomerIds,
        isAdmin(),
        isViewingAsCustomer
      );

      setMonthlyData(result.monthlyData);
      setOverallMetrics(result.overallMetrics);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    if (confirm(`Are you sure you want to delete "${report.name}"?`)) {
      try {
        await deleteReport(report.id);
        navigate('/custom-reports');
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report. Please try again.');
      }
    }
  };

  const monthlyExportColumns: ColumnConfig[] = useMemo(() => [
    { key: 'month', header: 'Month', format: 'text', width: 12 },
    { key: 'avgCostPerUnit', header: 'Avg Cost Per Unit', format: 'currency', width: 18 },
    { key: 'totalRevenue', header: 'Total Revenue', format: 'currency', width: 15 },
    { key: 'totalQuantity', header: 'Total Quantity', format: 'number', width: 15 },
    { key: 'shipmentCount', header: 'Shipment Count', format: 'number', width: 15 }
  ], []);

  const monthlyExportData = useMemo(() => {
    return monthlyData.map(m => ({
      month: m.month,
      avgCostPerUnit: m.avgCostPerUnit,
      totalRevenue: m.totalRevenue,
      totalQuantity: m.totalQuantity,
      shipmentCount: m.shipmentCount
    }));
  }, [monthlyData]);

  const handleUpdateReport = async (updatedState: SimpleReportBuilderState) => {
    if (!report) return;

    try {
      await updateReport(report.id, {
        name: updatedState.name,
        description: updatedState.description,
        simpleReport: {
          columns: updatedState.selectedColumns,
          isSummary: updatedState.isSummary,
          groupBy: updatedState.groupByColumns,
          visualization: updatedState.visualization,
          filters: updatedState.filters,
          sorts: updatedState.sorts,
        }
      });
      setShowEditModal(false);
      refreshReports();
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    const reportElement = document.querySelector('[data-report-content]') as HTMLElement;
    if (!reportElement) {
      alert('Could not find report content to export');
      return;
    }
    await exportReportToPDF(reportElement, {
      title: report?.name || 'Report',
      filename: report?.name,
    });
  };

  const handleEnhanceWithAI = () => {
    if (!report) return;

    const simpleReport = (report as any).simpleReport;
    if (!simpleReport) {
      alert('This report type cannot be enhanced with AI yet.');
      return;
    }

    const context = buildEnhancementContext(
      {
        id: report.id,
        name: report.name,
        description: report.description,
        columns: simpleReport.columns || [],
        isSummary: simpleReport.isSummary || false,
        groupBy: simpleReport.groupBy || [],
        visualization: simpleReport.visualization,
        filters: simpleReport.filters || [],
        sorts: simpleReport.sorts || []
      },
      enhancementData.length > 0 ? enhancementData : reportData,
      {
        type: datePreset,
        start: startDate,
        end: endDate
      }
    );

    sessionStorage.setItem('enhancement_context', JSON.stringify(context));

    navigate('/ai-studio', {
      state: {
        enhancementMode: true,
        sourceReport: report.name
      }
    });
  };

  const handleScheduleClick = () => {
    if (!report) return;

    const simpleReport = (report as any).simpleReport;
    if (!simpleReport || !simpleReport.columns || simpleReport.columns.length === 0) {
      alert('This report cannot be scheduled because it has no columns selected. Please edit the report and add at least one column.');
      return;
    }

    setShowScheduleModal(true);
  };

  const handleScheduleCreated = (_schedule: ScheduledReport) => {
    setShowScheduleModal(false);
    navigate('/scheduled-reports');
  };

  const handleInlineScheduleCreated = (_schedule: ScheduledReport) => {
    setShowInlineScheduler(false);
    setScheduleSuccess(true);
    setTimeout(() => setScheduleSuccess(false), 3000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (reportsLoading || (!report && !newReportFromState && retryCount < 5)) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Report Not Found</h3>
          <p className="text-slate-600 mb-6">
            The report you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/custom-reports')}
            className="px-6 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  if (isSimpleReport && simpleReportConfig) {
    const customerId = effectiveCustomerIds && effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : undefined;

    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/custom-reports')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{report.name}</h1>
              {report.description && (
                <p className="text-slate-600 mt-1">{report.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={handleEnhanceWithAI}
              disabled={reportData.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enhance this report with AI visualizations"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Enhance with AI</span>
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={reportData.length === 0}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setShowSaveAsWidgetModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <LayoutGrid className="w-4 h-4" />
              Save as Widget
            </button>
            <div className="relative" ref={inlineSchedulerRef}>
              <button
                onClick={() => {
                  const simpleReport = (report as { simpleReport?: { columns?: unknown[] } }).simpleReport;
                  if (!simpleReport || !simpleReport.columns || simpleReport.columns.length === 0) {
                    alert('This report cannot be scheduled because it has no columns selected. Please edit the report and add at least one column.');
                    return;
                  }
                  setShowInlineScheduler(!showInlineScheduler);
                }}
                disabled={scheduleSuccess}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                  scheduleSuccess
                    ? 'bg-green-600 text-white border-green-600'
                    : showInlineScheduler
                    ? 'bg-rocket-100 text-rocket-700 border-rocket-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {scheduleSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Scheduled!
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </>
                )}
              </button>
              {showInlineScheduler && report && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <InlineScheduler
                    report={{
                      id: report.id,
                      name: report.name,
                      type: 'custom_report',
                      simpleReport: (report as { simpleReport?: unknown }).simpleReport,
                    }}
                    onScheduleCreated={handleInlineScheduleCreated}
                    onCancel={() => setShowInlineScheduler(false)}
                    defaultExpanded={true}
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        <SimpleReportViewer
          config={simpleReportConfig}
          customerId={customerId?.toString()}
          onDataLoad={(data) => {
            setReportData(data);
            setEnhancementData(data);
          }}
        />

        {showSchedulePrompt && (
          <div className="mt-6">
            <SchedulePromptBanner
              reportType="custom"
              reportId={report?.id}
              reportName={report?.name}
              onDismiss={() => setShowSchedulePrompt(false)}
              onSchedule={handleScheduleClick}
            />
          </div>
        )}

        {showSaveAsWidgetModal && (
          <SaveAsWidgetModal
            report={{ ...simpleReportConfig, id: report.id }}
            onClose={() => setShowSaveAsWidgetModal(false)}
            onSuccess={(widgetId) => {
              setShowSaveAsWidgetModal(false);
              alert(`Widget created successfully! You can now add it to your dashboard from the Widget Library.`);
            }}
          />
        )}

        {showEditModal && (
          <SimpleReportBuilder
            onClose={() => setShowEditModal(false)}
            onSave={handleUpdateReport}
            initialState={{
              name: report.name,
              description: report.description,
              selectedColumns: (report as any).simpleReport.columns,
              isSummary: (report as any).simpleReport.isSummary,
              groupByColumns: (report as any).simpleReport.groupBy || [],
              visualization: (report as any).simpleReport.visualization || 'table',
              filters: (report as any).simpleReport.filters || [],
              sorts: (report as any).simpleReport.sorts || [],
            }}
          />
        )}

        {showScheduleModal && (
          <ScheduleBuilderModal
            isOpen={true}
            onClose={() => setShowScheduleModal(false)}
            onSave={handleScheduleCreated}
            report={{
              id: report.id,
              name: report.name,
              type: 'custom_report',
              simpleReport: (report as any).simpleReport
            }}
          />
        )}

        <EmailReportModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          reportName={report.name}
          reportData={reportData}
          reportType="custom"
        />
      </div>
    );
  }

  const categories = report.config.categories || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/custom-reports')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{report.name}</h1>
            <p className="text-slate-600 mt-1">{report.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu
            data={monthlyExportData}
            columns={monthlyExportColumns}
            filename={report?.name || 'report'}
            title={report?.name}
            disabled={!monthlyData || monthlyData.length === 0}
          />
          <button
            onClick={handleScheduleClick}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
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
          <button
            onClick={() => updateDateRange('last30')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last30'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => updateDateRange('last90')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last90'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => updateDateRange('last6months')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'last6months'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => updateDateRange('lastyear')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'lastyear'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last Year
          </button>
          <button
            onClick={() => setDatePreset('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              datePreset === 'custom'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Custom
          </button>
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
      ) : !overallMetrics ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No data found for the selected date range.
          </p>
        </div>
      ) : (
        <div data-report-content>
          <div className="bg-gradient-to-br from-charcoal-700 to-charcoal-800 rounded-xl shadow-xl border border-charcoal-600 p-8 mb-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Overall Average Cost Per Unit</h2>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-5xl font-bold">
                {formatCurrency(overallMetrics.avgCostPerUnit)}
              </div>
              {overallMetrics.percentChange !== 0 && (
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    overallMetrics.percentChange > 0
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-green-500/20 text-green-100'
                  }`}
                >
                  {overallMetrics.percentChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(overallMetrics.percentChange).toFixed(1)}% vs previous month
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Shipments</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatNumber(overallMetrics.totalShipments)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Units</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatNumber(overallMetrics.totalQuantity)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-slate-800">
                {formatCurrency(overallMetrics.totalRevenue)}
              </div>
            </div>
          </div>

          {categories.length > 0 && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Category Breakdown</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((category) => {
                    const metrics = overallMetrics.categories[category.name];
                    const hexToRgb = (hex: string) => {
                      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                      return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                      } : { r: 100, g: 100, b: 100 };
                    };
                    const rgb = hexToRgb(category.color);

                    return (
                      <div
                        key={category.name}
                        className="rounded-xl shadow-lg p-6 text-white"
                        style={{
                          background: `linear-gradient(to bottom right, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)}))`,
                          borderColor: category.color,
                          borderWidth: '1px',
                        }}
                      >
                        <div className="text-sm font-semibold mb-2 opacity-90">{category.name}</div>
                        <div className="text-3xl font-bold mb-2">
                          {metrics.totalQuantity > 0 ? formatCurrency(metrics.avgCostPerUnit) : 'N/A'}
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-90">
                          <span>{formatNumber(metrics.totalQuantity)} units</span>
                          {metrics.percentChange !== 0 && metrics.totalQuantity > 0 && (
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                                metrics.percentChange > 0
                                  ? 'bg-red-500/30'
                                  : 'bg-green-500/30'
                              }`}
                            >
                              {metrics.percentChange > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {Math.abs(metrics.percentChange).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Category Comparison</h2>
                {categories.some((cat) => overallMetrics.categories[cat.name].totalQuantity > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={categories.map((category) => ({
                        category: category.name,
                        avgCostPerUnit: overallMetrics.categories[category.name].avgCostPerUnit,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="category"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Avg Cost Per Unit']}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                      />
                      <Bar dataKey="avgCostPerUnit" radius={[8, 8, 0, 0]}>
                        {categories.map((cat, index) => (
                          <Cell key={`cell-${index}`} fill={cat.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-slate-600">
                    No category data available
                  </div>
                )}
              </div>
            </>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Trend by Category</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={450}>
                <LineChart
                  data={monthlyData.map((m) => {
                    const chartData: ChartDataPoint = {
                      month: m.month,
                      Overall: m.avgCostPerUnit,
                    };
                    categories.forEach((cat) => {
                      chartData[cat.name] = m.categories[cat.name]?.avgCostPerUnit || null;
                    });
                    return chartData;
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: number | null) => {
                      if (value === null || value === 0) return ['N/A', ''];
                      return [formatCurrency(value), ''];
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="Overall"
                    stroke="#475569"
                    strokeWidth={3}
                    dot={{ fill: '#475569', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Overall"
                  />
                  {categories.map((cat) => (
                    <Line
                      key={cat.name}
                      type="monotone"
                      dataKey={cat.name}
                      stroke={cat.color}
                      strokeWidth={2}
                      dot={{ fill: cat.color, r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      name={cat.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-600">
                No monthly data available for the selected period
              </div>
            )}
          </div>

          {showSchedulePrompt && (
            <div className="mt-6">
              <SchedulePromptBanner
                reportType="custom"
                reportId={report?.id}
                reportName={report?.name}
                onDismiss={() => setShowSchedulePrompt(false)}
                onSchedule={handleScheduleClick}
              />
            </div>
          )}
        </div>
      )}

      {showScheduleModal && (
        <ScheduleBuilderModal
          isOpen={true}
          onClose={() => setShowScheduleModal(false)}
          onSave={handleScheduleCreated}
          report={{
            id: report.id,
            name: report.name,
            type: 'custom_report',
            simpleReport: (report as any).simpleReport
          }}
        />
      )}
    </div>
  );
}

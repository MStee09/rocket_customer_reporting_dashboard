import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Pencil,
  Loader2,
  FileText,
  RefreshCw,
  LayoutDashboard,
  Check,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ReportRenderer } from '../components/reports/studio';
import { AddToDashboardModal, AIReportWidgetConfig } from '../components/ai-studio';
import { ScheduleBuilderModal } from '../components/scheduled-reports/ScheduleBuilderModal';
import { loadAIReport, SavedAIReport } from '../services/aiReportService';
import { executeReportData } from '../services/reportDataExecutor';
import { supabase } from '../lib/supabase';
import { ExecutedReportData, DateRangeType } from '../types/aiReport';
import { DateRange } from '../components/reports/studio/DateRangeSelector';
import { exportReportToPDF } from '../utils/pdfExport';

export function AIReportViewerPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<SavedAIReport | null>(null);
  const [executedData, setExecutedData] = useState<ExecutedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddToDashboard, setShowAddToDashboard] = useState(false);
  const [dashboardAddSuccess, setDashboardAddSuccess] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadReport = useCallback(async () => {
    if (!reportId || !effectiveCustomerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const loadedReport = await loadAIReport(String(effectiveCustomerId), reportId);
      if (!loadedReport) {
        setError('Report not found');
        return;
      }
      setReport(loadedReport);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [reportId, effectiveCustomerId]);

  const executeReport = useCallback(async () => {
    if (!report || !effectiveCustomerId) return;

    setIsExecuting(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      const data = await executeReportData(
        supabase,
        report.definition,
        String(effectiveCustomerId),
        effectiveIsAdmin
      );
      setExecutedData(data);
    } catch (err) {
      console.error('Failed to execute report:', err);
    } finally {
      setIsExecuting(false);
    }
  }, [report, effectiveCustomerId, isAdmin, isViewingAsCustomer]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (report) {
      executeReport();
    }
  }, [report, executeReport]);

  const handleDateRangeChange = async (range: DateRangeType, dates?: DateRange) => {
    if (!report || !effectiveCustomerId) return;

    const updatedDefinition = {
      ...report.definition,
      dateRange: {
        type: range,
        customStart: dates?.start?.toISOString(),
        customEnd: dates?.end?.toISOString(),
      },
    };

    setReport({ ...report, definition: updatedDefinition });

    setIsExecuting(true);
    const effectiveIsAdmin = isAdmin() && !isViewingAsCustomer;

    try {
      const data = await executeReportData(
        supabase,
        updatedDefinition,
        String(effectiveCustomerId),
        effectiveIsAdmin
      );
      setExecutedData(data);
    } catch (err) {
      console.error('Failed to execute report:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !report) return;
    await exportReportToPDF(reportRef.current, {
      title: report.name || 'Report',
      filename: report.name,
    });
  };

  const handleEdit = () => {
    navigate(`/ai-studio?reportId=${reportId}&mode=edit`);
  };

  const handleAddToDashboard = (config: AIReportWidgetConfig) => {
    const existing = JSON.parse(localStorage.getItem('dashboard_ai_widgets') || '[]');
    existing.push(config);
    localStorage.setItem('dashboard_ai_widgets', JSON.stringify(existing));
    setDashboardAddSuccess(true);
    setTimeout(() => setDashboardAddSuccess(false), 2000);
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Report not found'}
          </h2>
          <p className="text-gray-500 mb-6">
            The report you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/ai-studio')}
            className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors"
          >
            Go to AI Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate('/ai-studio')}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {report.name}
              </h1>
              {report.description && (
                <p className="text-sm text-gray-500 truncate">{report.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={executeReport}
              disabled={isExecuting}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isExecuting ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportPDF}
              className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export PDF</span>
            </button>
            <button
              onClick={() => setShowAddToDashboard(true)}
              disabled={dashboardAddSuccess}
              className={`hidden sm:flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                dashboardAddSuccess
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
              title="Add to Dashboard"
            >
              {dashboardAddSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden md:inline">Added!</span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">Add to Dashboard</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              title="Schedule this report"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden md:inline">Schedule</span>
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative">
          {isExecuting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-rocket-600" />
                <span className="text-gray-700">Loading data...</span>
              </div>
            </div>
          )}
          <div ref={reportRef} data-report-content className="p-4 sm:p-6 max-w-7xl mx-auto bg-white">
            <ReportRenderer
              report={report.definition}
              data={executedData}
              isLoading={false}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
      </main>

      <AddToDashboardModal
        isOpen={showAddToDashboard}
        onClose={() => setShowAddToDashboard(false)}
        report={report}
        onAdd={handleAddToDashboard}
      />

      {showScheduleModal && report && reportId && (
        <ScheduleBuilderModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSave={() => setShowScheduleModal(false)}
          report={{
            id: reportId,
            name: report.name || 'AI Report',
            type: 'ai_report'
          }}
        />
      )}
    </div>
  );
}

export default AIReportViewerPage;

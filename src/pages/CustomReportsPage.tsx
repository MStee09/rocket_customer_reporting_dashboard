import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, FileText, BarChart3, Trash2, Users, Calendar, ArrowLeft } from 'lucide-react';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { EmptyReportState } from '../components/EmptyReportState';
import SimpleReportBuilder from '../components/SimpleReportBuilder';
import { SimpleReportBuilderState, ReportConfig } from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';
import { ScheduleBuilderModal } from '../components/scheduled-reports/ScheduleBuilderModal';
import { ScheduledReport } from '../types/scheduledReports';

export function CustomReportsPage() {
  const navigate = useNavigate();
  const { isViewingAsCustomer, viewingCustomer } = useAuth();
  const { reports, isLoading, deleteReport, saveReport } = useCustomerReports();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [schedulingReport, setSchedulingReport] = useState<{ id: string; name: string } | null>(null);

  const handleScheduleCreated = (_schedule: ScheduledReport) => {
    setSchedulingReport(null);
    alert('Schedule created! View it in the Scheduled Reports page.');
  };

  const handleDeleteReport = async (reportId: string, reportName: string) => {
    if (confirm(`Are you sure you want to delete "${reportName}"?`)) {
      try {
        await deleteReport(reportId);
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report. Please try again.');
      }
    }
  };

  const handleSaveReport = async (state: SimpleReportBuilderState) => {
    try {
      let columns = state.selectedColumns;
      let groupByColumns = state.groupByColumns;

      if (isViewingAsCustomer) {
        columns = filterAdminOnlyColumns(columns);
        groupByColumns = filterAdminOnlyColumnIds(groupByColumns);

        console.log('Filtered admin-only columns from customer report', {
          originalColumns: state.selectedColumns.length,
          filteredColumns: columns.length,
          originalGroupBy: state.groupByColumns.length,
          filteredGroupBy: groupByColumns.length
        });
      }

      const reportConfig: ReportConfig = {
        id: `report-${Date.now()}`,
        name: state.name,
        description: state.description,
        type: 'custom',
        config: {
          primaryTable: 'shipments',
          filters: {},
        },
        visualization: state.visualization as any,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
      };

      (reportConfig as any).simpleReport = {
        columns: columns,
        isSummary: state.isSummary,
        groupBy: groupByColumns,
        visualization: state.visualization,
        filters: state.filters || [],
        sorts: state.sorts || []
      };

      await saveReport(reportConfig);
      setIsBuilderOpen(false);
      navigate(`/custom-reports/${reportConfig.id}`, { state: { newReport: reportConfig } });
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {isViewingAsCustomer && viewingCustomer && (
        <div className="mb-6 px-4 py-3 bg-orange-500/10 border border-orange-500/40 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">
              Viewing reports for {viewingCustomer.company_name}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/analytics')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Analytics"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Custom Reports</h1>
            <p className="text-slate-600 mt-1">Create and manage your custom reports</p>
          </div>
        </div>

        {reports.length > 0 && (
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Report
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <EmptyReportState onBuildReport={() => setIsBuilderOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report, index) => {
            const accentColors = [
              'bg-rocket-500',
              'bg-emerald-500',
              'bg-amber-500',
              'bg-rose-500',
              'bg-cyan-500',
            ];
            const accent = accentColors[index % accentColors.length];
            const simpleReport = (report as any).simpleReport;
            const hasFilters = simpleReport?.filters && simpleReport.filters.length > 0;
            const columnCount = simpleReport?.columns?.length || 0;

            return (
              <div
                key={report.id}
                className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex"
                onClick={() => navigate(`/custom-reports/${report.id}`)}
              >
                <div className={`w-1 ${accent} flex-shrink-0`} />

                <div className="flex-1 min-w-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 truncate group-hover:text-rocket-600 transition-colors">
                        {report.name}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {format(new Date(report.updatedAt || report.createdAt), 'MMM d')}
                      </span>
                    </div>

                    {report.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {columnCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {columnCount} column{columnCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {report.visualization && report.visualization !== 'table' && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                          {report.visualization.replace('_', ' ')}
                        </span>
                      )}
                      {hasFilters && (
                        <span className="flex items-center gap-1">
                          {simpleReport.filters.length} filter{simpleReport.filters.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/custom-reports/${report.id}`); }}
                        className="text-xs text-rocket-600 hover:text-rocket-700 font-medium"
                      >
                        View
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setSchedulingReport({ id: report.id, name: report.name }); }}
                        className="p-1 text-gray-400 hover:text-rocket-600 rounded transition-colors"
                        title="Schedule this report"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id, report.name); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isBuilderOpen && (
        <SimpleReportBuilder
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleSaveReport}
        />
      )}

      {schedulingReport && (
        <ScheduleBuilderModal
          isOpen={true}
          onClose={() => setSchedulingReport(null)}
          onSave={handleScheduleCreated}
          report={{
            id: schedulingReport.id,
            name: schedulingReport.name,
            type: 'custom_report'
          }}
        />
      )}
    </div>
  );
}

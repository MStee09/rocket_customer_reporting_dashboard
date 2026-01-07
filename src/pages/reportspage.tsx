import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Calendar, Search, Plus, MoreVertical, Eye,
  Clock, Trash2, Sparkles, PenTool, BarChart3, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport, deleteAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { supabase } from '../lib/supabase';
import { ScheduleBuilderSingleScreen } from '../components/scheduled-reports/ScheduleBuilderSingleScreen';
import { formatDistanceToNow, format } from 'date-fns';
import SimpleReportBuilder from '../components/SimpleReportBuilder';
import { SimpleReportBuilderState, SimpleReportColumn } from '../types/reports';
import { ColumnFilter } from '../types/filters';
import { EmptyReportState } from '../components/EmptyReportState';
import { filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';

type FilterTab = 'builder' | 'my-reports' | 'scheduled';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  next_run_at: string | null;
  is_active: boolean;
  report_type: string;
  report_id: string;
  day_of_week?: number;
  day_of_month?: number;
}

interface ReportItem {
  id: string;
  name: string;
  type: 'ai' | 'custom';
  date: string;
  path: string;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getFrequencyDisplay(schedule: ScheduledReport): string {
  switch (schedule.frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return `Weekly on ${DAYS_SHORT[schedule.day_of_week || 0]}`;
    case 'monthly':
      return `Monthly on day ${schedule.day_of_month || 1}`;
    case 'quarterly':
      return 'Quarterly';
    default:
      return schedule.frequency;
  }
}

function getNextRunDisplay(nextRun: string | null): string {
  if (!nextRun) return 'Not scheduled';
  const date = new Date(nextRun);
  const now = new Date();
  if (date < now) return 'Overdue';
  return format(date, 'MMM d, h:mm a');
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, effectiveCustomerId, isViewingAsCustomer, viewingCustomer } = useAuth();
  const { reports: customReportsFromStorage, isLoading: customReportsLoading, deleteReport: deleteCustomReport, saveReport } = useCustomerReports();

  const initialTab = (searchParams.get('tab') as FilterTab) || 'builder';
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [aiReports, setAIReports] = useState<SavedAIReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [initialBuilderData, setInitialBuilderData] = useState<Partial<SimpleReportBuilderState> | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [reportToSchedule, setReportToSchedule] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    if (tab === 'builder') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    loadAllReports();
  }, [user, effectiveCustomerId]);

  async function loadAllReports() {
    if (!user || !effectiveCustomerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [aiReportsResult, scheduledResult] = await Promise.all([
        loadAIReports(effectiveCustomerId),
        supabase
          .from('scheduled_reports')
          .select('*')
          .eq('customer_id', effectiveCustomerId)
          .order('created_at', { ascending: false })
      ]);

      setAIReports(aiReportsResult);
      setScheduledReports(scheduledResult.data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  // Report Builder handlers
  const handleSaveReport = async (state: SimpleReportBuilderState) => {
    try {
      let columns = state.selectedColumns;
      let groupByColumns = state.groupByColumns;

      if (isViewingAsCustomer) {
        columns = filterAdminOnlyColumns(columns);
        groupByColumns = filterAdminOnlyColumnIds(groupByColumns);
      }

      const reportConfig = {
        name: state.name,
        description: state.description || '',
        columns: columns.map((col) => ({
          id: col.id,
          label: col.label,
          aggregation: col.aggregation,
          format: col.format,
        })),
        filters: state.filters.filter((f) => f.enabled),
        dateRange: state.dateRange,
        groupBy: groupByColumns,
        visualization: state.visualization,
        sortColumn: state.sortColumn,
        sortDirection: state.sortDirection,
        simpleReport: {
          columns: columns,
          filters: state.filters,
          groupBy: groupByColumns,
        },
      };

      await saveReport(reportConfig);
      setIsBuilderOpen(false);
      setInitialBuilderData(null);
      // Switch to My Reports tab after saving
      handleTabChange('my-reports');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    }
  };

  const handleDeleteReport = async (reportId: string, reportName: string, type: 'custom' | 'ai') => {
    if (confirm(`Are you sure you want to delete "${reportName}"?`)) {
      try {
        if (type === 'ai') {
          await deleteAIReport(reportId);
          setAIReports(prev => prev.filter(r => r.id !== reportId));
        } else {
          await deleteCustomReport(reportId);
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report.');
      }
    }
  };

  const reportItems: ReportItem[] = useMemo(() => {
    const items: ReportItem[] = [];

    aiReports.forEach((report) => {
      items.push({
        id: report.id,
        name: report.title,
        type: 'ai',
        date: report.createdAt,
        path: `/ai-reports/${report.id}`,
      });
    });

    customReportsFromStorage.forEach((report) => {
      items.push({
        id: report.id,
        name: report.name,
        type: 'custom',
        date: report.updatedAt || report.createdAt,
        path: `/custom-reports/${report.id}`,
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [aiReports, customReportsFromStorage]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportItems;
    const query = searchQuery.toLowerCase();
    return reportItems.filter((r) => r.name.toLowerCase().includes(query));
  }, [reportItems, searchQuery]);

  const filteredScheduledReports = useMemo(() => {
    if (!searchQuery.trim()) return scheduledReports;
    const query = searchQuery.toLowerCase();
    return scheduledReports.filter((r) => r.name.toLowerCase().includes(query));
  }, [scheduledReports, searchQuery]);

  const isLoading = loading || customReportsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Build, view, and schedule your reports</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => handleTabChange('builder')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center ${
              activeTab === 'builder'
                ? 'text-rocket-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <PenTool className="w-4 h-4" />
              <span>Report Builder</span>
            </span>
            {activeTab === 'builder' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rocket-600" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('my-reports')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center ${
              activeTab === 'my-reports'
                ? 'text-rocket-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>My Reports</span>
            </span>
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
              {reportItems.length}
            </span>
            {activeTab === 'my-reports' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rocket-600" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('scheduled')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center ${
              activeTab === 'scheduled'
                ? 'text-rocket-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Scheduled</span>
            </span>
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
              {scheduledReports.length}
            </span>
            {activeTab === 'scheduled' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rocket-600" />
            )}
          </button>
        </div>

        {activeTab !== 'builder' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </div>
        </div>
      ) : (
        <>
          {/* Report Builder Tab */}
          {activeTab === 'builder' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <SimpleReportBuilder
                onSave={handleSaveReport}
                onClose={() => {
                  setInitialBuilderData(null);
                }}
                initialState={initialBuilderData || undefined}
                isInline={true}
              />
            </div>
          )}

          {/* My Reports Tab */}
          {activeTab === 'my-reports' && (
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No reports yet</h3>
                  <p className="text-slate-500 mb-6">Create your first report using the Report Builder</p>
                  <button
                    onClick={() => handleTabChange('builder')}
                    className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Report
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all overflow-hidden cursor-pointer"
                      onClick={() => navigate(report.path)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {report.type === 'ai' ? (
                              <Sparkles className="w-4 h-4 text-purple-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-rocket-500" />
                            )}
                            <h3 className="font-medium text-slate-900 truncate group-hover:text-rocket-600 transition-colors">
                              {report.name}
                            </h3>
                          </div>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(menuOpen === report.id ? null : report.id);
                              }}
                              className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                            {menuOpen === report.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[140px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(report.path);
                                      setMenuOpen(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteReport(report.id, report.name, report.type);
                                      setMenuOpen(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            report.type === 'ai' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-rocket-100 text-rocket-700'
                          }`}>
                            {report.type === 'ai' ? 'AI Report' : 'Custom'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scheduled Reports Tab */}
          {activeTab === 'scheduled' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Scheduled Reports</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-sm font-medium">
                    {filteredScheduledReports.length}
                  </span>
                </div>
                <Link
                  to="/scheduled-reports"
                  className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Schedule
                </Link>
              </div>

              {filteredScheduledReports.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No scheduled reports</h3>
                  <p className="text-slate-500 mb-6">Set up automated report delivery</p>
                  <Link
                    to="/scheduled-reports"
                    className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Schedule
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredScheduledReports.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${schedule.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div>
                          <h3 className="font-medium text-slate-900">{schedule.name}</h3>
                          <p className="text-sm text-slate-500">
                            {getFrequencyDisplay(schedule)} • Next: {getNextRunDisplay(schedule.next_run_at)}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/scheduled-reports"
                        className="text-sm text-rocket-600 hover:text-rocket-700 font-medium"
                      >
                        Manage
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportsPage;

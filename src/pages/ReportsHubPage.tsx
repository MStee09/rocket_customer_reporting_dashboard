import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, Search, Plus, MoreVertical, Eye,
  Clock, Trash2, Edit, Copy, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport, deleteAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { supabase } from '../lib/supabase';
import { ScheduleBuilderModal } from '../components/scheduled-reports/ScheduleBuilderModal';
import { formatDistanceToNow, format } from 'date-fns';
import { ReportConfig } from '../types/reports';

type FilterTab = 'all' | 'ai' | 'custom' | 'scheduled';

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

export function ReportsHubPage() {
  const navigate = useNavigate();
  const { user, effectiveCustomerId } = useAuth();
  const { reports: customReportsFromStorage, isLoading: customReportsLoading, deleteReport: deleteCustomReport } = useCustomerReports();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduledSection, setShowScheduledSection] = useState(true);

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [aiReports, setAIReports] = useState<SavedAIReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [reportToSchedule, setReportToSchedule] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadAllReports();
  }, [user, effectiveCustomerId]);

  async function loadAllReports() {
    if (!user || !effectiveCustomerId) {
      setLoading(false);
      return;
    }

    try {
      const [schedulesData, aiReportsData] = await Promise.all([
        supabase
          .from('scheduled_reports')
          .select('*')
          .eq('customer_id', effectiveCustomerId)
          .order('created_at', { ascending: false }),
        loadAIReports(effectiveCustomerId.toString()),
      ]);

      if (schedulesData.data) {
        setScheduledReports(schedulesData.data);
      }

      setAIReports(aiReportsData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }

  const reportItems: ReportItem[] = useMemo(() => {
    const items: ReportItem[] = [
      ...aiReports.map((report) => ({
        id: report.id,
        name: report.name,
        type: 'ai' as const,
        date: report.createdAt,
        path: `/ai-reports/${report.id}`,
      })),
      ...customReportsFromStorage.map((report) => ({
        id: report.id,
        name: report.name,
        type: 'custom' as const,
        date: report.updatedAt || report.createdAt,
        path: `/custom-reports/${report.id}`,
      })),
    ];

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [aiReports, customReportsFromStorage]);

  const filteredReports = useMemo(() => {
    let filtered = reportItems;

    if (activeTab === 'ai') {
      filtered = filtered.filter((r) => r.type === 'ai');
    } else if (activeTab === 'custom') {
      filtered = filtered.filter((r) => r.type === 'custom');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [reportItems, activeTab, searchQuery]);

  const filteredScheduledReports = useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'scheduled') return [];

    let filtered = scheduledReports;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [scheduledReports, activeTab, searchQuery]);

  async function handleDeleteReport(report: ReportItem) {
    if (!effectiveCustomerId) return;

    if (!confirm(`Are you sure you want to delete "${report.name}"?`)) return;

    try {
      if (report.type === 'ai') {
        await deleteAIReport(effectiveCustomerId.toString(), report.id);
        setAIReports(aiReports.filter((r) => r.id !== report.id));
      } else {
        await deleteCustomReport(report.id);
      }
      setMenuOpen(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report');
    }
  }

  async function handleDeleteSchedule(schedule: ScheduledReport) {
    if (!confirm(`Are you sure you want to delete "${schedule.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      setScheduledReports(scheduledReports.filter((s) => s.id !== schedule.id));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
    }
  }

  async function handleToggleSchedule(schedule: ScheduledReport) {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;

      setScheduledReports(
        scheduledReports.map((s) =>
          s.id === schedule.id ? { ...s, is_active: !s.is_active } : s
        )
      );
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      alert('Failed to update schedule');
    }
  }

  function handleScheduleReport(report: ReportItem) {
    setReportToSchedule({
      type: report.type === 'ai' ? 'ai_report' : 'custom_report',
      id: report.id,
      name: report.name,
    });
    setScheduleModalOpen(true);
    setMenuOpen(null);
  }

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'ai', label: 'AI Reports', count: aiReports.length },
    { key: 'custom', label: 'Custom Reports', count: customReportsFromStorage.length },
    { key: 'scheduled', label: 'Scheduled', count: scheduledReports.length },
  ];

  const isLoading = loading || customReportsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-600 mt-1">View and manage all your saved and scheduled reports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-rocket-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 ${activeTab === tab.key ? 'text-rocket-100' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-2 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-rocket-600 rounded-full animate-spin"></div>
            Loading reports...
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {(activeTab === 'all' || activeTab === 'scheduled') && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowScheduledSection(!showScheduledSection)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Scheduled Reports</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-sm font-medium">
                    {filteredScheduledReports.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to="/scheduled-reports"
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Schedule
                  </Link>
                  {showScheduledSection ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {showScheduledSection && (
                <>
                  {filteredScheduledReports.length === 0 ? (
                    <div className="px-6 py-12 text-center border-t border-slate-200">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium mb-1">No scheduled reports</p>
                      <p className="text-sm text-slate-500 mb-4">
                        Create a schedule to automatically generate reports
                      </p>
                      <Link
                        to="/scheduled-reports"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Schedule
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border-t border-slate-200">
                      {filteredScheduledReports.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="px-6 py-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-900 truncate">{schedule.name}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <Clock className="w-3.5 h-3.5" />
                                    {getFrequencyDisplay(schedule)}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    Next: {getNextRunDisplay(schedule.next_run_at)}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      schedule.is_active
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {schedule.is_active ? 'Active' : 'Paused'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleToggleSchedule(schedule)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                {schedule.is_active ? 'Pause' : 'Resume'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSchedule(schedule);
                                  setScheduleModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab !== 'scheduled' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Saved Reports</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-sm font-medium">
                    {filteredReports.length}
                  </span>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">
                    {searchQuery ? 'No reports found' : 'No reports yet'}
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    {searchQuery
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first report'}
                  </p>
                  {!searchQuery && (
                    <Link
                      to="/ai-studio"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Create with AI
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            report.type === 'ai'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-rocket-100 text-rocket-600'
                          }`}
                        >
                          {report.type === 'ai' ? (
                            <Sparkles className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{report.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              report.type === 'ai'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rocket-50 text-rocket-700'
                            }`}
                          >
                            {report.type === 'ai' ? 'AI Report' : 'Custom'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(report.path)}
                          className="px-4 py-2 text-sm font-medium text-rocket-600 hover:bg-rocket-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleScheduleReport(report)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Schedule
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === report.id ? null : report.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpen === report.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg z-20">
                                <button
                                  onClick={() => handleDeleteReport(report)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Report
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {scheduleModalOpen && (
        <ScheduleBuilderModal
          isOpen={scheduleModalOpen}
          report={reportToSchedule ? {
            id: reportToSchedule.id,
            name: reportToSchedule.name,
            type: reportToSchedule.type as 'ai_report' | 'custom_report',
          } : undefined}
          existingSchedule={editingSchedule || undefined}
          onClose={() => {
            setScheduleModalOpen(false);
            setReportToSchedule(null);
            setEditingSchedule(null);
          }}
          onSave={() => {
            loadAllReports();
            setScheduleModalOpen(false);
            setReportToSchedule(null);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}

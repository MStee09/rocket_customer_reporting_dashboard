import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, Mail, Bell, Play, Pause,
  Trash2, Edit, ChevronRight, CheckCircle, XCircle, Loader2, Zap, FileText, Brain,
  Building2, Search, Filter, Users, Shield, Lock, X, PlayCircle, PauseCircle, AlertCircle, TrendingUp, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScheduledReport, ScheduledReportRun } from '../types/scheduledReports';
import { ScheduleBuilderModal } from '../components/scheduled-reports/ScheduleBuilderModal';
import { CreateAdminReportModal } from '../components/scheduled-reports/CreateAdminReportModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Customer {
  customer_id: number;
  company_name: string;
}

interface ScheduleStats {
  active: number;
  paused: number;
  failed: number;
  runsThisWeek: number;
}

function StatsHeader({ stats }: { stats: ScheduleStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <PlayCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <PauseCircle className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
            <p className="text-sm text-gray-500">Paused</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.runsThisWeek}</p>
            <p className="text-sm text-gray-500">Runs This Week</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduledReportsPage() {
  const navigate = useNavigate();
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();

  const showAdminView = isAdmin() && !isViewingAsCustomer;

  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersMap, setCustomersMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, ScheduledReportRun[]>>({});
  const [runningSchedule, setRunningSchedule] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateAdminReport, setShowCreateAdminReport] = useState(false);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerId, showAdminView]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (showAdminView) {
        const [schedulesResult, customersResult] = await Promise.all([
          supabase
            .from('scheduled_reports')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('customer')
            .select('customer_id, company_name')
            .order('company_name')
        ]);

        if (schedulesResult.error) throw schedulesResult.error;
        if (customersResult.error) throw customersResult.error;

        setSchedules(schedulesResult.data || []);
        setCustomers(customersResult.data || []);

        const map = new Map<number, string>();
        (customersResult.data || []).forEach(c => {
          map.set(c.customer_id, c.company_name);
        });
        setCustomersMap(map);
      } else {
        const { data, error } = await supabase
          .from('scheduled_reports')
          .select('*')
          .eq('customer_id', effectiveCustomerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSchedules(data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: number | null): string => {
    if (!customerId) return 'Unknown';
    return customersMap.get(customerId) || `Unknown (${customerId})`;
  };

  const customerSchedules = useMemo(() => {
    return schedules.filter(s => s.report_scope === 'customer' || !s.report_scope);
  }, [schedules]);

  const adminSchedules = useMemo(() => {
    return schedules.filter(s => s.report_scope === 'admin');
  }, [schedules]);

  const stats = useMemo((): ScheduleStats => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      active: schedules.filter(s => s.is_active).length,
      paused: schedules.filter(s => !s.is_active).length,
      failed: schedules.filter(s => s.last_run_status === 'failed').length,
      runsThisWeek: schedules.reduce((acc, s) => {
        if (s.last_run_at && new Date(s.last_run_at) > weekAgo) {
          return acc + 1;
        }
        return acc;
      }, 0)
    };
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const baseSchedules = activeTab === 'customer' ? customerSchedules : adminSchedules;

    return baseSchedules.filter(schedule => {
      if (customerFilter !== 'all' && schedule.customer_id !== parseInt(customerFilter)) {
        return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !schedule.is_active) return false;
        if (statusFilter === 'paused' && schedule.is_active) return false;
        if (statusFilter === 'failed' && schedule.last_run_status !== 'failed') return false;
      }

      if (typeFilter !== 'all' && schedule.report_type !== typeFilter) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = schedule.name.toLowerCase().includes(query);
        const matchesReportName = schedule.report_name.toLowerCase().includes(query);
        const matchesCustomer = getCustomerName(schedule.customer_id).toLowerCase().includes(query);
        if (!matchesName && !matchesReportName && !matchesCustomer) return false;
      }

      return true;
    });
  }, [activeTab, customerSchedules, adminSchedules, customerFilter, statusFilter, typeFilter, searchQuery, customers]);

  const loadRuns = async (scheduleId: string) => {
    const { data } = await supabase
      .from('scheduled_report_runs')
      .select('*')
      .eq('scheduled_report_id', scheduleId)
      .order('started_at', { ascending: false })
      .limit(5);

    setRuns(prev => ({ ...prev, [scheduleId]: data || [] }));
  };

  const toggleActive = async (schedule: ScheduledReport) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .update({ is_active: !schedule.is_active, updated_at: new Date().toISOString() })
      .eq('id', schedule.id);

    if (!error) {
      setSchedules(prev => prev.map(s =>
        s.id === schedule.id ? { ...s, is_active: !s.is_active } : s
      ));
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);

    if (!error) {
      setSchedules(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const runNow = async (scheduleId: string) => {
    if (!confirm('Run this schedule now? This will generate and send the report immediately.')) return;

    setRunningSchedule(scheduleId);

    try {
      await supabase
        .from('scheduled_reports')
        .update({ next_run_at: new Date().toISOString() })
        .eq('id', scheduleId);

      const { error } = await supabase.functions.invoke('run-scheduled-reports');

      if (error) throw error;

      alert('Report triggered successfully! Check your email and/or the run history below.');

      loadData();
      if (expandedSchedule === scheduleId) {
        loadRuns(scheduleId);
      } else {
        setExpandedSchedule(scheduleId);
        loadRuns(scheduleId);
      }
    } catch (err) {
      console.error('Failed to run schedule:', err);
      alert(`Failed to run: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRunningSchedule(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedSchedule === id) {
      setExpandedSchedule(null);
    } else {
      setExpandedSchedule(id);
      if (!runs[id]) {
        loadRuns(id);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredSchedules.map(s => s.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    const ids = Array.from(selectedIds);

    if (action === 'delete') {
      if (!confirm(`Delete ${ids.length} scheduled reports? This cannot be undone.`)) return;
      const { error } = await supabase.from('scheduled_reports').delete().in('id', ids);
      if (!error) {
        setSchedules(prev => prev.filter(s => !ids.includes(s.id)));
      }
    } else if (action === 'pause') {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (!error) {
        setSchedules(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_active: false } : s));
      }
    } else if (action === 'resume') {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (!error) {
        setSchedules(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_active: true } : s));
      }
    }

    clearSelection();
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getReportTypeBadge = (reportType: string) => {
    if (reportType === 'ai_report') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          <Brain className="w-3 h-3" />
          AI Report
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        <FileText className="w-3 h-3" />
        Custom Report
      </span>
    );
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
            <CheckCircle className="w-3 h-3" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
            Never run
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeFiltersCount = [
    customerFilter !== 'all',
    statusFilter !== 'all',
    typeFilter !== 'all',
    searchQuery !== ''
  ].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-gray-500 mt-1">Automatically generate and deliver reports</p>
        </div>
        <div className="flex items-center gap-4">
          {showAdminView && schedules.length > 0 && (
            <div className="text-sm text-gray-500">
              {filteredSchedules.length} of {activeTab === 'customer' ? customerSchedules.length : adminSchedules.length} schedules
            </div>
          )}
          {showAdminView && activeTab === 'admin' && (
            <button
              onClick={() => setShowCreateAdminReport(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Admin Report
            </button>
          )}
        </div>
      </div>

      {showAdminView && schedules.length > 0 && (
        <StatsHeader stats={stats} />
      )}

      {showAdminView && (
        <div className="border-b mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('customer'); clearSelection(); }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'customer'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer Reports
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {customerSchedules.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('admin'); clearSelection(); }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'admin'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Reports (Internal)
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {adminSchedules.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {showAdminView && (activeTab === 'customer' ? customerSchedules.length > 0 : adminSchedules.length > 0) && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'customer' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Customer:</label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Customers</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="ai_report">AI Reports</option>
                <option value="custom_report">Custom Reports</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setCustomerFilter('all');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {showAdminView && filteredSchedules.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <button
            onClick={selectAll}
            className="text-blue-600 hover:text-blue-800"
          >
            Select all ({filteredSchedules.length})
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled reports</h3>
          <p className="text-gray-500 mb-6">
            Go to any saved report and click "Schedule" to set up automatic delivery.
          </p>
          <button
            onClick={() => navigate('/ai-studio')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            View Reports
          </button>
        </div>
      ) : filteredSchedules.length === 0 ? (
        activeTab === 'admin' && adminSchedules.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Admin Reports Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Admin reports are internal reports for Go Rocket team members.
              Create cross-customer analytics and summaries.
            </p>
            <button
              onClick={() => setShowCreateAdminReport(true)}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Admin Report
            </button>
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matching schedules</h3>
            <p className="text-gray-500 mb-4">
              No scheduled reports match your current filters.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setCustomerFilter('all');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map(schedule => (
            <div
              key={schedule.id}
              className={`bg-white border rounded-xl overflow-hidden ${
                selectedIds.has(schedule.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {showAdminView && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(schedule.id)}
                          onChange={() => toggleSelect(schedule.id)}
                          className="h-4 w-4 rounded border-gray-300 mt-1"
                        />
                      )}
                      <div className="flex-1">
                        {schedule.report_scope === 'admin' && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              INTERNAL
                            </span>
                            <span className="text-sm text-gray-500">
                              Scope: {schedule.target_customer_ids?.length
                                ? `${schedule.target_customer_ids.length} customers`
                                : 'All Customers'}
                            </span>
                          </div>
                        )}
                        {showAdminView && activeTab === 'customer' && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">{getCustomerName(schedule.customer_id)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleActive(schedule)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              schedule.is_active
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={schedule.is_active ? 'Pause schedule' : 'Resume schedule'}
                          >
                            {schedule.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                              {getReportTypeBadge(schedule.report_type)}
                            </div>
                            <p className="text-sm text-gray-500">{schedule.report_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}
                            {schedule.frequency === 'weekly' && schedule.day_of_week !== null && ` on ${DAYS_SHORT[schedule.day_of_week]}`}
                          </span>

                          <span className="flex items-center gap-1">
                            {schedule.delivery_email && <Mail className="w-4 h-4" />}
                            {schedule.delivery_notification && <Bell className="w-4 h-4" />}
                          </span>

                          {getStatusBadge(schedule.last_run_status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runNow(schedule.id)}
                      disabled={runningSchedule === schedule.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                      title="Run now"
                    >
                      {runningSchedule === schedule.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingSchedule(schedule)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Edit schedule"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(schedule.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Show run history"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        expandedSchedule === schedule.id ? 'rotate-90' : ''
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Next run: {schedule.is_active ? formatDateTime(schedule.next_run_at) : 'Paused'}
                  </span>
                  <span className="text-gray-500">
                    {schedule.run_count} run{schedule.run_count !== 1 ? 's' : ''} total
                  </span>
                </div>
              </div>

              {expandedSchedule === schedule.id && (
                <div className="border-t bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Runs</h4>
                  {runs[schedule.id]?.length ? (
                    <div className="space-y-2">
                      {runs[schedule.id].map(run => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusBadge(run.status)}
                            <span className="text-sm text-gray-600">
                              {formatDateTime(run.started_at)}
                            </span>
                            {run.date_range_start && run.date_range_end && (
                              <span className="text-sm text-gray-400">
                                ({new Date(run.date_range_start).toLocaleDateString()} - {new Date(run.date_range_end).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {run.record_count !== null && (
                              <span>{run.record_count} records</span>
                            )}
                            {run.emails_sent > 0 && (
                              <span>{run.emails_sent} email{run.emails_sent !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No runs yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-6 z-50">
          <span className="font-medium">{selectedIds.size} selected</span>

          <button
            onClick={() => bulkAction('pause')}
            className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors"
          >
            <PauseCircle className="h-4 w-4" />
            Pause
          </button>

          <button
            onClick={() => bulkAction('resume')}
            className="flex items-center gap-1.5 hover:text-green-400 transition-colors"
          >
            <PlayCircle className="h-4 w-4" />
            Resume
          </button>

          <button
            onClick={() => bulkAction('delete')}
            className="flex items-center gap-1.5 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <div className="w-px h-6 bg-gray-600" />

          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 hover:text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}

      {editingSchedule && (
        <ScheduleBuilderModal
          isOpen={true}
          onClose={() => setEditingSchedule(null)}
          onSave={(updated) => {
            setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
            setEditingSchedule(null);
          }}
          existingSchedule={editingSchedule}
        />
      )}

      <CreateAdminReportModal
        isOpen={showCreateAdminReport}
        onClose={() => setShowCreateAdminReport(false)}
        onCreated={() => {
          setShowCreateAdminReport(false);
          loadData();
        }}
        customers={customers}
      />
    </div>
  );
}

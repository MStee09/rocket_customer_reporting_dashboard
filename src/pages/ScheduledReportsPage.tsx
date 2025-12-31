import { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader2, Users, Shield, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScheduledReport, ScheduledReportRun } from '../types/scheduledReports';
import {
  ScheduleBuilderSingleScreen,
  CreateAdminReportModal,
  ScheduleFilters,
  ScheduleStats,
  ScheduleCard,
  BulkActionsBar,
} from '../components/scheduled-reports';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

interface Customer {
  customer_id: number;
  company_name: string;
}

interface ScheduleStatsData {
  active: number;
  paused: number;
  failed: number;
  runsThisWeek: number;
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

  const stats = useMemo((): ScheduleStatsData => {
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
  }, [activeTab, customerSchedules, adminSchedules, customerFilter, statusFilter, typeFilter, searchQuery]);

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

  const clearFilters = () => {
    setCustomerFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
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
        <ScheduleStats stats={stats} />
      )}

      {showAdminView && (
        <div className="border-b mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab('customer'); clearSelection(); }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'customer'
                  ? 'border-rocket-600 text-rocket-600'
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
        <ScheduleFilters
          customers={customers}
          customerFilter={customerFilter}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          searchQuery={searchQuery}
          onCustomerFilterChange={setCustomerFilter}
          onStatusFilterChange={setStatusFilter}
          onTypeFilterChange={setTypeFilter}
          onSearchQueryChange={setSearchQuery}
          onClearFilters={clearFilters}
          activeFiltersCount={activeFiltersCount}
          showCustomerFilter={activeTab === 'customer'}
        />
      )}

      {showAdminView && filteredSchedules.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <button
            onClick={selectAll}
            className="text-rocket-600 hover:text-rocket-800"
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
        <Card variant="outlined" padding="lg">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled reports</h3>
            <p className="text-gray-500 mb-6">
              Go to any saved report and click "Schedule" to set up automatic delivery.
            </p>
            <button
              onClick={() => navigate('/ai-studio')}
              className="px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white rounded-lg"
            >
              View Reports
            </button>
          </div>
        </Card>
      ) : filteredSchedules.length === 0 ? (
        activeTab === 'admin' && adminSchedules.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <div className="text-center">
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
          </Card>
        ) : (
          <Card variant="outlined" padding="lg">
            <div className="text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching schedules</h3>
              <p className="text-gray-500 mb-4">
                No scheduled reports match your current filters.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-rocket-600 hover:text-rocket-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map(schedule => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              runs={runs[schedule.id] || []}
              isExpanded={expandedSchedule === schedule.id}
              isSelected={selectedIds.has(schedule.id)}
              isRunning={runningSchedule === schedule.id}
              showAdminView={showAdminView}
              showCustomerColumn={showAdminView && activeTab === 'customer'}
              getCustomerName={getCustomerName}
              onToggleActive={() => toggleActive(schedule)}
              onEdit={() => setEditingSchedule(schedule)}
              onDelete={() => deleteSchedule(schedule.id)}
              onRunNow={() => runNow(schedule.id)}
              onToggleExpand={() => toggleExpand(schedule.id)}
              onToggleSelect={() => toggleSelect(schedule.id)}
            />
          ))}
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onPause={() => bulkAction('pause')}
        onResume={() => bulkAction('resume')}
        onDelete={() => bulkAction('delete')}
        onClear={clearSelection}
      />

      {editingSchedule && (
        <ScheduleBuilderSingleScreen
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

import { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UnifiedReportsList } from '../components/reports/UnifiedReportsList';
import { loadAIReports, SavedAIReport, deleteAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  next_run_at: string | null;
  is_active: boolean;
  report_type: string;
  report_id: string;
}

export function ReportsPage() {
  const { user, effectiveCustomerId } = useAuth();
  const { reports: customReportsFromStorage, isLoading: customReportsLoading, deleteReport: deleteCustomReport } = useCustomerReports();

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [aiReports, setAIReports] = useState<SavedAIReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllReports();
  }, [user, effectiveCustomerId]);

  async function loadAllReports() {
    if (!user || !effectiveCustomerId) {
      setIsLoading(false);
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
      setIsLoading(false);
    }
  }

  const unifiedReports = useMemo(() => {
    const scheduledReportIds = new Set(scheduledReports.map(s => s.report_id));

    const reports = [
      ...aiReports.map((report) => ({
        id: report.id,
        name: report.name,
        description: report.definition?.description,
        type: 'ai' as const,
        isScheduled: scheduledReportIds.has(report.id),
        scheduleFrequency: scheduledReports.find(s => s.report_id === report.id)?.frequency,
        nextRun: scheduledReports.find(s => s.report_id === report.id)?.next_run_at || undefined,
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
      })),
      ...customReportsFromStorage.map((report) => ({
        id: report.id,
        name: report.name,
        description: undefined,
        type: 'custom' as const,
        isScheduled: scheduledReportIds.has(report.id),
        scheduleFrequency: scheduledReports.find(s => s.report_id === report.id)?.frequency,
        nextRun: scheduledReports.find(s => s.report_id === report.id)?.next_run_at || undefined,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt || report.createdAt,
      })),
    ];

    return reports.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [aiReports, customReportsFromStorage, scheduledReports]);

  async function handleDeleteReport(reportId: string) {
    if (!effectiveCustomerId) return;

    const report = unifiedReports.find(r => r.id === reportId);
    if (!report) return;

    if (!confirm(`Are you sure you want to delete "${report.name}"?`)) return;

    try {
      if (report.type === 'ai') {
        await deleteAIReport(effectiveCustomerId.toString(), reportId);
        setAIReports(aiReports.filter((r) => r.id !== reportId));
      } else {
        await deleteCustomReport(reportId);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report');
    }
  }

  if (isLoading || customReportsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">View and manage all your saved and scheduled reports</p>
        </div>
        <Link
          to="/analyze"
          className="flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Report
        </Link>
      </div>

      <UnifiedReportsList
        reports={unifiedReports}
        onDelete={handleDeleteReport}
      />
    </div>
  );
}

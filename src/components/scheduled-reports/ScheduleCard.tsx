import {
  Clock,
  Mail,
  Bell,
  Play,
  Pause,
  Trash2,
  Edit,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  FileText,
  Brain,
  Building2,
  Lock,
} from 'lucide-react';
import { ScheduledReport, ScheduledReportRun } from '../../types/scheduledReports';
import { Card } from '../ui/Card';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getReportTypeBadge(reportType: string) {
  if (reportType === 'ai_report') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
        <Brain className="w-3 h-3" />
        AI Report
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
      <FileText className="w-3 h-3" />
      Custom Report
    </span>
  );
}

function getStatusBadge(status: string | null) {
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rocket-100 text-rocket-700 rounded-full text-xs">
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
}

interface ScheduleCardProps {
  schedule: ScheduledReport;
  runs: ScheduledReportRun[];
  isExpanded: boolean;
  isSelected: boolean;
  isRunning: boolean;
  showAdminView: boolean;
  showCustomerColumn: boolean;
  getCustomerName: (customerId: number | null) => string;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRunNow: () => void;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
}

export function ScheduleCard({
  schedule,
  runs,
  isExpanded,
  isSelected,
  isRunning,
  showAdminView,
  showCustomerColumn,
  getCustomerName,
  onToggleActive,
  onEdit,
  onDelete,
  onRunNow,
  onToggleExpand,
  onToggleSelect,
}: ScheduleCardProps) {
  return (
    <Card
      variant="default"
      padding="none"
      className={`overflow-hidden ${isSelected ? 'ring-2 ring-rocket-500' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {showAdminView && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onToggleSelect}
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
                {showCustomerColumn && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{getCustomerName(schedule.customer_id)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onToggleActive}
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
              onClick={onRunNow}
              disabled={isRunning}
              className="p-2 text-gray-400 hover:text-rocket-600 hover:bg-rocket-50 rounded-lg disabled:opacity-50"
              title="Run now"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Edit schedule"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete schedule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Show run history"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
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

      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Runs</h4>
          {runs?.length ? (
            <div className="space-y-2">
              {runs.map(run => (
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
    </Card>
  );
}

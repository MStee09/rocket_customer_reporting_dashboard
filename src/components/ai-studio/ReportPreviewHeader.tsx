import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  Mail,
  Check,
  Loader2,
  Save,
  LayoutDashboard,
  Pencil,
  Table,
  Calendar,
} from 'lucide-react';
import { ExportMenu } from '../ui/ExportMenu';
import { ColumnConfig } from '../../services/exportService';
import { AIReportDefinition } from '../../types/aiReport';
import { InlineScheduler } from '../reports/InlineScheduler';
import { ScheduledReport } from '../../types/scheduledReports';

interface ReportPreviewHeaderProps {
  report: AIReportDefinition;
  editableTitle: string;
  isEditingTitle: boolean;
  onEditTitle: (editing: boolean) => void;
  onTitleChange: (title: string) => void;
  onRefresh: () => void;
  onExportPDF: () => void;
  onEmail: () => void;
  onAddToDashboard: () => void;
  onSave: () => void;
  isExecuting: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  dashboardAddSuccess: boolean;
  hasExportableData: boolean;
  exportData: Record<string, unknown>[];
  exportColumns: ColumnConfig[];
  onEditColumns?: () => void;
}

export function ReportPreviewHeader({
  report,
  editableTitle,
  isEditingTitle,
  onEditTitle,
  onTitleChange,
  onRefresh,
  onExportPDF,
  onEmail,
  onAddToDashboard,
  onSave,
  isExecuting,
  isSaving,
  saveSuccess,
  dashboardAddSuccess,
  hasExportableData,
  exportData,
  exportColumns,
  onEditColumns,
}: ReportPreviewHeaderProps) {
  const [showInlineScheduler, setShowInlineScheduler] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const schedulerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (schedulerRef.current && !schedulerRef.current.contains(event.target as Node)) {
        setShowInlineScheduler(false);
      }
    }

    if (showInlineScheduler) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showInlineScheduler]);

  const handleScheduleCreated = (_schedule: ScheduledReport) => {
    setShowInlineScheduler(false);
    setScheduleSuccess(true);
    setTimeout(() => setScheduleSuccess(false), 3000);
  };

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => onEditTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditTitle(false);
                if (e.key === 'Escape') {
                  onEditTitle(false);
                  onTitleChange(report.name || 'Untitled Report');
                }
              }}
              className="font-semibold text-gray-900 border-b-2 border-rocket-500 outline-none bg-transparent w-full"
              autoFocus
            />
          ) : (
            <h2
              className="font-semibold text-gray-900 truncate cursor-pointer hover:text-rocket-600 flex items-center gap-2 group"
              onClick={() => onEditTitle(true)}
              title="Click to edit title"
            >
              {editableTitle}
              <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
          )}
          {report.description && (
            <p className="text-sm text-gray-500 truncate">
              {report.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRefresh}
            disabled={isExecuting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
          </button>
          {onEditColumns && (
            <button
              onClick={onEditColumns}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit columns in Report Builder"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Columns</span>
            </button>
          )}
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {hasExportableData && (
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              filename={`ai-report-${editableTitle || 'export'}-${new Date().toISOString().split('T')[0]}`}
              title={editableTitle || 'AI Report'}
              formats={['csv', 'excel']}
            />
          )}
          {hasExportableData && (
            <button
              onClick={onEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Email Report"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </button>
          )}
          <button
            onClick={onAddToDashboard}
            disabled={dashboardAddSuccess || isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dashboardAddSuccess
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            } disabled:opacity-50`}
            title="Add to Dashboard"
          >
            {dashboardAddSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Added!</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </>
            )}
          </button>
          <div className="relative" ref={schedulerRef}>
            <button
              onClick={() => setShowInlineScheduler(!showInlineScheduler)}
              disabled={scheduleSuccess}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                scheduleSuccess
                  ? 'bg-green-600 text-white'
                  : showInlineScheduler
                  ? 'bg-rocket-100 text-rocket-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Schedule recurring delivery"
            >
              {scheduleSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Scheduled!</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </>
              )}
            </button>
            {showInlineScheduler && report && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <InlineScheduler
                  report={{
                    id: report.id || `temp-${Date.now()}`,
                    name: editableTitle || report.name || 'AI Report',
                    type: 'ai_report',
                  }}
                  onScheduleCreated={handleScheduleCreated}
                  onCancel={() => setShowInlineScheduler(false)}
                  defaultExpanded={true}
                />
              </div>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={isSaving || saveSuccess}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-rocket-600 text-white hover:bg-rocket-700'
            } disabled:opacity-90`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Saved!</span>
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

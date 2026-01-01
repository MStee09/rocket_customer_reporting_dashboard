import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Calendar, Clock, MoreHorizontal, Trash2,
  Play, ExternalLink, FileText
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ReportsHubFilters } from './ReportsHubFilters';

interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'ai' | 'custom' | 'scheduled';
  isScheduled: boolean;
  scheduleFrequency?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UnifiedReportsListProps {
  reports: Report[];
  onDelete: (id: string) => void;
  onRunNow?: (id: string) => void;
}

export function UnifiedReportsList({ reports, onDelete, onRunNow }: UnifiedReportsListProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'scheduled' | 'saved'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: reports.length,
    ai: reports.filter(r => r.type === 'ai').length,
    scheduled: reports.filter(r => r.isScheduled).length,
    saved: reports.filter(r => !r.isScheduled).length,
  }), [reports]);

  const filteredReports = useMemo(() => {
    switch (activeFilter) {
      case 'ai':
        return reports.filter(r => r.type === 'ai');
      case 'scheduled':
        return reports.filter(r => r.isScheduled);
      case 'saved':
        return reports.filter(r => !r.isScheduled);
      default:
        return reports;
    }
  }, [reports, activeFilter]);

  const getReportIcon = (report: Report) => {
    if (report.type === 'ai') return Sparkles;
    if (report.isScheduled) return Calendar;
    return FileText;
  };

  const getReportBadges = (report: Report) => {
    const badges = [];
    if (report.type === 'ai') {
      badges.push({ label: 'AI', className: 'bg-blue-100 text-blue-700' });
    }
    if (report.isScheduled) {
      badges.push({ label: report.scheduleFrequency || 'Scheduled', className: 'bg-teal-100 text-teal-700' });
    }
    return badges;
  };

  return (
    <div className="space-y-6">
      <ReportsHubFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No reports found</h3>
          <p className="text-slate-500">
            {activeFilter === 'all'
              ? 'Create your first report using AI or the report builder'
              : `No ${activeFilter} reports yet`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredReports.map((report) => {
            const Icon = getReportIcon(report);
            const badges = getReportBadges(report);

            return (
              <div
                key={report.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => navigate(report.type === 'ai' ? `/ai-studio?report=${report.id}` : `/custom-reports/${report.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${report.type === 'ai' ? 'bg-blue-100' : report.isScheduled ? 'bg-teal-100' : 'bg-slate-100'}
                  `}>
                    <Icon className={`w-5 h-5 ${report.type === 'ai' ? 'text-blue-600' : report.isScheduled ? 'text-teal-600' : 'text-slate-600'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate group-hover:text-rocket-600 transition-colors">
                        {report.name}
                      </h3>
                      {badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    {report.description && (
                      <p className="text-sm text-slate-500 truncate mb-2">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDistanceToNow(new Date(report.updatedAt || report.createdAt), { addSuffix: true })}
                      </span>
                      {report.isScheduled && report.nextRun && (
                        <span className="flex items-center gap-1 text-teal-500">
                          <Calendar className="w-3 h-3" />
                          Next: {format(new Date(report.nextRun), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === report.id ? null : report.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {openMenuId === report.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(report.type === 'ai' ? `/ai-studio?report=${report.id}` : `/custom-reports/${report.id}`);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </button>
                        {report.isScheduled && onRunNow && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRunNow(report.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Run Now
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(report.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

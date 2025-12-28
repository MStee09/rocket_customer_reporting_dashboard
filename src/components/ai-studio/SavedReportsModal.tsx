import { useState, useMemo } from 'react';
import {
  X,
  Search,
  FileText,
  Clock,
  Trash2,
  Download,
  Eye,
  Pencil,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  PieChart,
  Table2,
  ArrowUpDown,
  Loader2,
  Sparkles
} from 'lucide-react';
import { SavedAIReport } from '../../services/aiReportService';

interface SavedReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: SavedAIReport[];
  isLoading: boolean;
  onView: (report: SavedAIReport) => void;
  onEdit: (report: SavedAIReport) => void;
  onDelete: (reportId: string) => void;
  onExport: (report: SavedAIReport) => void;
}

type SortOption = 'newest' | 'oldest' | 'name';

function getReportIcon(report: SavedAIReport) {
  const sections = report.definition?.sections || [];
  const hasChart = sections.some(s => s.type === 'chart');
  const hasTable = sections.some(s => s.type === 'table');
  const hasStats = sections.some(s => s.type === 'stat_row' || s.type === 'stat_grid');

  if (hasChart) return BarChart3;
  if (hasTable) return Table2;
  if (hasStats) return TrendingUp;
  return FileText;
}

function getReportStats(report: SavedAIReport) {
  const sections = report.definition?.sections || [];
  const charts = sections.filter(s => s.type === 'chart').length;
  const tables = sections.filter(s => s.type === 'table').length;
  const metrics = sections.filter(s => s.type === 'hero_metric' || s.type === 'stat_row' || s.type === 'stat_grid').length;

  return { charts, tables, metrics, total: sections.length };
}

export function SavedReportsModal({
  isOpen,
  onClose,
  reports,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onExport
}: SavedReportsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = reports.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [reports, searchQuery, sortBy]);

  const handleDelete = (reportId: string) => {
    onDelete(reportId);
    setDeleteConfirm(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Report Library</h2>
              <p className="text-sm text-gray-500">
                {reports.length} saved report{reports.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-500">Loading reports...</p>
            </div>
          ) : filteredAndSortedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              {searchQuery ? (
                <>
                  <p className="text-gray-600 font-medium">No reports match your search</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <p className="text-gray-600 font-medium">No saved reports yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create a report using AI and save it to see it here</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedReports.map((report) => {
                const IconComponent = getReportIcon(report);
                const stats = getReportStats(report);
                const isDeleting = deleteConfirm === report.id;

                return (
                  <div
                    key={report.id}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {report.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(report.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      {report.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {report.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {stats.metrics > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {stats.metrics} metric{stats.metrics !== 1 ? 's' : ''}
                          </span>
                        )}
                        {stats.charts > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {stats.charts} chart{stats.charts !== 1 ? 's' : ''}
                          </span>
                        )}
                        {stats.tables > 0 && (
                          <span className="flex items-center gap-1">
                            <Table2 className="w-3.5 h-3.5" />
                            {stats.tables} table{stats.tables !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                      {isDeleting ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-600">Delete this report?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              className="px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onView(report)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => onEdit(report)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => onExport(report)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Export JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(report.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

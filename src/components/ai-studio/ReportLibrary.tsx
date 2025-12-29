import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  Search,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Table2,
} from 'lucide-react';
import { SavedAIReport } from '../../services/aiReportService';
import { Card } from '../ui/Card';

type SortOption = 'newest' | 'oldest' | 'name';

function getReportStats(report: SavedAIReport) {
  const sections = report.definition?.sections || [];
  const charts = sections.filter(s => s.type === 'chart').length;
  const tables = sections.filter(s => s.type === 'table').length;
  const metrics = sections.filter(s => s.type === 'hero_metric' || s.type === 'stat_row' || s.type === 'stat_grid').length;
  return { charts, tables, metrics, total: sections.length };
}

interface ReportLibraryProps {
  reports: SavedAIReport[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onEditReport: (report: SavedAIReport) => void;
  onExportReport: (report: SavedAIReport) => void;
  onDeleteReport: (reportId: string) => void;
  onCreateNew: () => void;
  deleteConfirm: string | null;
  onDeleteConfirmChange: (reportId: string | null) => void;
}

export function ReportLibrary({
  reports,
  isLoading,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onEditReport,
  onExportReport,
  onDeleteReport,
  onCreateNew,
  deleteConfirm,
  onDeleteConfirmChange,
}: ReportLibraryProps) {
  const navigate = useNavigate();

  const filteredAndSortedReports = (() => {
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
  })();

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
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
            <p className="text-gray-500">Loading your reports...</p>
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-lg font-medium text-gray-700">No reports match your search</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700">No saved reports yet</p>
                <p className="text-sm text-gray-400 mt-2 mb-6">Create your first report using AI</p>
                <button
                  onClick={onCreateNew}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rocket-600 text-white hover:bg-rocket-700 rounded-xl transition-colors font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Your First Report
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSortedReports.map((report, index) => {
              const stats = getReportStats(report);
              const isDeleting = deleteConfirm === report.id;
              const accentColors = [
                'bg-blue-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-rose-500',
                'bg-cyan-500',
              ];
              const accent = accentColors[index % accentColors.length];

              return (
                <Card
                  key={report.id}
                  variant="default"
                  padding="none"
                  hover={true}
                  onClick={() => navigate(`/ai-reports/${report.id}`)}
                  className="group overflow-hidden cursor-pointer flex"
                >
                  <div className={`w-1 ${accent} flex-shrink-0`} />

                  <div className="flex-1 min-w-0">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {report.name}
                        </h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {new Date(report.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
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
                            {stats.metrics} metric{stats.metrics > 1 ? 's' : ''}
                          </span>
                        )}
                        {stats.charts > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {stats.charts} chart{stats.charts > 1 ? 's' : ''}
                          </span>
                        )}
                        {stats.tables > 0 && (
                          <span className="flex items-center gap-1">
                            <Table2 className="w-3.5 h-3.5" />
                            {stats.tables} table{stats.tables > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
                      {isDeleting ? (
                        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-red-600">Delete this report?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteConfirmChange(null); }}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteReport(report.id); }}
                              className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/ai-reports/${report.id}`); }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditReport(report); }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Edit
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportReport(report); }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            title="Export"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteConfirmChange(report.id); }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

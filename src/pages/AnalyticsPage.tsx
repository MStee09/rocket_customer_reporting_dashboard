import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, FileText, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportService';
import { getSavedViews } from '../services/savedViewsService';
import type { SavedView } from '../types/customerIntelligence';
import { formatDistanceToNow } from 'date-fns';

interface RecentReport {
  id: string;
  name: string;
  type: 'AI Report' | 'Custom';
  date: string;
  path: string;
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { user, effectiveCustomerId } = useAuth();
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentReports() {
      if (!user || !effectiveCustomerId) {
        setLoading(false);
        return;
      }

      try {
        const [aiReports, savedViews] = await Promise.all([
          loadAIReports(effectiveCustomerId.toString()),
          getSavedViews(user.id, effectiveCustomerId),
        ]);

        const aiReportsFormatted: RecentReport[] = aiReports.map((report: SavedAIReport) => ({
          id: report.id,
          name: report.name,
          type: 'AI Report' as const,
          date: report.createdAt,
          path: `/ai-reports/${report.id}`,
        }));

        const customReportsFormatted: RecentReport[] = savedViews
          .filter((view: SavedView) => view.viewType === 'report')
          .map((view: SavedView) => ({
            id: view.id,
            name: view.name,
            type: 'Custom' as const,
            date: view.updatedAt || view.createdAt,
            path: `/custom-reports/${view.id}`,
          }));

        const allReports = [...aiReportsFormatted, ...customReportsFormatted]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        setRecentReports(allReports);
      } catch (error) {
        console.error('Failed to load recent reports:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecentReports();
  }, [user, effectiveCustomerId]);

  const analyticsTools = [
    {
      title: 'AI Report Studio',
      description: 'Describe what you want in plain English and let AI create it for you.',
      icon: Sparkles,
      path: '/ai-studio',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      hoverBg: 'hover:border-amber-200',
    },
    {
      title: 'Custom Report Builder',
      description: 'Build reports by selecting columns, filters, groupings and visualizations.',
      icon: FileText,
      path: '/custom-reports',
      iconBg: 'bg-rocket-100',
      iconColor: 'text-rocket-600',
      hoverBg: 'hover:border-rocket-200',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Create reports and analyze your freight data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyticsTools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`group bg-white rounded-lg border border-slate-200 p-6 transition-all ${tool.hoverBg} hover:shadow-md`}
          >
            <div className={`w-12 h-12 ${tool.iconBg} rounded-lg flex items-center justify-center mb-4`}>
              <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{tool.title}</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">{tool.description}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-rocket-600 group-hover:gap-3 transition-all">
              <span>Open {tool.title.includes('Builder') ? 'Builder' : 'Studio'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Reports</h2>
          <Link
            to="/reports"
            className="text-sm font-medium text-rocket-600 hover:text-rocket-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-slate-500">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-rocket-600 rounded-full animate-spin"></div>
              Loading reports...
            </div>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">No reports yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Get started by creating your first report
            </p>
            <Link
              to="/ai-studio"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create with AI
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map((report) => (
              <button
                key={report.id}
                onClick={() => navigate(report.path)}
                className="group w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      report.type === 'AI Report'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-rocket-100 text-rocket-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{report.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        report.type === 'AI Report'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rocket-50 text-rocket-700'
                      }`}
                    >
                      {report.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-4 py-2 text-sm font-medium text-rocket-600 group-hover:bg-rocket-50 rounded-lg transition-colors">
                    Open
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

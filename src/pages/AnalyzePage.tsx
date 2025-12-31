import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Table2, Clock, ArrowRight, FolderOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { formatDistanceToNow } from 'date-fns';

type AnalyzeTab = 'start' | 'my-reports';

export function AnalyzePage() {
  const navigate = useNavigate();
  const { user, effectiveCustomerId } = useAuth();
  const { reports: customReports } = useCustomerReports();

  const [activeTab, setActiveTab] = useState<AnalyzeTab>('start');
  const [recentReports, setRecentReports] = useState<Array<{ id: string; name: string; type: 'ai' | 'custom'; date: string }>>([]);
  const [allReports, setAllReports] = useState<SavedAIReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [user, effectiveCustomerId, customReports]);

  async function loadReports() {
    if (!user || !effectiveCustomerId) return;
    setIsLoading(true);

    try {
      const aiReports = await loadAIReports(effectiveCustomerId.toString());
      setAllReports(aiReports);

      const combined = [
        ...aiReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'ai' as const,
          date: r.createdAt,
        })),
        ...customReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'custom' as const,
          date: r.updatedAt || r.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentReports(combined);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAskAI = () => {
    navigate('/ai-studio');
  };

  const handleBuildReport = () => {
    navigate('/custom-reports');
  };

  return (
    <div className="bg-slate-50 -m-6 lg:-m-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Analyze Your Data
          </h1>
          <p className="text-slate-600 text-lg">
            Create reports with AI or build them manually
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('start')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'start'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'my-reports'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            My Reports
            {(allReports.length + customReports.length) > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
                {allReports.length + customReports.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'start' ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <button
                onClick={handleAskAI}
                className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Ask AI
                </h2>
                <p className="text-slate-600 mb-4">
                  Describe what you want in plain language. Best for quick exploration and complex questions.
                </p>
                <div className="flex items-center text-orange-600 font-medium">
                  Get started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={handleBuildReport}
                className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Table2 className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Build Report
                </h2>
                <p className="text-slate-600 mb-4">
                  Select columns, filters, and groupings manually. Best for precise specifications.
                </p>
                <div className="flex items-center text-slate-700 font-medium">
                  Open builder
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {recentReports.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    Recent Reports
                  </h3>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {recentReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => navigate(
                        report.type === 'ai'
                          ? `/ai-reports/${report.id}`
                          : `/custom-reports/${report.id}`
                      )}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        report.type === 'ai'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {report.type === 'ai' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <Table2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {report.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 p-6 bg-slate-100 rounded-xl">
              <h4 className="font-medium text-slate-900 mb-3">Quick tips</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">-</span>
                  <span><strong>Ask AI</strong> works best for questions like "Show me cost trends by carrier" or "Which lanes have the highest spend?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">-</span>
                  <span><strong>Build Report</strong> is better when you know exactly which columns and filters you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">-</span>
                  <span>Any report can be saved, scheduled, or added to your dashboard</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading reports...</div>
            ) : (allReports.length + customReports.length) === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No reports yet</h3>
                <p className="text-slate-500 mb-6">Create your first report to get started</p>
                <button
                  onClick={() => setActiveTab('start')}
                  className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors"
                >
                  Create Report
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {allReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-medium text-slate-700">AI Reports</h3>
                      <span className="text-xs text-slate-400">({allReports.length})</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {allReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => navigate(`/ai-reports/${report.id}`)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{report.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {customReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Table2 className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-medium text-slate-700">Custom Reports</h3>
                      <span className="text-xs text-slate-400">({customReports.length})</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {customReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => navigate(`/custom-reports/${report.id}`)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{report.name}</div>
                            <div className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(report.updatedAt || report.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyzePage;

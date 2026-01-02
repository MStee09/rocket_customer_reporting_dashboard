import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Table2, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { formatDistanceToNow } from 'date-fns';

export function AnalyzePage() {
  const navigate = useNavigate();
  const { user, effectiveCustomerId, isLoading: authLoading } = useAuth();
  const { reports: customReports, isLoading: reportsLoading } = useCustomerReports();

  const [recentReports, setRecentReports] = useState<Array<{ id: string; name: string; type: 'ai' | 'custom'; date: string }>>([]);
  const [allReports, setAllReports] = useState<SavedAIReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const loadReports = useCallback(async () => {
    if (!user || !effectiveCustomerId || authLoading) return;
    setIsLoadingReports(true);

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
      setIsLoadingReports(false);
    }
  }, [user, effectiveCustomerId, authLoading, customReports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleAskAI = useCallback(() => {
    navigate('/ai-studio');
  }, [navigate]);

  const handleBuildReport = useCallback(() => {
    navigate('/custom-reports');
  }, [navigate]);

  if (authLoading) {
    return (
      <div className="bg-slate-50 -m-6 lg:-m-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-rocket-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

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
      </div>
    </div>
  );
}

export default AnalyzePage;

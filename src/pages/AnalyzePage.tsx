/**
 * AnalyzePage - Updated to use InvestigatorUnified
 *
 * Changes from original:
 * - Removed Fast/Deep toggle (AI auto-routes now)
 * - Uses InvestigatorUnified instead of switching between InvestigatorStudio and InvestigatorV3
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table2, Clock, ArrowRight, Loader2, Brain, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportStorageService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { formatDistanceToNow } from 'date-fns';
import { InvestigatorUnified } from '../components/ai/InvestigatorUnified';

export function AnalyzePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, effectiveCustomerId, isAdmin, isViewingAsCustomer, viewingCustomer, customers, isLoading: authLoading } = useAuth();
  const { reports: customReports, isLoading: reportsLoading } = useCustomerReports();

  const [recentReports, setRecentReports] = useState<Array<{ id: string; name: string; type: 'ai' | 'custom'; date: string }>>([]);
  const [allReports, setAllReports] = useState<SavedAIReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [showInvestigator, setShowInvestigator] = useState(false);

  const effectiveCustomerName = isViewingAsCustomer
    ? viewingCustomer?.company_name
    : customers.find((c) => c.customer_id === effectiveCustomerId)?.customer_name;

  useEffect(() => {
    if (searchParams.get('investigator') === 'true') {
      setShowInvestigator(true);
    }
  }, [searchParams]);

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

        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
          <button
            onClick={() => setShowInvestigator(true)}
            className="group p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all text-left relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-medium rounded-full">
              Smart
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              The Investigator
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              AI-powered analysis. Auto-detects simple vs complex questions.
            </p>
            <div className="flex items-center text-orange-600 font-medium text-sm">
              Launch
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={handleBuildReport}
            className="group p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Table2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Build Report
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              Select columns, filters, and groupings manually.
            </p>
            <div className="flex items-center text-slate-700 font-medium text-sm">
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

        <div className="mt-12 p-6 bg-slate-100 rounded-xl max-w-3xl mx-auto">
          <h4 className="font-medium text-slate-900 mb-3">How it works</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">*</span>
              <span><strong>Simple questions</strong> like "What's my average cost?" get quick answers (~5 seconds)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">*</span>
              <span><strong>Complex questions</strong> like "Why did costs spike?" trigger deep investigation (~15 seconds)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-500 mt-0.5">*</span>
              <span>The AI automatically chooses the right approach based on your question</span>
            </li>
          </ul>
        </div>
      </div>

      {showInvestigator && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">The Investigator</h2>
                  <p className="text-xs text-gray-500">Smart AI analysis</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowInvestigator(false);
                  setSearchParams({});
                }}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {effectiveCustomerId && (
                <InvestigatorUnified
                  customerId={String(effectiveCustomerId)}
                  customerName={effectiveCustomerName}
                  isAdmin={isAdmin()}
                  userId={user?.id}
                  userEmail={user?.email}
                  embedded
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyzePage;

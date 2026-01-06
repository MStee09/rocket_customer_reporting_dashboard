import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, Zap } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { InvestigatorStudio } from '../components/ai/InvestigatorStudio';
import { InvestigatorV3 } from '../components/ai/InvestigatorV3';
import type { ReportDraft } from '../ai/investigator/types';

export function AIReportStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || undefined;
  const { user, isAdmin, effectiveCustomerId, isViewingAsCustomer, viewingCustomer, customers } = useAuth();
  const [mode, setMode] = useState<'fast' | 'deep'>('fast');

  const effectiveCustomerName = isViewingAsCustomer
    ? viewingCustomer?.company_name
    : customers.find((c) => c.customer_id === effectiveCustomerId)?.customer_name;

  const handleReportGenerated = (report: ReportDraft) => {
    console.log('Report generated:', report);
  };

  if (!effectiveCustomerId && !isAdmin()) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-500">Please select a customer to continue.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/analyze')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Analyze"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">The Investigator</h1>
                <p className="text-xs text-gray-500">AI-powered logistics analytics</p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('fast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === 'fast'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Quick answers in ~2 seconds"
              >
                <Zap className="w-3.5 h-3.5" />
                Fast
              </button>
              <button
                onClick={() => setMode('deep')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === 'deep'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Deep investigation with visible reasoning (10-30s)"
              >
                <Brain className="w-3.5 h-3.5" />
                Deep
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          {mode === 'fast' ? (
            <InvestigatorStudio
              customerId={String(effectiveCustomerId)}
              customerName={effectiveCustomerName}
              isAdmin={isAdmin()}
              userId={user?.id}
              userEmail={user?.email}
              onReportGenerated={handleReportGenerated}
              initialQuery={initialQuery}
            />
          ) : (
            <InvestigatorV3 />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default AIReportStudioPage;

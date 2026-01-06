import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { FloatingAIButton } from './ai/FloatingAIButton';
import { WelcomeModal, useWelcomeModal } from './onboarding';
import { useAuth } from '../contexts/AuthContext';
import { UserCog, Eye, X, AlertTriangle } from 'lucide-react';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showWelcome, dismissWelcome } = useWelcomeModal();
  const {
    isViewingAsCustomer,
    viewingCustomer,
    setViewingAsCustomerId,
    isImpersonating,
    impersonatingCustomer,
    setImpersonatingCustomerId,
  } = useAuth();

  const hasBanner = isImpersonating || isViewingAsCustomer;
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitImpersonation = () => {
    setShowExitConfirm(false);
    setImpersonatingCustomerId(null);
  };

  return (
    <>
      <div
        className={`flex h-screen bg-slate-50 ${
          isImpersonating ? 'ring-4 ring-inset ring-red-500' : ''
        }`}
      >
        {isImpersonating && (
          <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white px-4 py-3 shadow-2xl z-[100]">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
              }}
            />
            <div className="relative flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span className="font-black text-sm uppercase tracking-wide">Impersonation Mode</span>
              </div>
              {impersonatingCustomer && (
                <span className="font-bold text-lg">
                  {impersonatingCustomer.company_name}
                </span>
              )}
              <span className="text-red-200 text-sm hidden sm:inline mx-2">
                - Actions affect customer data
              </span>
              <button
                onClick={handleExitImpersonation}
                className="flex items-center gap-1.5 bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-bold ml-4 shadow-lg"
              >
                <X className="w-4 h-4" />
                Exit Now
              </button>
            </div>
          </div>
        )}

        {isViewingAsCustomer && viewingCustomer && !isImpersonating && (
          <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
            <Eye className="w-4 h-4" />
            <span className="font-medium">
              Viewing data for: {viewingCustomer.company_name}
            </span>
            <span className="text-blue-200 text-sm hidden sm:inline">
              - Admin tools still available
            </span>
            <button
              onClick={() => setViewingAsCustomerId(null)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors text-sm font-medium ml-4"
            >
              <X className="w-4 h-4" />
              Exit
            </button>
          </div>
        )}

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            isImpersonating ? 'pt-14' : hasBanner ? 'pt-10' : ''
          }`}
        >
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto w-full min-w-0">
            <div className="p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>

        <FloatingAIButton />
        <WelcomeModal isOpen={showWelcome} onClose={dismissWelcome} />
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Exit Impersonation
                </h3>
                <p className="text-sm text-gray-500">
                  Currently impersonating {impersonatingCustomer?.company_name}
                </p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              You'll return to your admin account. Any unsaved work as this
              customer will be preserved.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExitImpersonation}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                Exit Impersonation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

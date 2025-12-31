import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { UserCog, Eye, X } from 'lucide-react';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    isViewingAsCustomer,
    viewingCustomer,
    setViewingAsCustomerId,
    isImpersonating,
    impersonatingCustomer,
    setImpersonatingCustomerId,
  } = useAuth();

  const hasBanner = isImpersonating || isViewingAsCustomer;

  return (
    <div className="flex h-screen bg-slate-50">
      {isImpersonating && impersonatingCustomer && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <UserCog className="w-5 h-5" />
          <span className="font-semibold">
            IMPERSONATING: {impersonatingCustomer.company_name}
          </span>
          <span className="text-amber-100 text-sm hidden sm:inline">
            - You're seeing exactly what this customer sees
          </span>
          <button
            onClick={() => setImpersonatingCustomerId(null)}
            className="flex items-center gap-1 bg-white text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
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

      <div className={`flex-1 flex flex-col overflow-hidden ${hasBanner ? 'pt-10' : ''}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto w-full min-w-0">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

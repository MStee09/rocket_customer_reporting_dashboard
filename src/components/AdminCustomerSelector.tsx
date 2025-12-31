import { useAuth } from '../contexts/AuthContext';
import { X, Eye, UserCog, Shield } from 'lucide-react';

export function AdminCustomerSelector() {
  const {
    viewingAsCustomerId,
    setViewingAsCustomerId,
    isViewingAsCustomer,
    viewingCustomer,
    impersonatingCustomerId,
    setImpersonatingCustomerId,
    isImpersonating,
    impersonatingCustomer,
  } = useAuth();

  const handleExitViewing = () => {
    setViewingAsCustomerId(null);
  };

  const handleExitImpersonation = () => {
    setImpersonatingCustomerId(null);
  };

  if (isImpersonating && impersonatingCustomer) {
    return (
      <button
        onClick={handleExitImpersonation}
        className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-colors text-sm font-medium"
      >
        <UserCog className="w-4 h-4" />
        <span className="hidden md:inline">Impersonating: {impersonatingCustomer.company_name}</span>
        <span className="md:hidden">Impersonating</span>
        <X className="w-4 h-4 ml-1" />
      </button>
    );
  }

  if (isViewingAsCustomer && viewingCustomer) {
    return (
      <button
        onClick={handleExitViewing}
        className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden md:inline">Viewing: {viewingCustomer.company_name}</span>
        <span className="md:hidden">Viewing</span>
        <X className="w-4 h-4 ml-1" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium">
      <Shield className="w-4 h-4" />
      <span className="hidden md:inline">Admin View</span>
    </div>
  );
}

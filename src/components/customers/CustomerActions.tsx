import { Eye, UserCog } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CustomerActionsProps {
  customerId: number;
  customerName: string;
}

export function CustomerActions({ customerId, customerName }: CustomerActionsProps) {
  const {
    isAdmin,
    setViewingAsCustomerId,
    setImpersonatingCustomerId,
    isViewingAsCustomer,
    viewingAsCustomerId,
    isImpersonating,
    impersonatingCustomerId,
  } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin()) return null;

  const isCurrentlyViewing = isViewingAsCustomer && viewingAsCustomerId === customerId;
  const isCurrentlyImpersonating = isImpersonating && impersonatingCustomerId === customerId;

  const handleViewAs = () => {
    setViewingAsCustomerId(customerId);
    navigate('/dashboard');
  };

  const handleImpersonate = () => {
    setImpersonatingCustomerId(customerId);
    navigate('/dashboard');
  };

  const handleStopViewing = () => {
    setViewingAsCustomerId(null);
  };

  const handleStopImpersonating = () => {
    setImpersonatingCustomerId(null);
  };

  return (
    <div className="flex items-center gap-2">
      {isCurrentlyViewing ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleStopViewing(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl text-sm font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          Stop Viewing
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); handleViewAs(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm font-medium transition-colors"
          title="See their data with your admin tools"
        >
          <Eye className="w-4 h-4" />
          View Data
        </button>
      )}

      {isCurrentlyImpersonating ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleStopImpersonating(); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl text-sm font-medium transition-colors"
        >
          <UserCog className="w-4 h-4" />
          Stop Impersonating
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); handleImpersonate(); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl text-sm font-medium transition-colors"
          title="See exactly what they see (for debugging)"
        >
          <UserCog className="w-4 h-4" />
          Impersonate
        </button>
      )}
    </div>
  );
}

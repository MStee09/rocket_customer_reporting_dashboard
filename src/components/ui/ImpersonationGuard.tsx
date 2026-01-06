import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, X } from 'lucide-react';

interface ImpersonationGuardContextType {
  guardAction: (action: () => void | Promise<void>, actionName?: string) => void;
  isConfirming: boolean;
}

const ImpersonationGuardContext = createContext<ImpersonationGuardContextType | undefined>(undefined);

interface ConfirmationState {
  isOpen: boolean;
  action: (() => void | Promise<void>) | null;
  actionName: string;
}

export function ImpersonationGuardProvider({ children }: { children: ReactNode }) {
  const { isImpersonating, impersonatingCustomer } = useAuth();
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    action: null,
    actionName: '',
  });

  const guardAction = useCallback(
    (action: () => void | Promise<void>, actionName = 'this action') => {
      if (isImpersonating) {
        setConfirmation({
          isOpen: true,
          action,
          actionName,
        });
      } else {
        action();
      }
    },
    [isImpersonating]
  );

  const handleConfirm = async () => {
    if (confirmation.action) {
      await confirmation.action();
    }
    setConfirmation({ isOpen: false, action: null, actionName: '' });
  };

  const handleCancel = () => {
    setConfirmation({ isOpen: false, action: null, actionName: '' });
  };

  return (
    <ImpersonationGuardContext.Provider value={{ guardAction, isConfirming: confirmation.isOpen }}>
      {children}
      {confirmation.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Impersonation Mode Active</h3>
                <p className="text-sm text-slate-600">
                  Viewing as {impersonatingCustomer?.company_name}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="ml-auto p-1 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-slate-700">
                You are about to <span className="font-semibold">{confirmation.actionName}</span> while
                impersonating a customer account.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                This action will be performed on behalf of the customer. Are you sure you want to proceed?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </ImpersonationGuardContext.Provider>
  );
}

export function useImpersonationGuard() {
  const context = useContext(ImpersonationGuardContext);
  if (context === undefined) {
    throw new Error('useImpersonationGuard must be used within ImpersonationGuardProvider');
  }
  return context;
}

export function useGuardedAction() {
  const { guardAction } = useImpersonationGuard();
  return guardAction;
}

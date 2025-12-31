import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, X, Search, Eye, UserCog, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function AdminCustomerSelector() {
  const {
    customers,
    viewingAsCustomerId,
    setViewingAsCustomerId,
    isViewingAsCustomer,
    viewingCustomer,
    setImpersonatingCustomerId,
    isImpersonating,
    impersonatingCustomer,
    role,
  } = useAuth();

  const isActuallyAdmin = role?.is_admin ?? false;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleViewCustomer = (customerId: number) => {
    setViewingAsCustomerId(customerId);
    setIsOpen(false);
  };

  const handleExitViewing = () => {
    setViewingAsCustomerId(null);
    setIsOpen(false);
  };

  const handleExitImpersonation = () => {
    setImpersonatingCustomerId(null);
    setIsOpen(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isActuallyAdmin) return null;

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
          isViewingAsCustomer
            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
      >
        {isViewingAsCustomer ? (
          <>
            <Eye className="w-4 h-4" />
            <span className="hidden md:inline">Viewing: {viewingCustomer?.company_name}</span>
            <span className="md:hidden">Viewing</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            <span className="hidden md:inline">Admin View</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in">
          {isViewingAsCustomer && (
            <div className="px-2 pb-2 mb-2 border-b border-slate-100">
              <button
                onClick={handleExitViewing}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <Shield className="w-4 h-4 text-slate-400" />
                Return to Admin View
              </button>
            </div>
          )}

          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="px-4 py-1.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              View Data For
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto px-2">
            {filteredCustomers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No customers found
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.customer_id}
                  onClick={() => handleViewCustomer(customer.customer_id)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-sm rounded-lg transition-colors ${
                    viewingAsCustomerId === customer.customer_id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700'
                  }`}
                >
                  {customer.customer_name}
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 mt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              To impersonate a customer, visit their profile page
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

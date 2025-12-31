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
    impersonatingCustomerId,
    setImpersonatingCustomerId,
    isImpersonating,
    impersonatingCustomer,
  } = useAuth();

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
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleViewCustomer = (customerId: number) => {
    setViewingAsCustomerId(customerId);
    setIsOpen(false);
  };

  const handleImpersonateCustomer = (customerId: number) => {
    setImpersonatingCustomerId(customerId);
    setIsOpen(false);
  };

  const handleExitViewing = () => {
    setViewingAsCustomerId(null);
    setIsOpen(false);
  };

  const handleExitImpersonation = () => {
    setImpersonatingCustomerId(null);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getModeLabel = () => {
    if (isImpersonating && impersonatingCustomer) {
      return `Impersonating: ${impersonatingCustomer.company_name}`;
    }
    if (isViewingAsCustomer && viewingCustomer) {
      return `Viewing: ${viewingCustomer.company_name}`;
    }
    return 'Customer View';
  };

  return (
    <>
      {isImpersonating && impersonatingCustomer && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 shadow-lg z-[100] flex items-center justify-center gap-3">
          <UserCog className="w-5 h-5" />
          <span className="font-semibold">
            IMPERSONATING: {impersonatingCustomer.company_name}
          </span>
          <span className="text-amber-100 text-sm">
            (Seeing exactly what they see)
          </span>
          <button
            onClick={handleExitImpersonation}
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
          <span className="text-blue-200 text-sm">
            (Admin tools still available)
          </span>
          <button
            onClick={handleExitViewing}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors text-sm font-medium ml-4"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
            isImpersonating
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : isViewingAsCustomer
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isImpersonating ? (
            <UserCog className="w-4 h-4" />
          ) : isViewingAsCustomer ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span className="hidden md:inline">{getModeLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-scale-in">
            {(isViewingAsCustomer || isImpersonating) && (
              <div className="px-3 pb-2 mb-2 border-b border-gray-100">
                <button
                  onClick={isImpersonating ? handleExitImpersonation : handleExitViewing}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Shield className="w-4 h-4 text-gray-400" />
                  Return to Admin View
                </button>
              </div>
            )}

            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-3 py-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                <Eye className="w-3 h-3" />
                View Data For
              </div>
              <p className="text-xs text-gray-500 mb-2">
                See their data with your admin tools
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto px-1">
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.slice(0, 8).map((customer) => (
                  <button
                    key={`view-${customer.customer_id}`}
                    onClick={() => handleViewCustomer(customer.customer_id)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm rounded-lg mx-1 ${
                      viewingAsCustomerId === customer.customer_id && !isImpersonating
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {customer.customer_name}
                  </button>
                ))
              )}
            </div>

            <div className="my-2 border-t border-gray-100" />

            <div className="px-3 py-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                <UserCog className="w-3 h-3" />
                Impersonate Customer
              </div>
              <p className="text-xs text-gray-500 mb-2">
                See exactly what they see (for debugging)
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto px-1">
              {filteredCustomers.slice(0, 8).map((customer) => (
                <button
                  key={`impersonate-${customer.customer_id}`}
                  onClick={() => handleImpersonateCustomer(customer.customer_id)}
                  className={`w-full text-left px-3 py-2 hover:bg-amber-50 text-sm rounded-lg mx-1 ${
                    impersonatingCustomerId === customer.customer_id
                      ? 'bg-amber-50 text-amber-600 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {customer.customer_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

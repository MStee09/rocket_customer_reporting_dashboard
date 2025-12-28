import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, X, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function AdminCustomerSelector() {
  const { customers, viewingAsCustomerId, setViewingAsCustomerId, isViewingAsCustomer, viewingCustomer } = useAuth();
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

  const handleSelectCustomer = (customerId: number) => {
    setViewingAsCustomerId(customerId);
    setIsOpen(false);
  };

  const handleExitViewing = () => {
    setViewingAsCustomerId(null);
    setIsOpen(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {isViewingAsCustomer && viewingCustomer && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 shadow-lg z-50 flex items-center justify-center gap-3">
          <span className="font-medium">
            Viewing as: {viewingCustomer.company_name}
          </span>
          <button
            onClick={handleExitViewing}
            className="flex items-center gap-1 bg-white text-orange-600 px-3 py-1 rounded hover:bg-orange-50 transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
        >
          {isViewingAsCustomer && viewingCustomer ? (
            <>View as: {viewingCustomer.company_name}</>
          ) : (
            <>View as Customer</>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
            {isViewingAsCustomer && (
              <button
                onClick={handleExitViewing}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between text-sm border-b border-gray-100"
              >
                <span className="font-medium text-gray-700">Exit to Admin View</span>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}

            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.customer_id}
                    onClick={() => handleSelectCustomer(customer.customer_id)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                      viewingAsCustomerId === customer.customer_id
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {customer.customer_name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

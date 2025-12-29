import { ChevronDown, Building2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function CustomerSwitcher() {
  const { customers, selectedCustomerId, setSelectedCustomerId, hasMultipleCustomers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!hasMultipleCustomers || customers.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-charcoal-200 rounded-lg hover:bg-charcoal-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-charcoal-800" />
        <span className="text-sm font-medium text-charcoal-700 max-w-[150px] truncate">
          {selectedCustomer?.customer_name || 'Select Customer'}
        </span>
        <ChevronDown className={`w-4 h-4 text-charcoal-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-charcoal-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-charcoal-500 uppercase">
              Switch Customer
            </div>
            {customers.map((customer) => (
              <button
                key={customer.customer_id}
                onClick={() => {
                  setSelectedCustomerId(customer.customer_id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  customer.customer_id === selectedCustomerId
                    ? 'bg-rocket-600 text-white font-medium'
                    : 'text-charcoal-700 hover:bg-charcoal-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{customer.customer_name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

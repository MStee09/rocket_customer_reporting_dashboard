import React, { useState, useEffect } from 'react';
import { Users, Building2, Search, Loader2, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useBuilder } from './BuilderContext';
import type { CustomerScope } from '../types/BuilderSchema';

interface Customer {
  customer_id: number;
  company_name: string;
}

export function CustomerScopeSelector() {
  const { state, setCustomerScope } = useBuilder();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const scope = state.customerScope || { mode: 'admin' };

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer')
          .select('customer_id, company_name')
          .eq('is_active', true)
          .order('company_name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAdmin = () => {
    setCustomerScope({ mode: 'admin' });
    setIsOpen(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerScope({
      mode: 'customer',
      customerId: customer.customer_id,
      customerName: customer.company_name,
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1">
        Data Scope
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
          scope.mode === 'admin'
            ? 'bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {scope.mode === 'admin' ? (
            <>
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">All Customers (Admin)</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">{scope.customerName || 'Select Customer'}</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
            <button
              onClick={handleSelectAdmin}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                scope.mode === 'admin' ? 'bg-slate-50' : ''
              }`}
            >
              <Users className="w-5 h-5 text-slate-500" />
              <div className="flex-1">
                <div className="font-medium text-slate-900">All Customers</div>
                <div className="text-xs text-slate-500">Admin view - see data from all customers</div>
              </div>
              {scope.mode === 'admin' && <Check className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="border-t border-slate-100 my-1" />

            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-500">
                  No customers found
                </div>
              ) : (
                filteredCustomers.slice(0, 20).map((customer) => (
                  <button
                    key={customer.customer_id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                      scope.customerId === customer.customer_id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 text-sm text-slate-700">{customer.company_name}</span>
                    {scope.customerId === customer.customer_id && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <p className="mt-1 text-xs text-slate-500">
        {scope.mode === 'admin'
          ? 'Preview and publish will include all customer data'
          : `Preview and publish scoped to ${scope.customerName}'s data`
        }
      </p>
    </div>
  );
}

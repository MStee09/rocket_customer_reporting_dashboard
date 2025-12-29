import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Loader2, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/dateUtils';
import { Customer } from '../types/database';

interface CustomerWithStats extends Customer {
  shipment_count?: number;
  total_revenue?: number;
}

export function CustomersPage() {
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, showActiveOnly]);

  const loadCustomers = async () => {
    setIsLoading(true);

    let customerQuery = supabase
      .from('customer')
      .select('*')
      .order('company_name');

    if (!isAdmin() || isViewingAsCustomer) {
      customerQuery = customerQuery.in('customer_id', effectiveCustomerIds);
    }

    const { data: customersData } = await customerQuery;

    if (customersData) {
      const enrichedCustomers = await Promise.all(
        customersData.map(async (customer: any) => {
          const { data: shipments } = await supabase
            .from('shipment')
            .select('retail')
            .eq('customer_id', customer.customer_id);

          const shipment_count = shipments?.length || 0;
          const total_revenue = shipments?.reduce(
            (sum, s) => sum + (parseFloat(s.retail.toString()) || 0),
            0
          ) || 0;

          return {
            ...customer,
            shipment_count,
            total_revenue,
          };
        })
      );

      setCustomers(enrichedCustomers);
    }

    setIsLoading(false);
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.company_name?.toLowerCase().includes(query) ||
        c.external_customer_id?.toLowerCase().includes(query)
      );
    }

    if (showActiveOnly) {
      filtered = filtered.filter((c) => c.is_active);
    }

    setFilteredCustomers(filtered);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Customers</h1>
        <p className="text-slate-600 mt-1">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rocket-500"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 text-rocket-600 border-slate-300 rounded focus:ring-rocket-500"
              />
              <span className="text-sm text-slate-700">Active Only</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Company Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  External ID
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Shipments
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.customer_id}
                  onClick={() => navigate(`/shipments?customer=${customer.customer_id}`)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {customer.company_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {customer.external_customer_id || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {customer.is_on_hold ? (
                      <div className="flex items-center justify-center gap-1">
                        <Pause className="w-5 h-5 text-amber-600" />
                        <span className="text-xs text-amber-600">On Hold</span>
                      </div>
                    ) : customer.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right font-medium">
                    {customer.shipment_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">
                    {formatCurrency(customer.total_revenue || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

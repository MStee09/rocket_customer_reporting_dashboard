import { Building2 } from 'lucide-react';
import { CustomerData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/dateUtils';

interface TopCustomersTableProps {
  data: CustomerData[];
  isLoading: boolean;
  onCustomerClick?: (customerId: number) => void;
}

export function TopCustomersTable({ data, isLoading, onCustomerClick }: TopCustomersTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Top 10 Customers</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Top 10 Customers</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          No customer data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold text-slate-900">Top 10 Customers</h3>
      </div>
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-16">Rank</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Customer</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-24">Shipments</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-32">Total Spend</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-32">Avg/Shipment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((customer, index) => (
            <tr
              key={customer.customerId}
              onClick={() => onCustomerClick?.(customer.customerId)}
              className="hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                  {index + 1}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[300px]">
                {customer.customerName}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {customer.shipmentCount.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                {formatCurrency(customer.totalSpend.toString())}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatCurrency(customer.avgCostPerShipment.toString())}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

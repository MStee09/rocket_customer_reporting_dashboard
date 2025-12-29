import { useState, useEffect } from 'react';
import { Users, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/dateUtils';
import { Card } from '../ui/Card';

interface CustomerActivity {
  customerId: number;
  name: string;
  shipments: number;
  revenue: number;
  isActive: boolean;
  lastActivity: string | null;
}

interface CustomerActivityTableProps {
  startDate: string;
  endDate: string;
  onCustomerClick: (customerId: number) => void;
}

export function CustomerActivityTable({
  startDate,
  endDate,
  onCustomerClick,
}: CustomerActivityTableProps) {
  const [data, setData] = useState<CustomerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const { data: customers } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('is_active', true)
        .order('company_name');

      const { data: shipments } = await supabase
        .from('shipment')
        .select('customer_id, retail, pickup_date')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (customers && shipments) {
        const result = customers
          .map((c) => {
            const customerShipments = shipments.filter(
              (s) => s.customer_id === c.customer_id
            );
            const lastShipment = customerShipments.sort(
              (a, b) =>
                new Date(b.pickup_date).getTime() -
                new Date(a.pickup_date).getTime()
            )[0];

            const daysSinceLast = lastShipment
              ? Math.floor(
                  (Date.now() - new Date(lastShipment.pickup_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null;

            return {
              customerId: c.customer_id,
              name: c.company_name,
              shipments: customerShipments.length,
              revenue: customerShipments.reduce((sum, s) => sum + (s.retail || 0), 0),
              isActive: daysSinceLast !== null && daysSinceLast < 30,
              lastActivity: lastShipment?.pickup_date || null,
            };
          })
          .sort((a, b) => b.revenue - a.revenue);

        setData(result);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Customer Activity</h3>
            <p className="text-sm text-slate-500">Click a row to view as customer</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Customer Activity</h3>
            <p className="text-sm text-slate-500">Click a row to view as customer</p>
          </div>
        </div>
        <div className="text-center py-8 text-slate-500">No customer data available</div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Customer Activity</h3>
          <p className="text-sm text-slate-500">Click a row to view as customer</p>
        </div>
      </div>

      <div className="overflow-auto max-h-[500px]">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                Shipments
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">
                Status
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((customer) => (
              <tr
                key={customer.customerId}
                onClick={() => onCustomerClick(customer.customerId)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-medium text-slate-900">{customer.name}</td>
                <td className="px-6 py-4 text-slate-600">
                  {customer.shipments.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {formatCurrency(customer.revenue.toString())}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      customer.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        customer.isActive ? 'bg-green-500' : 'bg-slate-400'
                      }`}
                    />
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

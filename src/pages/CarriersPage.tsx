import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/dateUtils';
import { Carrier } from '../types/database';

interface CarrierWithStats extends Carrier {
  shipment_count?: number;
  total_cost?: number;
}

export function CarriersPage() {
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const [carriers, setCarriers] = useState<CarrierWithStats[]>([]);
  const [filteredCarriers, setFilteredCarriers] = useState<CarrierWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCarriers();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer]);

  useEffect(() => {
    filterCarriers();
  }, [carriers, searchQuery]);

  const loadCarriers = async () => {
    setIsLoading(true);

    const { data: carriersData } = await supabase
      .from('carrier')
      .select('*')
      .order('carrier_name');

    if (carriersData) {
      const enrichedCarriers = await Promise.all(
        carriersData.map(async (carrier: any) => {
          let shipmentQuery = supabase
            .from('shipment')
            .select('cost')
            .eq('rate_carrier_id', carrier.carrier_id);

          if (!isAdmin() || isViewingAsCustomer) {
            shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
          }

          const { data: shipments } = await shipmentQuery;

          const shipment_count = shipments?.length || 0;
          const total_cost = shipments?.reduce(
            (sum, s) => sum + (parseFloat(s.cost.toString()) || 0),
            0
          ) || 0;

          return {
            ...carrier,
            shipment_count,
            total_cost,
          };
        })
      );

      setCarriers(enrichedCarriers);
    }

    setIsLoading(false);
  };

  const filterCarriers = () => {
    let filtered = [...carriers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.carrier_name?.toLowerCase().includes(query) ||
          c.mc_number?.toLowerCase().includes(query) ||
          c.dot_number?.toLowerCase().includes(query) ||
          c.scac?.toLowerCase().includes(query)
      );
    }

    setFilteredCarriers(filtered);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Carriers</h1>
        <p className="text-slate-600 mt-1">
          {filteredCarriers.length} carrier{filteredCarriers.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by carrier name, MC, DOT, or SCAC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Carrier Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  MC Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  DOT Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  SCAC
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Shipments
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCarriers.map((carrier, index) => (
                <tr
                  key={carrier.carrier_id}
                  onClick={() => navigate(`/shipments?carrier=${carrier.carrier_id}`)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {carrier.carrier_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {carrier.mc_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {carrier.dot_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {carrier.scac || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right font-medium">
                    {carrier.shipment_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">
                    {formatCurrency(carrier.total_cost || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCarriers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No carriers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

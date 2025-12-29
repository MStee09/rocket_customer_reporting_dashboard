import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Loader2,
  X,
  Bookmark,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSavedViews } from '../hooks/useSavedViews';
import { SaveViewModal } from '../components/shipments/SaveViewModal';

interface Shipment {
  load_id: number;
  pickup_date: string | null;
  delivery_date: string | null;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  status: string;
  status_id: number | null;
  carrier_name: string | null;
  total_weight: number | null;
  customer_charge: number | null;
  po_reference: string | null;
  bol_number: string | null;
  reference_number: string | null;
  mode_name: string | null;
  is_completed: boolean;
  is_cancelled: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  'Quotes': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  'Pending Dispatch': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  'Pending Pickup': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Package },
  'In Transit': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Truck },
  'Delivered': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  'Canceled': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  'Cancelled': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

function getStatusConfig(status: string, isCompleted: boolean, isCancelled: boolean) {
  if (isCancelled) {
    return STATUS_CONFIG['Cancelled'] || { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
  }
  if (isCompleted) {
    return STATUS_CONFIG['Completed'] || { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
  }
  return STATUS_CONFIG[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock };
}

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const { saveView } = useSavedViews();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);

  const hasActiveFilters = searchQuery.trim() !== '' || activeStatus !== 'all';

  useEffect(() => {
    const savedView = location.state?.savedView;
    if (savedView) {
      if (savedView.searchQuery !== undefined) {
        setSearchQuery(savedView.searchQuery);
      }
      if (savedView.activeStatus !== undefined) {
        setActiveStatus(savedView.activeStatus);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveView = async (name: string, description: string, pin: boolean) => {
    await saveView({
      name,
      description: description || undefined,
      viewType: 'shipments',
      viewConfig: {
        searchQuery,
        activeStatus,
      },
      isPinned: pin,
    });
  };

  useEffect(() => {
    if (effectiveCustomerIds.length > 0) {
      loadShipments();
    }
  }, [effectiveCustomerIds]);

  const loadShipments = async () => {
    setLoading(true);

    let query = supabase
      .from('shipment_secure')
      .select(`
        load_id,
        pickup_date,
        delivery_date,
        reference_number,
        bol_number,
        po_reference,
        retail,
        shipment_status:status_id(status_id, status_name, is_completed, is_cancelled),
        carrier:rate_carrier_id(carrier_name),
        shipment_mode:mode_id(mode_name),
        addresses:shipment_address(stop_number, address_type, city, state)
      `);

    if (!isAdmin() || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { data, error } = await query.order('pickup_date', { ascending: false }).limit(500);

    if (error) {
      console.error('Error loading shipments:', error);
      setLoading(false);
      return;
    }

    if (data) {
      const enrichedData: Shipment[] = data.map((shipment: any) => {
        const pickup = shipment.addresses?.find((a: any) => a.address_type === 1) || shipment.addresses?.[0];
        const delivery = shipment.addresses?.find((a: any) => a.address_type === 2) || shipment.addresses?.[shipment.addresses?.length - 1];

        return {
          load_id: shipment.load_id,
          pickup_date: shipment.pickup_date,
          delivery_date: shipment.delivery_date,
          reference_number: shipment.reference_number,
          bol_number: shipment.bol_number,
          po_reference: shipment.po_reference,
          origin_city: pickup?.city || '',
          origin_state: pickup?.state || '',
          destination_city: delivery?.city || '',
          destination_state: delivery?.state || '',
          status: shipment.shipment_status?.status_name || 'Unknown',
          status_id: shipment.shipment_status?.status_id,
          is_completed: shipment.shipment_status?.is_completed || false,
          is_cancelled: shipment.shipment_status?.is_cancelled || false,
          carrier_name: shipment.carrier?.carrier_name || null,
          mode_name: shipment.shipment_mode?.mode_name || null,
          customer_charge: shipment.retail,
          total_weight: null,
        };
      });

      setShipments(enrichedData);
    }

    setLoading(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach((s) => {
      let statusKey = s.status;
      if (s.is_cancelled) statusKey = 'Cancelled';
      else if (s.is_completed) statusKey = 'Completed';
      counts[statusKey] = (counts[statusKey] || 0) + 1;
    });
    return counts;
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      let statusKey = s.status;
      if (s.is_cancelled) statusKey = 'Cancelled';
      else if (s.is_completed) statusKey = 'Completed';

      const matchesStatus = activeStatus === 'all' || statusKey === activeStatus;

      if (!matchesStatus) return false;

      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase().trim();
      const searchTerms = query.split(/\s+/).filter(Boolean);

      const searchableFields = [
        s.load_id.toString(),
        s.po_reference,
        s.bol_number,
        s.reference_number,
        s.origin_city,
        s.origin_state,
        s.destination_city,
        s.destination_state,
        s.carrier_name,
        s.mode_name,
        statusKey,
        s.origin_city && s.origin_state ? `${s.origin_city}, ${s.origin_state}` : null,
        s.destination_city && s.destination_state ? `${s.destination_city}, ${s.destination_state}` : null,
      ].filter(Boolean).map(f => f!.toLowerCase());

      const combinedText = searchableFields.join(' ');

      return searchTerms.every(term => combinedText.includes(term));
    });
  }, [shipments, searchQuery, activeStatus]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMode = (mode: string | null) => {
    if (!mode) return null;
    const m = mode.toLowerCase();
    if (m.includes('less than truckload')) return 'LTL';
    if (m.includes('full truckload')) return 'FTL';
    if (m.includes('partial')) return 'PTL';
    return mode;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  const showFinancials = isAdmin() && !isViewingAsCustomer;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-gray-500 mt-1">Track and manage your shipments</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shipments... (e.g., CA, Dallas, FedEx, In Transit)"
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <StatusTab
            label="All"
            count={shipments.length}
            active={activeStatus === 'all'}
            onClick={() => setActiveStatus('all')}
          />
          <StatusTab
            label="In Transit"
            count={statusCounts['In Transit'] || 0}
            active={activeStatus === 'In Transit'}
            onClick={() => setActiveStatus('In Transit')}
            color="blue"
          />
          <StatusTab
            label="Pending Pickup"
            count={statusCounts['Pending Pickup'] || 0}
            active={activeStatus === 'Pending Pickup'}
            onClick={() => setActiveStatus('Pending Pickup')}
            color="orange"
          />
          <StatusTab
            label="Delivered"
            count={statusCounts['Delivered'] || 0}
            active={activeStatus === 'Delivered'}
            onClick={() => setActiveStatus('Delivered')}
            color="green"
          />
          <StatusTab
            label="Completed"
            count={statusCounts['Completed'] || 0}
            active={activeStatus === 'Completed'}
            onClick={() => setActiveStatus('Completed')}
            color="green"
          />
          {(statusCounts['Cancelled'] || 0) > 0 && (
            <StatusTab
              label="Cancelled"
              count={statusCounts['Cancelled'] || 0}
              active={activeStatus === 'Cancelled'}
              onClick={() => setActiveStatus('Cancelled')}
              color="red"
            />
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveViewModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex-shrink-0 ml-4"
          >
            <Bookmark className="w-4 h-4" />
            Save View
          </button>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      <div className="space-y-2">
        {filteredShipments.map((shipment) => {
          const statusConfig = getStatusConfig(shipment.status, shipment.is_completed, shipment.is_cancelled);
          const StatusIcon = statusConfig.icon;
          const displayStatus = shipment.is_cancelled ? 'Cancelled' : shipment.is_completed ? 'Completed' : shipment.status;
          const mode = formatMode(shipment.mode_name);

          return (
            <div
              key={shipment.load_id}
              onClick={() => navigate(`/shipments/${shipment.load_id}`)}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} flex-shrink-0`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {displayStatus}
                  </span>
                  <span className="font-semibold text-gray-900 flex-shrink-0">#{shipment.load_id}</span>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  {shipment.origin_city && shipment.origin_state ? (
                    <span className="text-gray-700 truncate">
                      {shipment.origin_city}, {shipment.origin_state} → {shipment.destination_city}, {shipment.destination_state}
                    </span>
                  ) : (
                    <span className="text-gray-400 truncate">Route not available</span>
                  )}
                </div>
                <span className="text-sm text-gray-500 flex-shrink-0 ml-3">
                  {formatDate(shipment.pickup_date) || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2 truncate">
                  {shipment.carrier_name && <span className="truncate">{shipment.carrier_name}</span>}
                  {mode && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{mode}</span>
                    </>
                  )}
                  {shipment.po_reference && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>PO: {shipment.po_reference}</span>
                    </>
                  )}
                  {shipment.reference_number && !shipment.po_reference && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>Ref: {shipment.reference_number}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {showFinancials && shipment.customer_charge && (
                    <span className="font-medium text-gray-900">${shipment.customer_charge.toLocaleString()}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredShipments.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-blue-600 hover:underline mt-2">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      <SaveViewModal
        isOpen={showSaveViewModal}
        onClose={() => setShowSaveViewModal(false)}
        onSave={handleSaveView}
        filterSummary={{ searchQuery, activeStatus }}
      />
    </div>
  );
}

function StatusTab({
  label,
  count,
  active,
  onClick,
  color = 'gray',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'gray' | 'blue' | 'orange' | 'green' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${colorClasses[color]}`}
    >
      {label}
      <span className={`ml-2 ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}
